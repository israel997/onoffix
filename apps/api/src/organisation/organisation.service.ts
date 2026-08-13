import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { createHash, randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import { OrganizerService } from '../organizer/organizer.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddOrganisationMembreDto } from './dto/add-organisation-membre.dto';
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
   * Si un compte existe déjà pour cet email, il est rattaché immédiatement à l'organisation.
   * Sinon, une invitation est envoyée par email et l'adhésion n'est créée qu'à son acceptation.
   */
  async addMembre(organisationId: string, dto: AddOrganisationMembreDto) {
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
          roleGlobal: 'MEMBRE',
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

    const organisation = await this.prisma.organisation.findUniqueOrThrow({
      where: { id: organisationId },
      select: { nom: true },
    });

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        nom: dto.nom,
        organisationId,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });

    await this.emailService.sendInvitationEmail(dto.email, dto.nom, organisation.nom, rawToken);

    return {
      status: 'invited' as const,
      invitation: { id: invitation.id, email: dto.email, nom: dto.nom },
    };
  }

  listInvitations(organisationId: string) {
    return this.prisma.invitation.findMany({
      where: { organisationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, nom: true, createdAt: true },
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
