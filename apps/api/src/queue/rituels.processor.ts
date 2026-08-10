import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
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
        this.logger.log(`Relance de retard — bureau ${job.data.bureauId}`);
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
}
