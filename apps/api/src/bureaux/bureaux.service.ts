import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleGlobal } from '@prisma/client';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { OrganizerScheduler } from '../organizer/organizer.scheduler';
import { OrganizerService } from '../organizer/organizer.service';
import { PrismaService } from '../prisma/prisma.service';
import { RituelsScheduler } from '../queue/rituels.scheduler';
import { AddMembreDto } from './dto/add-membre.dto';
import { CreateBureauDto } from './dto/create-bureau.dto';
import { ReorderBureauxDto } from './dto/reorder-bureaux.dto';
import { UpdateBureauDto } from './dto/update-bureau.dto';
import { UpdateMembreDto } from './dto/update-membre.dto';
import { UpdateParametresDto } from './dto/update-parametres.dto';

const MAX_BUREAUX_PAR_ORGANISATION = 10;

const MEMBRE_SELECT = {
  roleDansBureau: true,
  roleInterne: true,
  user: { select: { id: true, nom: true, email: true, photoUrl: true } },
};

@Injectable()
export class BureauxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rituelsScheduler: RituelsScheduler,
    private readonly organizerService: OrganizerService,
    private readonly organizerScheduler: OrganizerScheduler,
  ) {}

  async create(organisationId: string, dto: CreateBureauDto) {
    const ordre = await this.prisma.bureau.count({ where: { organisationId } });
    if (ordre >= MAX_BUREAUX_PAR_ORGANISATION) {
      throw new BadRequestException(
        `Une organisation ne peut pas avoir plus de ${MAX_BUREAUX_PAR_ORGANISATION} bureaux`,
      );
    }
    const bureau = await this.prisma.bureau.create({
      data: { organisationId, nom: dto.nom, ordre },
    });
    await this.rituelsScheduler.syncBureau(bureau);

    const organizer = await this.organizerService.createDefaultForBureau(bureau.id);
    await this.organizerScheduler.schedule(organizer.id);

    return bureau;
  }

  async findAllForUser(user: AuthenticatedUser) {
    if (user.roleGlobal === RoleGlobal.ADMIN) {
      return this.prisma.bureau.findMany({
        where: { organisationId: user.organisationId },
        orderBy: [{ ordre: 'asc' }, { createdAt: 'asc' }],
      });
    }
    const memberships = await this.prisma.userBureau.findMany({
      where: { userId: user.userId },
      select: { bureau: true },
      orderBy: { bureau: { ordre: 'asc' } },
    });
    return memberships.map((m) => m.bureau);
  }

  async findOne(bureauId: string, user: AuthenticatedUser) {
    const bureau = await this.prisma.bureau.findFirst({
      where: { id: bureauId, organisationId: user.organisationId },
      include: { membres: { select: MEMBRE_SELECT } },
    });
    if (!bureau) throw new NotFoundException('Bureau introuvable');
    return bureau;
  }

  async update(bureauId: string, organisationId: string, dto: UpdateBureauDto) {
    await this.assertInOrganisation(bureauId, organisationId);
    return this.prisma.bureau.update({ where: { id: bureauId }, data: dto });
  }

  async updateParametres(bureauId: string, organisationId: string, dto: UpdateParametresDto) {
    await this.assertInOrganisation(bureauId, organisationId);
    const bureau = await this.prisma.bureau.update({ where: { id: bureauId }, data: dto });
    await this.rituelsScheduler.syncBureau(bureau);
    return bureau;
  }

  async setPhoto(bureauId: string, organisationId: string, photoUrl: string | null) {
    await this.assertInOrganisation(bureauId, organisationId);
    return this.prisma.bureau.update({ where: { id: bureauId }, data: { photoUrl } });
  }

  async remove(bureauId: string, organisationId: string) {
    await this.assertInOrganisation(bureauId, organisationId);
    await this.rituelsScheduler.removeBureauJobs(bureauId);

    const organizer = await this.prisma.projet.findFirst({
      where: { bureauId, estOrganizer: true },
      select: { id: true },
    });
    if (organizer) await this.organizerScheduler.cancel(organizer.id);

    await this.prisma.bureau.delete({ where: { id: bureauId } });
  }

  async reorder(organisationId: string, dto: ReorderBureauxDto) {
    const bureaux = await this.prisma.bureau.findMany({
      where: { organisationId, id: { in: dto.ordre } },
      select: { id: true },
    });
    if (bureaux.length !== dto.ordre.length) {
      throw new BadRequestException('La liste contient un bureau invalide');
    }

    await this.prisma.$transaction(
      dto.ordre.map((id, index) =>
        this.prisma.bureau.update({ where: { id }, data: { ordre: index } }),
      ),
    );
  }

  async addMembre(bureauId: string, organisationId: string, dto: AddMembreDto) {
    await this.assertInOrganisation(bureauId, organisationId);

    const membre = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!membre || membre.organisationId !== organisationId) {
      throw new NotFoundException(
        "Ce collaborateur n'existe pas encore dans l'organisation — ajoutez-le d'abord depuis Membres.",
      );
    }

    const existing = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId: membre.id, bureauId } },
    });
    if (existing) {
      throw new ConflictException('Ce collaborateur est déjà membre de ce bureau');
    }

    await this.prisma.userBureau.create({
      data: {
        userId: membre.id,
        bureauId,
        roleDansBureau: dto.roleDansBureau,
        roleInterne: dto.roleInterne,
      },
    });

    return this.prisma.userBureau.findUniqueOrThrow({
      where: { userId_bureauId: { userId: membre.id, bureauId } },
      select: MEMBRE_SELECT,
    });
  }

  async updateMembre(bureauId: string, userId: string, dto: UpdateMembreDto) {
    await this.assertMembership(bureauId, userId);
    await this.prisma.userBureau.update({
      where: { userId_bureauId: { userId, bureauId } },
      data: dto,
    });
    return this.prisma.userBureau.findUniqueOrThrow({
      where: { userId_bureauId: { userId, bureauId } },
      select: MEMBRE_SELECT,
    });
  }

  async removeMembre(bureauId: string, userId: string) {
    await this.assertMembership(bureauId, userId);
    await this.prisma.userBureau.delete({ where: { userId_bureauId: { userId, bureauId } } });
  }

  private async assertInOrganisation(bureauId: string, organisationId: string) {
    const bureau = await this.prisma.bureau.findFirst({
      where: { id: bureauId, organisationId },
    });
    if (!bureau) throw new NotFoundException('Bureau introuvable');
    return bureau;
  }

  private async assertMembership(bureauId: string, userId: string) {
    const membership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId, bureauId } },
    });
    if (!membership) throw new ForbiddenException('Ce collaborateur ne fait pas partie du bureau');
    return membership;
  }
}
