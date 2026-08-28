import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleGlobal } from '@prisma/client';
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
      select: { id: true, nom: true, logoUrl: true, proprietaireId: true, dateCreation: true },
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
          fin: range ? { not: null, gte: range.from, lte: range.to } : { not: null },
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

    const heuresTravaillees =
      Math.round(
        (sessions.reduce((sum, s) => sum + (s.fin!.getTime() - s.debut.getTime()), 0) / 3600000) *
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

      const user = await this.prisma.user.create({
        data: {
          accountId: account.id,
          organisationId,
          nom: dto.nom,
          email: dto.email,
          poste: dto.poste,
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
      select: { id: true, nom: true, logoUrl: true, proprietaireId: true, dateCreation: true },
    });
  }

  async setLogo(organisationId: string, logoUrl: string | null) {
    return this.prisma.organisation.update({
      where: { id: organisationId },
      data: { logoUrl },
      select: { id: true, nom: true, logoUrl: true, proprietaireId: true, dateCreation: true },
    });
  }

  async updateMembreRole(
    organisationId: string,
    targetUserId: string,
    currentUser: AuthenticatedUser,
    dto: UpdateMembreRoleDto,
  ) {
    const organisation = await this.assertOwner(organisationId, currentUser.userId);

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

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { roleGlobal: dto.roleGlobal },
      select: MEMBRE_SELECT,
    });
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
