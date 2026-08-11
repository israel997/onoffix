import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleGlobal } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { OrganizerScheduler } from '../organizer/organizer.scheduler';
import { OrganizerService } from '../organizer/organizer.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddOrganisationMembreDto } from './dto/add-organisation-membre.dto';
import { UpdateMembreRoleDto } from './dto/update-membre-role.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';

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

@Injectable()
export class OrganisationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizerService: OrganizerService,
    private readonly organizerScheduler: OrganizerScheduler,
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

  async addMembre(organisationId: string, dto: AddOrganisationMembreDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        organisationId,
        nom: dto.nom,
        email: dto.email,
        passwordHash,
        roleGlobal: RoleGlobal.MEMBRE,
      },
      select: MEMBRE_SELECT,
    });

    const personalOrganizer = await this.organizerService.createPersonal(user.id);
    await this.organizerScheduler.schedule(personalOrganizer.id);

    return user;
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
