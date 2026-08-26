import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, RoleBureau, StatutValidationDeclaration } from '@prisma/client';
import { todayDate } from '../common/date.util';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const TACHE_SELECT = {
  id: true,
  titre: true,
  description: true,
  statut: true,
  dateCible: true,
  projet: { select: { id: true, nom: true, bureau: { select: { id: true, nom: true } } } },
};

@Injectable()
export class RituelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async todayTasksForUser(userId: string, bureauId?: string) {
    return this.prisma.tache.findMany({
      where: {
        assigneAId: userId,
        dateCible: todayDate(),
        ...(bureauId ? { projet: { bureauId } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: TACHE_SELECT,
    });
  }

  private async buildJournee(
    userId: string,
    taches: Awaited<ReturnType<typeof this.todayTasksForUser>>,
  ) {
    const date = todayDate();
    const declaration = await this.prisma.declarationJournaliere.findUnique({
      where: { userId_date: { userId, date } },
      include: { taches: true },
    });

    const etatParTache = new Map(declaration?.taches.map((t) => [t.tacheId, t]) ?? []);
    const items = taches.map((t) => ({
      ...t,
      cocheParMembre: etatParTache.get(t.id)?.cocheParMembre ?? false,
      cocheParAdmin: etatParTache.get(t.id)?.cocheParAdmin ?? false,
    }));
    const bothChecked = items.filter((t) => t.cocheParMembre && t.cocheParAdmin).length;

    return {
      taches: items,
      declare: !!declaration,
      statutValidation: declaration?.statutValidation ?? null,
      pourcentage: items.length === 0 ? null : Math.round((bothChecked / items.length) * 100),
    };
  }

  async getAujourdhui(user: AuthenticatedUser) {
    const taches = await this.todayTasksForUser(user.userId);
    const journee = await this.buildJournee(user.userId, taches);
    return { date: todayDate().toISOString().slice(0, 10), ...journee };
  }

  async declarer(user: AuthenticatedUser, tacheIds: string[]) {
    const taches = await this.todayTasksForUser(user.userId);
    const validIds = new Set(taches.map((t) => t.id));
    if (tacheIds.some((id) => !validIds.has(id))) {
      throw new BadRequestException('Une ou plusieurs tâches ne font pas partie de votre journée');
    }

    const date = todayDate();
    const declaration = await this.prisma.declarationJournaliere.upsert({
      where: { userId_date: { userId: user.userId, date } },
      create: { userId: user.userId, date, heureDeclaration: new Date() },
      update: { heureDeclaration: new Date() },
    });

    await this.prisma.$transaction(
      taches.map((t) =>
        this.prisma.declarationTache.upsert({
          where: { declarationId_tacheId: { declarationId: declaration.id, tacheId: t.id } },
          create: {
            declarationId: declaration.id,
            tacheId: t.id,
            cocheParMembre: tacheIds.includes(t.id),
          },
          update: { cocheParMembre: tacheIds.includes(t.id) },
        }),
      ),
    );

    await this.notifyManagers(user, taches);

    return this.getAujourdhui(user);
  }

  private async notifyManagers(
    user: AuthenticatedUser,
    taches: Awaited<ReturnType<typeof this.todayTasksForUser>>,
  ) {
    const bureauIds = [
      ...new Set(taches.map((t) => t.projet.bureau?.id).filter((id): id is string => !!id)),
    ];
    if (bureauIds.length === 0) return;

    const [bureauManagers, orgAdmins, membre] = await Promise.all([
      this.prisma.userBureau.findMany({
        where: { bureauId: { in: bureauIds }, roleDansBureau: RoleBureau.MANAGER },
        select: { userId: true },
      }),
      // Un admin d'organisation gère implicitement tous les bureaux (bypass roleGlobal),
      // sans forcément avoir de ligne UserBureau — il doit quand même être notifié.
      this.prisma.user.findMany({
        where: { organisationId: user.organisationId, roleGlobal: 'ADMIN' },
        select: { id: true },
      }),
      this.prisma.user.findUnique({ where: { id: user.userId }, select: { nom: true } }),
    ]);

    const managerIds = [
      ...new Set([...bureauManagers.map((m) => m.userId), ...orgAdmins.map((a) => a.id)]),
    ].filter((id) => id !== user.userId);
    await Promise.all(
      managerIds.map((managerId) =>
        this.notifications.create(
          managerId,
          NotificationType.VALIDATION_A_FAIRE,
          `${membre?.nom ?? 'Un collaborateur'} a déclaré sa journée (validation à faire)`,
          '/offices',
        ),
      ),
    );
  }

  async getBureauRituel(bureauId: string) {
    const membres = await this.prisma.userBureau.findMany({
      where: { bureauId },
      select: { user: { select: { id: true, nom: true } } },
    });

    const results = await Promise.all(
      membres.map(async (m) => {
        const taches = await this.todayTasksForUser(m.user.id, bureauId);
        const journee = await this.buildJournee(m.user.id, taches);
        return { user: m.user, ...journee };
      }),
    );

    return results.filter((r) => r.taches.length > 0);
  }

  async validerMembre(bureauId: string, targetUserId: string, tacheIds: string[]) {
    const membership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId: targetUserId, bureauId } },
    });
    if (!membership)
      throw new NotFoundException('Ce collaborateur ne fait pas partie de ce bureau');

    const taches = await this.todayTasksForUser(targetUserId, bureauId);
    if (taches.length === 0) {
      throw new BadRequestException(
        "Ce collaborateur n'a aucune tâche à valider aujourd'hui pour ce bureau",
      );
    }

    const date = todayDate();
    const declaration = await this.prisma.declarationJournaliere.findUnique({
      where: { userId_date: { userId: targetUserId, date } },
    });
    if (!declaration) {
      throw new BadRequestException("Ce collaborateur n'a pas encore déclaré sa journée");
    }

    await this.prisma.$transaction(
      taches.map((t) =>
        this.prisma.declarationTache.upsert({
          where: { declarationId_tacheId: { declarationId: declaration.id, tacheId: t.id } },
          create: {
            declarationId: declaration.id,
            tacheId: t.id,
            cocheParAdmin: tacheIds.includes(t.id),
          },
          update: { cocheParAdmin: tacheIds.includes(t.id) },
        }),
      ),
    );

    await this.prisma.declarationJournaliere.update({
      where: { id: declaration.id },
      data: { statutValidation: StatutValidationDeclaration.VALIDEE },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: targetUserId },
      select: { id: true, nom: true },
    });
    const journee = await this.buildJournee(targetUserId, taches);
    return { user, ...journee };
  }

  /** Synthèse quotidienne du bureau : remplace une partie du DSM. */
  async getDailyBrief(bureauId: string) {
    const [taches, blocagesActifs, membresJournee] = await Promise.all([
      this.prisma.tache.findMany({
        where: { projet: { bureauId } },
        select: { id: true, titre: true, statut: true, sante: true },
      }),
      this.prisma.tacheBlocage.findMany({
        where: { dateFin: null, tache: { projet: { bureauId } } },
        include: {
          tache: { select: { id: true, titre: true } },
          responsable: { select: { id: true, nom: true } },
        },
        orderBy: { dateDebut: 'asc' },
      }),
      this.getBureauRituel(bureauId),
    ]);

    const termine = taches.filter((t) => t.statut === 'VALIDE').length;
    const bloque = taches.filter((t) => t.sante === 'BLOQUEE').length;
    const nonCommence = taches.filter((t) => t.statut === 'A_FAIRE').length;
    const enCours = taches.length - termine - nonCommence;
    const aRisque = taches
      .filter((t) => t.sante === 'A_RISQUE')
      .map((t) => ({ id: t.id, titre: t.titre }));

    const totalItems = membresJournee.reduce((sum, m) => sum + m.taches.length, 0);
    const totalDone = membresJournee.reduce(
      (sum, m) => sum + m.taches.filter((t) => t.cocheParMembre && t.cocheParAdmin).length,
      0,
    );

    return {
      date: todayDate().toISOString().slice(0, 10),
      termine,
      enCours,
      bloque,
      aRisque,
      blocagesActifs: blocagesActifs.map((b) => ({
        id: b.id,
        type: b.type,
        cause: b.cause,
        tache: b.tache,
        responsable: b.responsable,
        depuis: b.dateDebut,
      })),
      pourcentageRituel: totalItems === 0 ? null : Math.round((totalDone / totalItems) * 100),
    };
  }
}
