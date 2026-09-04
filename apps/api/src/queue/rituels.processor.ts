import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { NotificationType, RoleGlobal } from '@prisma/client';
import { Job } from 'bullmq';
import { todayDate } from '../common/date.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RITUELS_QUEUE, RituelJob } from './queue.constants';

/**
 * Traite les rituels automatisés du bureau (cf. 2.4 du cahier des charges).
 * La logique métier (requêtes Prisma, envoi de notifications) sera branchée
 * au fur et à mesure de l'implémentation des modules Reporting/Notifications.
 */
@Processor(RITUELS_QUEUE)
export class RituelsProcessor extends WorkerHost {
  private readonly logger = new Logger(RituelsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<{ bureauId: string }>): Promise<void> {
    switch (job.name as RituelJob) {
      case RituelJob.RAPPEL_DECLARATION:
        await this.rappelDeclaration(job.data.bureauId);
        break;
      case RituelJob.RELANCE_RETARD:
        await this.relanceRetard(job.data.bureauId);
        break;
      case RituelJob.VALIDATION_LENDEMAIN:
        this.logger.log(`Validation du lendemain — bureau ${job.data.bureauId}`);
        break;
      case RituelJob.RESUME_QUOTIDIEN:
        this.logger.log(`Résumé quotidien — bureau ${job.data.bureauId}`);
        break;
      case RituelJob.RAPPORT_HEBDOMADAIRE:
        this.logger.log(`Rapport hebdomadaire — bureau ${job.data.bureauId}`);
        break;
      default:
        this.logger.warn(`Job inconnu: ${job.name}`);
    }
  }

  /** Notifie chaque collaborateur du bureau ayant au moins une tâche à date cible aujourd'hui. */
  private async rappelDeclaration(bureauId: string) {
    const taches = await this.prisma.tache.findMany({
      where: { projet: { bureauId }, dateCible: todayDate(), assigneAId: { not: null } },
      select: { assigneAId: true },
    });
    const userIds = [...new Set(taches.map((t) => t.assigneAId!))];

    await Promise.all(
      userIds.map((userId) =>
        this.notifications.create(
          userId,
          NotificationType.RAPPEL_DECLARATION,
          "Vous avez des tâches à déclarer aujourd'hui",
          '/dashboard',
        ),
      ),
    );

    this.logger.log(
      `Rappel de déclaration — bureau ${bureauId} (${userIds.length} collaborateur(s) notifié(s))`,
    );
  }

  /**
   * Se déclenche `delaiRelanceMinutes` après l'heure de check-in du bureau. Notifie une
   * deuxième fois quiconque a une tâche du jour mais n'a toujours pas déclaré sa journée,
   * et alerte les managers/Authority du bureau pour qu'ils sachent qui est en retard sans
   * avoir à vérifier eux-mêmes.
   */
  private async relanceRetard(bureauId: string) {
    const bureau = await this.prisma.bureau.findUnique({
      where: { id: bureauId },
      select: { nom: true, organisationId: true },
    });
    if (!bureau) return;

    const today = todayDate();
    const taches = await this.prisma.tache.findMany({
      where: { projet: { bureauId }, dateCible: today, assigneAId: { not: null } },
      select: { assigneAId: true },
    });
    const assignedIds = [...new Set(taches.map((t) => t.assigneAId!))];
    if (assignedIds.length === 0) return;

    const declarations = await this.prisma.declarationJournaliere.findMany({
      where: { userId: { in: assignedIds }, date: today },
      select: { userId: true },
    });
    const declaredIds = new Set(declarations.map((d) => d.userId));
    const lateIds = assignedIds.filter((id) => !declaredIds.has(id));
    if (lateIds.length === 0) return;

    await Promise.all(
      lateIds.map((userId) =>
        this.notifications.create(
          userId,
          NotificationType.RELANCE_RETARD,
          "Vous n'avez pas encore déclaré votre journée",
          '/dashboard',
        ),
      ),
    );

    // Même logique que rituel.service.ts#notifyManagers : les managers du bureau (rôle
    // global, cf. l'appartenance au bureau) + les Authority de l'organisation, qui voient
    // implicitement tous les bureaux.
    const [bureauManagers, orgAdmins] = await Promise.all([
      this.prisma.userBureau.findMany({
        where: { bureauId, user: { roleGlobal: RoleGlobal.MANAGER } },
        select: { userId: true },
      }),
      this.prisma.user.findMany({
        where: { organisationId: bureau.organisationId, roleGlobal: RoleGlobal.ADMIN },
        select: { id: true },
      }),
    ]);
    const managerIds = [
      ...new Set([...bureauManagers.map((m) => m.userId), ...orgAdmins.map((a) => a.id)]),
    ];

    const message =
      lateIds.length === 1
        ? `1 collaborateur n'a pas encore déclaré sa journée dans ${bureau.nom}`
        : `${lateIds.length} collaborateurs n'ont pas encore déclaré leur journée dans ${bureau.nom}`;

    await Promise.all(
      managerIds.map((managerId) =>
        this.notifications.create(
          managerId,
          NotificationType.RELANCE_RETARD,
          message,
          `/offices/${bureauId}/check-in`,
        ),
      ),
    );

    this.logger.log(
      `Relance de retard — bureau ${bureauId} (${lateIds.length} en retard, ${managerIds.length} manager(s) alerté(s))`,
    );
  }
}
