import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, RoleGlobal } from '@prisma/client';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { StorageService } from '../common/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRapportDto } from './dto/create-rapport.dto';
import { UpdateRapportDto } from './dto/update-rapport.dto';
import { RapportPdfService } from './rapport-pdf.service';

const DETAIL_INCLUDE = {
  createur: { select: { id: true, nom: true } },
  jours: {
    orderBy: { jour: 'asc' as const },
    include: { images: { orderBy: { ordre: 'asc' as const } } },
  },
  images: { where: { jourId: null }, orderBy: { ordre: 'asc' as const } },
  mentions: { include: { user: { select: { id: true, nom: true } } } },
};

@Injectable()
export class RapportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
    private readonly pdf: RapportPdfService,
  ) {}

  private isAdmin(user: AuthenticatedUser) {
    return user.roleGlobal === RoleGlobal.ADMIN;
  }

  private async assertAccess(rapportId: string, user: AuthenticatedUser) {
    const rapport = await this.prisma.rapport.findFirst({
      where: { id: rapportId, organisationId: user.organisationId },
    });
    // Un rapport privé est introuvable pour un non-admin, pas juste interdit —
    // pas d'indice sur son existence.
    if (!rapport || (rapport.estPrive && !this.isAdmin(user))) {
      throw new NotFoundException('Rapport introuvable');
    }
    return rapport;
  }

  private assertEditRights(rapport: { createurId: string }, user: AuthenticatedUser) {
    if (rapport.createurId !== user.userId && !this.isAdmin(user)) {
      throw new ForbiddenException('Seul le créateur ou un admin peut modifier ce rapport');
    }
  }

  async list(user: AuthenticatedUser, archived: boolean) {
    return this.prisma.rapport.findMany({
      where: {
        organisationId: user.organisationId,
        estArchive: archived,
        ...(this.isAdmin(user) ? {} : { estPrive: false }),
      },
      orderBy: { createdAt: 'desc' },
      include: { createur: { select: { id: true, nom: true } } },
    });
  }

  async create(user: AuthenticatedUser, dto: CreateRapportDto) {
    const rapport = await this.prisma.rapport.create({
      data: {
        organisationId: user.organisationId,
        nom: dto.nom,
        type: dto.type,
        createurId: user.userId,
      },
    });
    if (dto.type === 'WEEKLY') {
      await this.prisma.rapportJour.createMany({
        data: Array.from({ length: 7 }, (_, jour) => ({ rapportId: rapport.id, jour })),
      });
    }
    return this.findOne(rapport.id, user);
  }

  async findOne(rapportId: string, user: AuthenticatedUser) {
    await this.assertAccess(rapportId, user);
    return this.prisma.rapport.findUniqueOrThrow({
      where: { id: rapportId },
      include: DETAIL_INCLUDE,
    });
  }

  async update(rapportId: string, user: AuthenticatedUser, dto: UpdateRapportDto) {
    const rapport = await this.assertAccess(rapportId, user);
    this.assertEditRights(rapport, user);

    await this.prisma.rapport.update({
      where: { id: rapportId },
      data: {
        nom: dto.nom,
        contenu: dto.contenu,
      },
    });

    if (dto.jours) {
      await Promise.all(
        dto.jours.map((j) =>
          this.prisma.rapportJour.updateMany({
            where: { rapportId, jour: j.jour },
            data: {
              contenu: j.contenu,
              bonsPoints: j.bonsPoints,
              pointsNegatifs: j.pointsNegatifs,
              objectifs: j.objectifs,
            },
          }),
        ),
      );
    }

    if (dto.mentionedUserIds) {
      await this.syncMentions(rapportId, user, dto.mentionedUserIds);
    }

    return this.findOne(rapportId, user);
  }

  private async syncMentions(rapportId: string, user: AuthenticatedUser, userIds: string[]) {
    const valides = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(userIds)] }, organisationId: user.organisationId },
      select: { id: true },
    });
    const validIds = valides.map((u) => u.id);

    const existantes = await this.prisma.rapportMention.findMany({
      where: { rapportId },
      select: { userId: true },
    });
    const existantesIds = new Set(existantes.map((e) => e.userId));
    const aAjouter = validIds.filter((id) => !existantesIds.has(id));
    const aRetirer = [...existantesIds].filter((id) => !validIds.includes(id));

    if (aRetirer.length > 0) {
      await this.prisma.rapportMention.deleteMany({
        where: { rapportId, userId: { in: aRetirer } },
      });
    }
    if (aAjouter.length > 0) {
      await this.prisma.rapportMention.createMany({
        data: aAjouter.map((userId) => ({ rapportId, userId })),
      });
      const rapport = await this.prisma.rapport.findUniqueOrThrow({
        where: { id: rapportId },
        select: { nom: true },
      });
      await Promise.all(
        aAjouter
          .filter((id) => id !== user.userId)
          .map((userId) =>
            this.notifications.create(
              userId,
              NotificationType.MENTION_RAPPORT,
              `Vous avez été mentionné dans le rapport « ${rapport.nom} »`,
              `/reporting/${rapportId}`,
            ),
          ),
      );
    }
  }

  async remove(rapportId: string, user: AuthenticatedUser) {
    const rapport = await this.assertAccess(rapportId, user);
    this.assertEditRights(rapport, user);
    await this.prisma.rapport.delete({ where: { id: rapportId } });
  }

  async setArchive(rapportId: string, user: AuthenticatedUser, archived: boolean) {
    const rapport = await this.assertAccess(rapportId, user);
    this.assertEditRights(rapport, user);
    return this.prisma.rapport.update({ where: { id: rapportId }, data: { estArchive: archived } });
  }

  async setVisibilite(rapportId: string, user: AuthenticatedUser, prive: boolean) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Seul un admin peut changer la visibilité');
    }
    const rapport = await this.prisma.rapport.findFirst({
      where: { id: rapportId, organisationId: user.organisationId },
    });
    if (!rapport) throw new NotFoundException('Rapport introuvable');
    return this.prisma.rapport.update({ where: { id: rapportId }, data: { estPrive: prive } });
  }

  async addImage(
    rapportId: string,
    user: AuthenticatedUser,
    jourId: string | undefined,
    file: Express.Multer.File,
  ) {
    const rapport = await this.assertAccess(rapportId, user);
    this.assertEditRights(rapport, user);
    if (jourId) {
      const jour = await this.prisma.rapportJour.findFirst({ where: { id: jourId, rapportId } });
      if (!jour) throw new NotFoundException('Jour introuvable');
    }
    const url = await this.storage.upload(
      file.buffer,
      'rapports',
      file.originalname,
      file.mimetype,
    );
    return this.prisma.rapportImage.create({
      data: { rapportId, jourId: jourId ?? null, url, nom: file.originalname },
    });
  }

  async removeImage(rapportId: string, imageId: string, user: AuthenticatedUser) {
    const rapport = await this.assertAccess(rapportId, user);
    this.assertEditRights(rapport, user);
    await this.prisma.rapportImage.deleteMany({ where: { id: imageId, rapportId } });
  }

  async generatePdf(rapportId: string, user: AuthenticatedUser) {
    const rapport = await this.findOne(rapportId, user);
    return this.pdf.render(rapport);
  }
}
