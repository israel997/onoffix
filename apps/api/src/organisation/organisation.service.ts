import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleBureau, RoleGlobal } from '@prisma/client';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { createHash, randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import { OrganizerService } from '../organizer/organizer.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddOrganisationMembreDto } from './dto/add-organisation-membre.dto';
import { UpdateMembrePosteDto } from './dto/update-membre-poste.dto';
import { UpdateMembreRoleDto } from './dto/update-membre-role.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';

const INVITATION_TTL_DAYS = 7;

const ORGANISATION_SELECT = {
  id: true,
  nom: true,
  logoUrl: true,
  proprietaireId: true,
  dateCreation: true,
  planAbonnement: true,
};

const MEMBRE_SELECT = {
  id: true,
  nom: true,
  email: true,
  poste: true,
  photoUrl: true,
  roleGlobal: true,
  createdAt: true,
  hierarchie: true,
  dateAnniversaire: true,
  aime: true,
  naimePas: true,
  bureaux: {
    select: { roleDansBureau: true, bureau: { select: { id: true, nom: true } } },
  },
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class OrganisationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizerService: OrganizerService,
    private readonly emailService: EmailService,
  ) {}

  async findOne(organisationId: string) {
    const organisation = await this.prisma.organisation.findUniqueOrThrow({
      where: { id: organisationId },
      select: ORGANISATION_SELECT,
    });
    return organisation;
  }

  listMembres(organisationId: string) {
    return this.prisma.user.findMany({
      where: { organisationId },
      select: MEMBRE_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async getStats(organisationId: string) {
    const [membresCount, tachesCount] = await Promise.all([
      this.prisma.user.count({ where: { organisationId } }),
      this.prisma.tache.count({ where: { projet: { bureau: { organisationId } } } }),
    ]);
    return { membresCount, tachesCount };
  }

  /**
   * Statistiques individuelles d'un membre : contribution, temps, fiabilité.
   *
   * Chaque métrique est bornée par la date qui lui correspond réellement — pas toutes
   * par la même colonne, sinon une tâche validée aujourd'hui mais sans dateCible (ou
   * avec une dateCible différente) disparaît à tort du compteur "Completed" de la
   * période. `range` omis = cumul depuis toujours (comportement historique du modal).
   */
  async getMembreStats(organisationId: string, userId: string, range?: { from: Date; to: Date }) {
    const membre = await this.prisma.user.findFirst({ where: { id: userId, organisationId } });
    if (!membre) throw new NotFoundException('Membre introuvable');

    const baseWhere = { assigneAId: userId, projet: { bureau: { organisationId } } };

    const [
      tachesAssignees,
      tachesValidees,
      tachesARevoir,
      avecEcheance,
      blocagesRencontres,
      tachesAvecCible,
      sessions,
      declarations,
    ] = await Promise.all([
      this.prisma.tache.count({
        where: {
          ...baseWhere,
          ...(range ? { createdAt: { gte: range.from, lte: range.to } } : {}),
        },
      }),
      this.prisma.tache.count({
        where: {
          ...baseWhere,
          statut: 'VALIDE',
          dateValidation: range ? { gte: range.from, lte: range.to } : { not: null },
        },
      }),
      this.prisma.tache.count({
        where: {
          ...baseWhere,
          statut: 'A_REVOIR',
          ...(range ? { createdAt: { gte: range.from, lte: range.to } } : {}),
        },
      }),
      this.prisma.tache.findMany({
        where: {
          ...baseWhere,
          dateEcheance: range ? { gte: range.from, lte: range.to } : { not: null },
        },
        select: { dateEcheance: true, dateValidation: true },
      }),
      this.prisma.tacheBlocage.count({
        where: {
          tache: baseWhere,
          ...(range ? { dateDebut: { gte: range.from, lte: range.to } } : {}),
        },
      }),
      this.prisma.tache.findMany({
        where: {
          ...baseWhere,
          dateCible: range ? { gte: range.from, lte: range.to } : { not: null },
        },
        select: { dateCible: true },
      }),
      this.prisma.tacheSession.findMany({
        where: {
          userId,
          // Une session encore active (fin: null, chrono en cours) doit aussi compter —
          // sinon tout le temps d'une tâche non encore déclarée faite reste invisible.
          OR: [{ fin: range ? { gte: range.from, lte: range.to } : { not: null } }, { fin: null }],
        },
        select: { debut: true, fin: true },
      }),
      this.prisma.declarationJournaliere.findMany({
        where: { userId, ...(range ? { date: { gte: range.from, lte: range.to } } : {}) },
        select: { date: true },
      }),
    ]);

    const respecteesDeadline = avecEcheance.filter(
      (t) => t.dateValidation && t.dateEcheance && t.dateValidation <= t.dateEcheance,
    );

    const joursAvecTache = new Set(
      tachesAvecCible
        .filter((t) => t.dateCible)
        .map((t) => t.dateCible!.toISOString().slice(0, 10)),
    );

    const now = new Date();
    const heuresTravaillees =
      Math.round(
        (sessions.reduce((sum, s) => {
          const start = range && s.debut < range.from ? range.from : s.debut;
          const end = s.fin ?? now;
          const clippedEnd = range && end > range.to ? range.to : end;
          return sum + Math.max(0, clippedEnd.getTime() - start.getTime());
        }, 0) /
          3600000) *
          10,
      ) / 10;

    const joursDeclares = new Set(declarations.map((d) => d.date.toISOString().slice(0, 10)));
    const joursDeclaresATemps = [...joursAvecTache].filter((d) => joursDeclares.has(d)).length;

    return {
      tachesAssignees,
      tachesValidees,
      tachesARevoir,
      heuresTravaillees,
      tauxDeclarationsATemps:
        joursAvecTache.size === 0
          ? null
          : Math.round((joursDeclaresATemps / joursAvecTache.size) * 100),
      blocagesRencontres,
      respectDeadlines:
        avecEcheance.length === 0
          ? null
          : Math.round((respecteesDeadline.length / avecEcheance.length) * 100),
    };
  }

  /**
   * Journal jour par jour des tâches validées sur la période — permet à chacun de
   * revoir son parcours (hier, avant-hier...) plutôt qu'un seul total agrégé.
   * Un jour sans rien de validé apparaît quand même, avec une liste vide.
   */
  async getMembreJournal(organisationId: string, userId: string, from: Date, to: Date) {
    const membre = await this.prisma.user.findFirst({ where: { id: userId, organisationId } });
    if (!membre) throw new NotFoundException('Membre introuvable');

    const taches = await this.prisma.tache.findMany({
      where: {
        assigneAId: userId,
        projet: { bureau: { organisationId } },
        statut: 'VALIDE',
        dateValidation: { gte: from, lte: to },
      },
      select: { id: true, titre: true, dateValidation: true },
      orderBy: { dateValidation: 'asc' },
    });

    const parJour = new Map<string, { id: string; titre: string }[]>();
    for (const t of taches) {
      const key = t.dateValidation!.toISOString().slice(0, 10);
      if (!parJour.has(key)) parJour.set(key, []);
      parJour.get(key)!.push({ id: t.id, titre: t.titre });
    }

    const jours: { date: string; taches: { id: string; titre: string }[] }[] = [];
    for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      jours.push({ date: key, taches: parJour.get(key) ?? [] });
    }
    return jours.reverse();
  }

  /**
   * Si un compte existe déjà pour cet email, il est rattaché immédiatement à l'organisation.
   * Sinon, une invitation est envoyée par email et l'adhésion n'est créée qu'à son acceptation.
   */
  async addMembre(
    organisationId: string,
    dto: AddOrganisationMembreDto,
    currentUser: AuthenticatedUser,
  ) {
    const account = await this.prisma.account.findUnique({ where: { email: dto.email } });

    if (account) {
      const existingMembership = await this.prisma.user.findUnique({
        where: { accountId_organisationId: { accountId: account.id, organisationId } },
      });
      if (existingMembership) {
        throw new ConflictException('Ce collaborateur est déjà membre de cette organisation');
      }

      // Si ce compte a déjà prouvé cet email ailleurs (une autre organisation), inutile
      // de le refaire vérifier ici — sinon le login sur cette nouvelle organisation
      // resterait bloqué sans jamais recevoir de code (une autre org déjà vérifiée
      // du même compte répond à sa place).
      const alreadyVerifiedElsewhere = await this.prisma.user.findFirst({
        where: { accountId: account.id, emailVerifie: true },
      });

      const user = await this.prisma.user.create({
        data: {
          accountId: account.id,
          organisationId,
          nom: dto.nom,
          email: dto.email,
          poste: dto.poste,
          emailVerifie: !!alreadyVerifiedElsewhere,
          roleGlobal: RoleGlobal.MEMBRE,
        },
        select: MEMBRE_SELECT,
      });

      await this.organizerService.createPersonal(user.id);

      return { status: 'added' as const, membre: user };
    }

    const pendingInvitation = await this.prisma.invitation.findFirst({
      where: { organisationId, email: dto.email, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pendingInvitation) {
      throw new ConflictException('Une invitation est déjà en attente pour cet email');
    }

    const [organisation, inviter] = await Promise.all([
      this.prisma.organisation.findUniqueOrThrow({
        where: { id: organisationId },
        select: { nom: true },
      }),
      this.prisma.user.findUniqueOrThrow({
        where: { id: currentUser.userId },
        select: { nom: true },
      }),
    ]);

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        nom: dto.nom,
        poste: dto.poste,
        organisationId,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });

    await this.emailService.sendInvitationEmail(
      dto.email,
      dto.nom,
      organisation.nom,
      inviter.nom,
      dto.poste ?? null,
      rawToken,
    );

    return {
      status: 'invited' as const,
      invitation: { id: invitation.id, email: dto.email, nom: dto.nom },
    };
  }

  listInvitations(organisationId: string) {
    return this.prisma.invitation.findMany({
      where: { organisationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, nom: true, poste: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelInvitation(organisationId: string, invitationId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organisationId },
    });
    if (!invitation) throw new NotFoundException('Invitation introuvable');
    await this.prisma.invitation.delete({ where: { id: invitationId } });
  }

  async updateNom(organisationId: string, dto: UpdateOrganisationDto) {
    return this.prisma.organisation.update({
      where: { id: organisationId },
      data: { nom: dto.nom },
      select: ORGANISATION_SELECT,
    });
  }

  async setLogo(organisationId: string, logoUrl: string | null) {
    return this.prisma.organisation.update({
      where: { id: organisationId },
      data: { logoUrl },
      select: ORGANISATION_SELECT,
    });
  }

  /**
   * Change le rôle global (Authority/Manager/Collaborator) d'un membre. Toute Authority peut
   * le faire (cf. garde @Roles(ADMIN) sur la route) — seul le transfert de propriété
   * lui-même (transferOwnership) reste réservé au propriétaire actuel.
   */
  async updateMembreRole(
    organisationId: string,
    targetUserId: string,
    _currentUser: AuthenticatedUser,
    dto: UpdateMembreRoleDto,
  ) {
    const organisation = await this.prisma.organisation.findUniqueOrThrow({
      where: { id: organisationId },
      select: { proprietaireId: true },
    });

    if (targetUserId === organisation.proprietaireId) {
      throw new BadRequestException(
        "Le rôle du propriétaire de l'organisation ne peut pas être modifié",
      );
    }

    const membre = await this.prisma.user.findFirst({
      where: { id: targetUserId, organisationId },
    });
    if (!membre)
      throw new NotFoundException("Ce collaborateur ne fait pas partie de l'organisation");

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { roleGlobal: dto.roleGlobal },
      select: MEMBRE_SELECT,
    });

    // Un admin a accès à tous les bureaux de l'organisation — sans cette ligne il
    // resterait invisible dans les listes de membres (impossible à mentionner ou
    // à assigner comme n'importe qui).
    if (dto.roleGlobal === RoleGlobal.ADMIN) {
      const bureaux = await this.prisma.bureau.findMany({
        where: { organisationId },
        select: { id: true },
      });
      if (bureaux.length > 0) {
        await this.prisma.userBureau.createMany({
          data: bureaux.map((bureau) => ({
            userId: targetUserId,
            bureauId: bureau.id,
            roleDansBureau: RoleBureau.MANAGER,
          })),
          skipDuplicates: true,
        });
      }
    }

    return updated;
  }

  /**
   * Transfère la propriété de l'organisation à un autre membre — réservé au propriétaire
   * actuel. Le nouveau propriétaire devient Authority s'il ne l'était pas déjà, pour
   * garder l'accès complet que le statut de propriétaire suppose.
   */
  async transferOwnership(
    organisationId: string,
    currentUser: AuthenticatedUser,
    newOwnerId: string,
  ) {
    const organisation = await this.assertOwner(organisationId, currentUser.userId);

    if (newOwnerId === organisation.proprietaireId) {
      throw new BadRequestException('Ce membre est déjà propriétaire de l’organisation');
    }

    const newOwner = await this.prisma.user.findFirst({
      where: { id: newOwnerId, organisationId },
    });
    if (!newOwner)
      throw new NotFoundException("Ce collaborateur ne fait pas partie de l'organisation");

    await this.prisma.organisation.update({
      where: { id: organisationId },
      data: { proprietaireId: newOwnerId },
    });

    if (newOwner.roleGlobal !== RoleGlobal.ADMIN) {
      await this.prisma.user.update({
        where: { id: newOwnerId },
        data: { roleGlobal: RoleGlobal.ADMIN },
      });
      const bureaux = await this.prisma.bureau.findMany({
        where: { organisationId },
        select: { id: true },
      });
      if (bureaux.length > 0) {
        await this.prisma.userBureau.createMany({
          data: bureaux.map((bureau) => ({
            userId: newOwnerId,
            bureauId: bureau.id,
            roleDansBureau: RoleBureau.MANAGER,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(organisationId);
  }

  /** Poste/titre affiché (ex. "Chief Technical Officer") — modifiable par un admin, y compris après coup. */
  async updateMembrePoste(organisationId: string, targetUserId: string, dto: UpdateMembrePosteDto) {
    const membre = await this.prisma.user.findFirst({
      where: { id: targetUserId, organisationId },
    });
    if (!membre)
      throw new NotFoundException("Ce collaborateur ne fait pas partie de l'organisation");

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { poste: dto.poste },
      select: MEMBRE_SELECT,
    });
  }

  async remove(organisationId: string, currentUser: AuthenticatedUser) {
    await this.assertOwner(organisationId, currentUser.userId);
    await this.prisma.organisation.delete({ where: { id: organisationId } });
  }

  async removeMembre(organisationId: string, targetUserId: string, currentUser: AuthenticatedUser) {
    const organisation = await this.prisma.organisation.findUniqueOrThrow({
      where: { id: organisationId },
      select: { proprietaireId: true },
    });

    if (targetUserId === organisation.proprietaireId) {
      throw new BadRequestException("Le propriétaire de l'organisation ne peut pas être supprimé");
    }
    if (targetUserId === currentUser.userId) {
      throw new BadRequestException('Vous ne pouvez pas vous supprimer vous-même');
    }

    const membre = await this.prisma.user.findFirst({
      where: { id: targetUserId, organisationId },
    });
    if (!membre)
      throw new NotFoundException("Ce collaborateur ne fait pas partie de l'organisation");

    await this.prisma.user.delete({ where: { id: targetUserId } });

    // Si ce collaborateur n'appartenait à aucune autre organisation, son compte
    // devient orphelin — on le supprime aussi pour qu'il reparte de zéro.
    const remaining = await this.prisma.user.count({ where: { accountId: membre.accountId } });
    if (remaining === 0) {
      await this.prisma.account.delete({ where: { id: membre.accountId } });
    }
  }

  private async assertOwner(organisationId: string, userId: string) {
    const organisation = await this.prisma.organisation.findUniqueOrThrow({
      where: { id: organisationId },
      select: { proprietaireId: true },
    });
    if (organisation.proprietaireId !== userId) {
      throw new ForbiddenException(
        "Seul le propriétaire de l'organisation peut effectuer cette action",
      );
    }
    return organisation;
  }
}
