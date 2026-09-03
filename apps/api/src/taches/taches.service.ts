import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NiveauAlerte,
  NotificationType,
  PrioriteTache,
  RoleBureau,
  RoleGlobal,
  SanteTache,
  StatutTache,
} from '@prisma/client';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlocageDto } from './dto/create-blocage.dto';

const TACHE_INCLUDE = {
  assigneA: { select: { id: true, nom: true } },
  assignePar: { select: { id: true, nom: true } },
  valideur: { select: { id: true, nom: true } },
  conversation: { select: { id: true, nom: true } },
  // Session ouverte (fin: null) : présente = chrono actif, absente = en pause. Sert au
  // bouton Break/Resume sans appel séparé pour chaque tâche affichée dans une liste.
  sessions: { where: { fin: null }, select: { debut: true } },
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

  private async isManager(bureauId: string | null, user: AuthenticatedUser): Promise<boolean> {
    if (bureauId === null) return true; // Tâche personnelle : le propriétaire gère seul
    if (user.roleGlobal === RoleGlobal.ADMIN) return true;
    const membership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId: user.userId, bureauId } },
    });
    return membership?.roleDansBureau === RoleBureau.MANAGER;
  }

  private lienTache(bureauId: string | null) {
    return bureauId ? `/offices/${bureauId}/tasks` : '/my-space?tab=tasks';
  }

  async assigner(tacheId: string, user: AuthenticatedUser, assigneeUserId: string) {
    const tache = await this.loadWithBureau(tacheId, user);

    if (tache.projet.bureauId === null) {
      throw new BadRequestException('Une tâche personnelle est déjà assignée à vous-même');
    }
    const bureauId = tache.projet.bureauId;

    const bureau = await this.prisma.bureau.findUniqueOrThrow({
      where: { id: bureauId },
      select: { organisation: { select: { proprietaireId: true } } },
    });
    const proprietaireId = bureau.organisation.proprietaireId;
    const isSelfAssign = assigneeUserId === user.userId;

    // S'assigner soi-même une tâche non prise ne demande pas d'être manager — juste
    // de faire partie du bureau (le propriétaire de l'organisation en est toujours autorisé).
    if (isSelfAssign) {
      if (user.userId !== proprietaireId) {
        await this.assertBureauMember(bureauId, user);
      }
    } else {
      await this.assertManager(bureauId, user);
    }

    if (assigneeUserId !== proprietaireId) {
      const assigneeMembership = await this.prisma.userBureau.findUnique({
        where: { userId_bureauId: { userId: assigneeUserId, bureauId } },
      });
      if (!assigneeMembership) {
        throw new BadRequestException('Ce collaborateur ne fait pas partie de ce bureau');
      }
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
    dto: {
      titre?: string;
      description?: string;
      dateCible?: string | null;
      conversationId?: string | null;
      priorite?: PrioriteTache;
      dureeEstimeeMinutes?: number | null;
      dateEcheance?: string | null;
    },
  ) {
    const tache = await this.loadWithBureau(tacheId, user);
    const manager = await this.isManager(tache.projet.bureauId, user);

    if (!manager) {
      // La personne assignée peut ajuster l'échéance/priorité de sa propre tâche
      // depuis le calendrier, sans avoir besoin des droits manager.
      const assigneeAllowedKeys = new Set(['priorite', 'dateEcheance']);
      const hasOtherField = Object.keys(dto).some(
        (key) => dto[key as keyof typeof dto] !== undefined && !assigneeAllowedKeys.has(key),
      );
      if (tache.assigneAId !== user.userId || hasOtherField) {
        throw new ForbiddenException('Seul un manager du bureau peut effectuer cette action');
      }
    }

    if (dto.conversationId) {
      const target = await this.prisma.conversation.findUnique({
        where: { id: dto.conversationId },
        select: { projetId: true },
      });
      if (!target || target.projetId !== tache.projetId) {
        throw new BadRequestException('Ce groupe ne fait pas partie du même bureau');
      }
    }

    return this.prisma.tache.update({
      where: { id: tacheId },
      data: {
        titre: dto.titre,
        description: dto.description,
        dateCible:
          dto.dateCible === undefined ? undefined : dto.dateCible ? new Date(dto.dateCible) : null,
        conversationId: dto.conversationId === undefined ? undefined : dto.conversationId,
        priorite: dto.priorite,
        dureeEstimeeMinutes: dto.dureeEstimeeMinutes,
        dateEcheance:
          dto.dateEcheance === undefined
            ? undefined
            : dto.dateEcheance
              ? new Date(dto.dateEcheance)
              : null,
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

    const updated = await this.prisma.tache.update({
      where: { id: tacheId },
      data: { statut: StatutTache.EN_COURS, dateDebut: tache.dateDebut ?? new Date() },
      include: TACHE_INCLUDE,
    });

    // Le chronomètre suit automatiquement le cycle de vie de la tâche : pas de bouton
    // manuel séparé à penser à actionner, le temps réel se mesure tout seul.
    const activeSession = await this.prisma.tacheSession.findFirst({
      where: { tacheId, userId: user.userId, fin: null },
    });
    if (!activeSession) {
      await this.prisma.tacheSession.create({ data: { tacheId, userId: user.userId } });
    }

    return updated;
  }

  /** Pause le chrono d'une tâche en cours — le temps déjà accumulé reste acquis. */
  async pauser(tacheId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user);
    if (tache.assigneAId !== user.userId) {
      throw new ForbiddenException('Seule la personne assignée peut mettre cette tâche en pause');
    }
    if (tache.statut !== StatutTache.EN_COURS) {
      throw new BadRequestException('Cette tâche doit être en cours pour être mise en pause');
    }

    const { count } = await this.prisma.tacheSession.updateMany({
      where: { tacheId, userId: user.userId, fin: null },
      data: { fin: new Date() },
    });
    if (count === 0) {
      throw new BadRequestException('Cette tâche est déjà en pause');
    }

    return this.prisma.tache.findUniqueOrThrow({ where: { id: tacheId }, include: TACHE_INCLUDE });
  }

  /** Reprend le chrono d'une tâche mise en pause. */
  async reprendre(tacheId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user);
    if (tache.assigneAId !== user.userId) {
      throw new ForbiddenException('Seule la personne assignée peut reprendre cette tâche');
    }
    if (tache.statut !== StatutTache.EN_COURS) {
      throw new BadRequestException('Cette tâche doit être en cours pour être reprise');
    }

    const activeSession2 = await this.prisma.tacheSession.findFirst({
      where: { tacheId, userId: user.userId, fin: null },
    });
    if (activeSession2) {
      throw new BadRequestException("Cette tâche n'est pas en pause");
    }
    await this.prisma.tacheSession.create({ data: { tacheId, userId: user.userId } });

    return this.prisma.tache.findUniqueOrThrow({ where: { id: tacheId }, include: TACHE_INCLUDE });
  }

  async declarer(tacheId: string, user: AuthenticatedUser, commentaire?: string) {
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
      data: {
        statut: StatutTache.DECLARE,
        dateDeclaration: new Date(),
        commentaireDeclaration: commentaire?.trim() || null,
      },
      include: TACHE_INCLUDE,
    });

    await this.prisma.tacheSession.updateMany({
      where: { tacheId, userId: user.userId, fin: null },
      data: { fin: new Date() },
    });

    if (tache.assigneParId && tache.assigneParId !== tache.assigneAId) {
      await this.notifications.create(
        tache.assigneParId,
        NotificationType.VALIDATION_A_FAIRE,
        `${updated.assigneA?.nom ?? 'Un collaborateur'} a déclaré la tâche « ${updated.titre} » comme terminée${
          updated.commentaireDeclaration ? ` : « ${updated.commentaireDeclaration} »` : ''
        }`,
        this.lienTache(tache.projet.bureauId),
      );
    }

    return updated;
  }

  /**
   * Annule un "Done" cliqué par erreur — remet la tâche en cours, tant qu'elle
   * n'a pas encore été validée (au-delà, seul le manager peut agir via "Send back").
   */
  async annulerDeclaration(tacheId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user);
    await this.assertBureauMember(tache.projet.bureauId, user);

    if (tache.assigneAId !== user.userId) {
      throw new ForbiddenException('Seule la personne assignée peut annuler cette déclaration');
    }
    if (tache.statut !== StatutTache.DECLARE) {
      throw new BadRequestException("Cette tâche n'est pas en attente de validation");
    }

    const updated = await this.prisma.tache.update({
      where: { id: tacheId },
      data: { statut: StatutTache.EN_COURS, dateDeclaration: null, commentaireDeclaration: null },
      include: TACHE_INCLUDE,
    });

    const activeSession = await this.prisma.tacheSession.findFirst({
      where: { tacheId, userId: user.userId, fin: null },
    });
    if (!activeSession) {
      await this.prisma.tacheSession.create({ data: { tacheId, userId: user.userId } });
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
            data: { statut: StatutTache.A_REVOIR, commentaireDeclaration: null },
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

  /**
   * Rouvre une tâche personnelle validée par erreur — remet à zéro le cycle
   * (statut + dates), pour que la case à cocher de My Space soit réversible.
   * Réservé aux tâches personnelles : le workflow d'équipe (bureau) n'a pas
   * d'action "annuler la validation" et ce n'est pas le rôle de cet endpoint.
   */
  async reouvrir(tacheId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user);
    if (tache.projet.bureauId !== null) {
      throw new ForbiddenException('Seule une tâche personnelle peut être rouverte');
    }
    if (tache.assigneAId !== user.userId) {
      throw new ForbiddenException('Seul le propriétaire peut rouvrir cette tâche');
    }

    return this.prisma.tache.update({
      where: { id: tacheId },
      data: {
        statut: StatutTache.A_FAIRE,
        dateDebut: null,
        dateDeclaration: null,
        dateValidation: null,
        valideParId: null,
      },
      include: TACHE_INCLUDE,
    });
  }

  /** Agrège toutes les tâches pertinentes pour l'utilisateur : assignées dans un bureau + Organizer personnel. */
  /** Vue calendrier admin : toutes les tâches à échéance de l'organisation, tous membres confondus. */
  async organisationTaches(user: AuthenticatedUser) {
    if (user.roleGlobal !== RoleGlobal.ADMIN) {
      throw new ForbiddenException('Réservé aux admins');
    }
    return this.prisma.tache.findMany({
      where: {
        dateEcheance: { not: null },
        OR: [
          { projet: { bureau: { organisationId: user.organisationId } } },
          { projet: { proprietaire: { organisationId: user.organisationId } } },
        ],
      },
      orderBy: { dateEcheance: 'asc' },
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

  /**
   * Tâches "à risque" pour l'utilisateur : les siennes + celles des bureaux qu'il manage
   * (tout le bureau pour un admin). Une tâche est signalée si santé À_RISQUE/BLOQUÉE, un
   * blocage est actif, ou l'échéance est dépassée / proche (≤ 3 jours).
   */
  async alertes(user: AuthenticatedUser) {
    const managedBureauIds = new Set(
      user.roleGlobal === RoleGlobal.ADMIN
        ? (
            await this.prisma.bureau.findMany({
              where: { organisationId: user.organisationId },
              select: { id: true },
            })
          ).map((b) => b.id)
        : (
            await this.prisma.userBureau.findMany({
              where: { userId: user.userId, roleDansBureau: RoleBureau.MANAGER },
              select: { bureauId: true },
            })
          ).map((m) => m.bureauId),
    );

    const taches = await this.prisma.tache.findMany({
      where: {
        statut: { not: StatutTache.VALIDE },
        OR: [
          { assigneAId: user.userId, projet: { bureau: { organisationId: user.organisationId } } },
          { projet: { proprietaireId: user.userId } },
          ...(managedBureauIds.size
            ? [{ projet: { bureauId: { in: [...managedBureauIds] } } }]
            : []),
        ],
      },
      include: {
        assigneA: { select: { id: true, nom: true, email: true } },
        projet: {
          select: {
            id: true,
            nom: true,
            bureauId: true,
            bureau: { select: { id: true, nom: true } },
          },
        },
        blocages: { where: { dateFin: null }, select: { id: true, type: true, cause: true } },
      },
      orderBy: { dateEcheance: 'asc' },
    });

    const now = new Date();
    const seuilProche = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Dépassement de temps imparti : une seule requête groupée pour toutes les tâches
    // en cours concernées, plutôt qu'une requête par tâche dans la boucle ci-dessous.
    const enCoursAvecEstimation = taches.filter(
      (t) => t.statut === StatutTache.EN_COURS && t.dureeEstimeeMinutes,
    );
    const sessions = enCoursAvecEstimation.length
      ? await this.prisma.tacheSession.findMany({
          where: { tacheId: { in: enCoursAvecEstimation.map((t) => t.id) } },
          select: { tacheId: true, debut: true, fin: true },
        })
      : [];
    const sessionsParTache = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const liste = sessionsParTache.get(s.tacheId) ?? [];
      liste.push(s);
      sessionsParTache.set(s.tacheId, liste);
    }

    const enrichies = taches.map((t) => {
      const raisons: (
        'A_RISQUE' | 'BLOQUEE' | 'ECHEANCE_PROCHE' | 'ECHEANCE_DEPASSEE' | 'TEMPS_DEPASSE'
      )[] = [];
      if (t.sante === SanteTache.BLOQUEE || t.blocages.length > 0) {
        raisons.push('BLOQUEE');
      } else if (t.sante === SanteTache.A_RISQUE) {
        raisons.push('A_RISQUE');
      }
      if (t.dateEcheance) {
        if (t.dateEcheance < now) raisons.push('ECHEANCE_DEPASSEE');
        else if (t.dateEcheance <= seuilProche) raisons.push('ECHEANCE_PROCHE');
      }

      let tempsReelMinutesActuel: number | null = null;
      let sessionActive = false;
      if (t.dureeEstimeeMinutes) {
        const mesSessions = sessionsParTache.get(t.id) ?? [];
        sessionActive = mesSessions.some((s) => s.fin === null);
        const ms = mesSessions.reduce(
          (sum, s) => sum + ((s.fin ?? now).getTime() - s.debut.getTime()),
          0,
        );
        tempsReelMinutesActuel = Math.round(ms / 60000);
        if (tempsReelMinutesActuel > t.dureeEstimeeMinutes) raisons.push('TEMPS_DEPASSE');
      }

      const bureauId = t.projet.bureauId;
      return {
        id: t.id,
        titre: t.titre,
        statut: t.statut,
        sante: t.sante,
        priorite: t.priorite,
        dateEcheance: t.dateEcheance,
        dureeEstimeeMinutes: t.dureeEstimeeMinutes,
        tempsReelMinutesActuel,
        sessionActive,
        assigneA: t.assigneA,
        blocages: t.blocages,
        projet: { id: t.projet.id, nom: t.projet.nom, bureau: t.projet.bureau },
        raisons,
        lien: this.lienTache(bureauId),
        peutReassigner:
          bureauId !== null &&
          (user.roleGlobal === RoleGlobal.ADMIN || managedBureauIds.has(bureauId)),
      };
    });

    const attention = enrichies.filter((t) => t.raisons.length > 0);

    // Un bureau passé en Orange/Rouge signale une urgence — un admin doit le voir sans
    // avoir à visiter chaque office un par un.
    const bureauxEnAlerte =
      user.roleGlobal === RoleGlobal.ADMIN
        ? await this.prisma.bureau.findMany({
            where: {
              organisationId: user.organisationId,
              niveauAlerte: { not: NiveauAlerte.AUCUNE },
              alerteJusqua: { gt: now },
            },
            select: { id: true, nom: true, niveauAlerte: true, alerteJusqua: true },
          })
        : [];

    return {
      attention,
      okCount: enrichies.length - attention.length,
      totalCount: enrichies.length,
      bureauxEnAlerte,
    };
  }

  /** Toutes les tâches du bureau (Organizer + vrais Projets), avec leur Subject d'origine. */
  async listForBureau(bureauId: string, user: AuthenticatedUser) {
    await this.assertBureauMember(bureauId, user);
    return this.prisma.tache.findMany({
      where: { projet: { bureauId } },
      orderBy: { createdAt: 'desc' },
      include: {
        ...TACHE_INCLUDE,
        projet: { select: { id: true, nom: true, estOrganizer: true } },
      },
    });
  }

  async supprimer(tacheId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user);
    const manager = await this.isManager(tache.projet.bureauId, user);
    if (!manager) {
      throw new ForbiddenException('Seul un manager du bureau peut supprimer cette tâche');
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
        signalePar: { select: { id: true, nom: true } },
        bloquantTache: { select: { id: true, titre: true } },
      },
    });
  }

  async creerBlocage(tacheId: string, user: AuthenticatedUser, dto: CreateBlocageDto) {
    const tache = await this.loadWithBureau(tacheId, user);
    // La personne assignée doit pouvoir signaler elle-même un blocage sur sa propre
    // tâche — pas seulement un manager, sinon elle n'a aucun moyen de le faire.
    if (tache.assigneAId !== user.userId) {
      await this.assertManager(tache.projet.bureauId, user);
    } else {
      await this.assertBureauMember(tache.projet.bureauId, user);
    }

    const [blocage] = await this.prisma.$transaction([
      this.prisma.tacheBlocage.create({
        data: {
          tacheId,
          type: dto.type,
          cause: dto.cause,
          bloquantTacheId: dto.bloquantTacheId,
          responsableId: dto.responsableId,
          signaleParId: user.userId,
        },
        include: {
          responsable: { select: { id: true, nom: true } },
          signalePar: { select: { id: true, nom: true } },
          bloquantTache: { select: { id: true, titre: true } },
        },
      }),
      this.prisma.tache.update({ where: { id: tacheId }, data: { sante: SanteTache.BLOQUEE } }),
    ]);

    return blocage;
  }

  /** Marque un blocage comme réellement résolu — réservé au manager, garde l'historique. */
  async resoudreBlocage(tacheId: string, blocageId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user);
    await this.assertManager(tache.projet.bureauId, user);

    const blocage = await this.prisma.tacheBlocage.update({
      where: { id: blocageId },
      data: { dateFin: new Date() },
    });

    await this.recalculerSanteApresBlocage(tacheId);
    return blocage;
  }

  /** Retire un signalement fait par erreur — réservé à son auteur (ou un manager), et
   * seulement tant qu'il n'a pas déjà été résolu. Contrairement à "résoudre", ça ne
   * garde pas de trace : ça n'aurait jamais dû exister. */
  async retirerBlocage(tacheId: string, blocageId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user);
    const blocage = await this.prisma.tacheBlocage.findUnique({ where: { id: blocageId } });
    if (!blocage || blocage.tacheId !== tacheId) {
      throw new NotFoundException('Blocage introuvable');
    }
    if (blocage.dateFin) {
      throw new BadRequestException('Ce blocage est déjà résolu');
    }
    const manager = await this.isManager(tache.projet.bureauId, user);
    if (blocage.signaleParId !== user.userId && !manager) {
      throw new ForbiddenException('Seul l’auteur du signalement ou un manager peut le retirer');
    }

    await this.prisma.tacheBlocage.delete({ where: { id: blocageId } });
    await this.recalculerSanteApresBlocage(tacheId);
  }

  private async recalculerSanteApresBlocage(tacheId: string) {
    const restants = await this.prisma.tacheBlocage.count({ where: { tacheId, dateFin: null } });
    if (restants === 0) {
      await this.prisma.tache.update({
        where: { id: tacheId },
        data: { sante: SanteTache.NORMAL },
      });
    }
  }

  // ---------- Chronomètre ----------

  /**
   * Le chronomètre n'a plus de contrôle manuel : une session s'ouvre/se ferme
   * automatiquement avec demarrer()/declarer(). Cet endpoint ne fait qu'exposer
   * le temps réellement enregistré, pour affichage.
   */
  async chronoStatut(tacheId: string, user: AuthenticatedUser) {
    await this.loadWithBureau(tacheId, user);
    const [dureeReelleMinutes, active] = await Promise.all([
      this.tempsReelMinutes(tacheId),
      this.prisma.tacheSession.findFirst({ where: { tacheId, fin: null } }),
    ]);
    return { dureeReelleMinutes, enCours: !!active };
  }

  async tempsReelMinutes(tacheId: string): Promise<number> {
    const sessions = await this.prisma.tacheSession.findMany({ where: { tacheId } });
    const now = new Date();
    const ms = sessions.reduce((sum, s) => sum + ((s.fin ?? now).getTime() - s.debut.getTime()), 0);
    return Math.round(ms / 60000);
  }
}
