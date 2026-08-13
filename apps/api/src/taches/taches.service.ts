import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, RoleBureau, RoleGlobal, SanteTache, StatutTache } from '@prisma/client';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlocageDto } from './dto/create-blocage.dto';

const TACHE_INCLUDE = {
  assigneA: { select: { id: true, nom: true } },
  assignePar: { select: { id: true, nom: true } },
  valideur: { select: { id: true, nom: true } },
  conversation: { select: { id: true, nom: true } },
};

@Injectable()
export class TachesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Charge une tâche accessible à l'utilisateur : soit via son bureau, soit via son Organizer personnel. */
  private async loadWithBureau(tacheId: string, user: AuthenticatedUser) {
    const tache = await this.prisma.tache.findFirst({
      where: {
        id: tacheId,
        projet: {
          OR: [
            { bureau: { organisationId: user.organisationId } },
            { proprietaireId: user.userId },
          ],
        },
      },
      include: { projet: { select: { bureauId: true, proprietaireId: true } } },
    });
    if (!tache) throw new NotFoundException('Tâche introuvable');
    return tache;
  }

  private async assertManager(bureauId: string | null, user: AuthenticatedUser) {
    if (bureauId === null) return; // Tâche personnelle : déjà filtrée par appartenance dans loadWithBureau
    if (user.roleGlobal === RoleGlobal.ADMIN) return;
    const membership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId: user.userId, bureauId } },
    });
    if (!membership || membership.roleDansBureau !== RoleBureau.MANAGER) {
      throw new ForbiddenException('Seul un manager du bureau peut effectuer cette action');
    }
  }

  private async assertBureauMember(bureauId: string | null, user: AuthenticatedUser) {
    if (bureauId === null) return; // Tâche personnelle : déjà filtrée par appartenance dans loadWithBureau
    if (user.roleGlobal === RoleGlobal.ADMIN) return;
    const membership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId: user.userId, bureauId } },
    });
    if (!membership) throw new ForbiddenException('Vous ne faites pas partie de ce bureau');
  }

  private lienTache(bureauId: string | null) {
    return bureauId ? `/offices/${bureauId}/tasks` : '/my-tasks';
  }

  async assigner(tacheId: string, user: AuthenticatedUser, assigneeUserId: string) {
    const tache = await this.loadWithBureau(tacheId, user);

    if (tache.projet.bureauId === null) {
      throw new BadRequestException('Une tâche personnelle est déjà assignée à vous-même');
    }

    await this.assertManager(tache.projet.bureauId, user);

    const assigneeMembership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId: assigneeUserId, bureauId: tache.projet.bureauId } },
    });
    if (!assigneeMembership) {
      throw new BadRequestException('Ce collaborateur ne fait pas partie de ce bureau');
    }

    const updated = await this.prisma.tache.update({
      where: { id: tacheId },
      data: { assigneAId: assigneeUserId, assigneParId: user.userId },
      include: TACHE_INCLUDE,
    });

    await this.notifications.create(
      assigneeUserId,
      NotificationType.TACHE_ASSIGNEE,
      `On vous a assigné la tâche « ${updated.titre} »`,
      this.lienTache(tache.projet.bureauId),
    );

    return updated;
  }

  async accepter(tacheId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user);
    await this.assertBureauMember(tache.projet.bureauId, user);

    if (tache.assigneAId !== user.userId) {
      throw new ForbiddenException('Seule la personne assignée peut accepter cette tâche');
    }
    if (tache.statut !== StatutTache.A_FAIRE) {
      throw new BadRequestException('Cette tâche ne peut pas être acceptée dans son état actuel');
    }

    const updated = await this.prisma.tache.update({
      where: { id: tacheId },
      data: { statut: StatutTache.ACCEPTEE },
      include: TACHE_INCLUDE,
    });

    if (tache.assigneParId && tache.assigneParId !== tache.assigneAId) {
      await this.notifications.create(
        tache.assigneParId,
        NotificationType.TACHE_ACCEPTEE,
        `${updated.assigneA?.nom ?? 'Un collaborateur'} a accepté la tâche « ${updated.titre} »`,
        this.lienTache(tache.projet.bureauId),
      );
    }

    return updated;
  }

  async modifier(
    tacheId: string,
    user: AuthenticatedUser,
    dto: { titre?: string; description?: string; dateCible?: string | null },
  ) {
    const tache = await this.loadWithBureau(tacheId, user);
    await this.assertManager(tache.projet.bureauId, user);

    return this.prisma.tache.update({
      where: { id: tacheId },
      data: {
        titre: dto.titre,
        description: dto.description,
        dateCible:
          dto.dateCible === undefined ? undefined : dto.dateCible ? new Date(dto.dateCible) : null,
      },
      include: TACHE_INCLUDE,
    });
  }

  async demarrer(tacheId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user);
    await this.assertBureauMember(tache.projet.bureauId, user);

    if (tache.assigneAId !== user.userId) {
      throw new ForbiddenException('Seule la personne assignée peut démarrer cette tâche');
    }
    const demarrableDepuis: StatutTache[] = [StatutTache.ACCEPTEE, StatutTache.A_REVOIR];
    if (!demarrableDepuis.includes(tache.statut)) {
      throw new BadRequestException('Cette tâche ne peut pas être démarrée dans son état actuel');
    }

    return this.prisma.tache.update({
      where: { id: tacheId },
      data: { statut: StatutTache.EN_COURS, dateDebut: tache.dateDebut ?? new Date() },
      include: TACHE_INCLUDE,
    });
  }

  async declarer(tacheId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user);
    await this.assertBureauMember(tache.projet.bureauId, user);

    if (tache.assigneAId !== user.userId) {
      throw new ForbiddenException('Seule la personne assignée peut déclarer cette tâche faite');
    }
    if (tache.statut !== StatutTache.EN_COURS) {
      throw new BadRequestException("Il faut d'abord démarrer la tâche avant de la déclarer faite");
    }

    const updated = await this.prisma.tache.update({
      where: { id: tacheId },
      data: { statut: StatutTache.DECLARE, dateDeclaration: new Date() },
      include: TACHE_INCLUDE,
    });

    if (tache.assigneParId && tache.assigneParId !== tache.assigneAId) {
      await this.notifications.create(
        tache.assigneParId,
        NotificationType.VALIDATION_A_FAIRE,
        `${updated.assigneA?.nom ?? 'Un collaborateur'} a déclaré la tâche « ${updated.titre} » comme terminée`,
        this.lienTache(tache.projet.bureauId),
      );
    }

    return updated;
  }

  async valider(tacheId: string, user: AuthenticatedUser, decision: 'ok' | 'litige') {
    const tache = await this.loadWithBureau(tacheId, user);

    const isAssigner = tache.assigneParId === user.userId;
    if (!isAssigner) {
      await this.assertManager(tache.projet.bureauId, user);
    }

    if (tache.statut !== StatutTache.DECLARE) {
      throw new BadRequestException('Cette tâche n’a pas encore été déclarée comme faite');
    }

    const updated =
      decision === 'ok'
        ? await this.prisma.tache.update({
            where: { id: tacheId },
            data: {
              statut: StatutTache.VALIDE,
              dateValidation: new Date(),
              valideParId: user.userId,
            },
            include: TACHE_INCLUDE,
          })
        : await this.prisma.tache.update({
            where: { id: tacheId },
            data: { statut: StatutTache.A_REVOIR },
            include: TACHE_INCLUDE,
          });

    if (tache.assigneAId && tache.assigneAId !== user.userId) {
      await this.notifications.create(
        tache.assigneAId,
        decision === 'ok' ? NotificationType.TACHE_VALIDEE : NotificationType.TACHE_A_REVOIR,
        decision === 'ok'
          ? `Votre tâche « ${updated.titre} » a été validée`
          : `Votre tâche « ${updated.titre} » doit être revue`,
        this.lienTache(tache.projet.bureauId),
      );
    }

    return updated;
  }

  /** Agrège toutes les tâches pertinentes pour l'utilisateur : assignées dans un bureau + Organizer personnel. */
  async mesTaches(user: AuthenticatedUser) {
    return this.prisma.tache.findMany({
      where: {
        OR: [
          { assigneAId: user.userId, projet: { bureau: { organisationId: user.organisationId } } },
          { projet: { proprietaireId: user.userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        ...TACHE_INCLUDE,
        projet: {
          select: {
            id: true,
            nom: true,
            proprietaireId: true,
            bureau: { select: { id: true, nom: true } },
          },
        },
      },
    });
  }

  /** Toutes les tâches du bureau (Organizer + vrais Projets), avec leur Subject d'origine. */
  async listForBureau(bureauId: string, user: AuthenticatedUser) {
    await this.assertBureauMember(bureauId, user);
    return this.prisma.tache.findMany({
      where: { projet: { bureauId } },
      orderBy: { createdAt: 'desc' },
      include: { ...TACHE_INCLUDE, projet: { select: { id: true, nom: true, estOrganizer: true } } },
    });
  }

  async supprimer(tacheId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user);
    if (tache.projet.bureauId && user.roleGlobal !== RoleGlobal.ADMIN) {
      throw new ForbiddenException('Seul un admin peut supprimer une tâche de bureau');
    }
    await this.prisma.tache.delete({ where: { id: tacheId } });
  }

  // ---------- Blocages ----------

  async listBlocages(tacheId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user);
    await this.assertBureauMember(tache.projet.bureauId, user);
    return this.prisma.tacheBlocage.findMany({
      where: { tacheId },
      orderBy: { dateDebut: 'desc' },
      include: {
        responsable: { select: { id: true, nom: true } },
        bloquantTache: { select: { id: true, titre: true } },
      },
    });
  }

  async creerBlocage(tacheId: string, user: AuthenticatedUser, dto: CreateBlocageDto) {
    const tache = await this.loadWithBureau(tacheId, user);
    await this.assertManager(tache.projet.bureauId, user);

    const [blocage] = await this.prisma.$transaction([
      this.prisma.tacheBlocage.create({
        data: {
          tacheId,
          type: dto.type,
          cause: dto.cause,
          bloquantTacheId: dto.bloquantTacheId,
          responsableId: dto.responsableId,
        },
        include: {
          responsable: { select: { id: true, nom: true } },
          bloquantTache: { select: { id: true, titre: true } },
        },
      }),
      this.prisma.tache.update({ where: { id: tacheId }, data: { sante: SanteTache.BLOQUEE } }),
    ]);

    return blocage;
  }

  async resoudreBlocage(tacheId: string, blocageId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user);
    await this.assertManager(tache.projet.bureauId, user);

    const blocage = await this.prisma.tacheBlocage.update({
      where: { id: blocageId },
      data: { dateFin: new Date() },
    });

    const restants = await this.prisma.tacheBlocage.count({ where: { tacheId, dateFin: null } });
    if (restants === 0) {
      await this.prisma.tache.update({
        where: { id: tacheId },
        data: { sante: SanteTache.NORMAL },
      });
    }

    return blocage;
  }

  // ---------- Chronomètre ----------

  async demarrerChrono(tacheId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user);
    await this.assertBureauMember(tache.projet.bureauId, user);
    if (tache.assigneAId !== user.userId) {
      throw new ForbiddenException('Seule la personne assignée peut lancer le chronomètre');
    }

    const active = await this.prisma.tacheSession.findFirst({
      where: { tacheId, userId: user.userId, fin: null },
    });
    if (active) return active;

    return this.prisma.tacheSession.create({ data: { tacheId, userId: user.userId } });
  }

  async arreterChrono(tacheId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user);
    await this.assertBureauMember(tache.projet.bureauId, user);

    const active = await this.prisma.tacheSession.findFirst({
      where: { tacheId, userId: user.userId, fin: null },
    });
    if (!active) throw new BadRequestException('Aucune session de chronomètre en cours');

    return this.prisma.tacheSession.update({ where: { id: active.id }, data: { fin: new Date() } });
  }

  async chronoStatut(tacheId: string, user: AuthenticatedUser) {
    await this.loadWithBureau(tacheId, user);
    const [dureeReelleMinutes, active] = await Promise.all([
      this.tempsReelMinutes(tacheId),
      this.prisma.tacheSession.findFirst({ where: { tacheId, fin: null } }),
    ]);
    return { dureeReelleMinutes, enCours: !!active };
  }

  async tempsReelMinutes(tacheId: string): Promise<number> {
    const sessions = await this.prisma.tacheSession.findMany({
      where: { tacheId, fin: { not: null } },
    });
    const ms = sessions.reduce((sum, s) => sum + (s.fin!.getTime() - s.debut.getTime()), 0);
    return Math.round(ms / 60000);
  }
}
