import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddOrganizerMembreDto } from './dto/add-organizer-membre.dto';
import { CreateOrganizerDto } from './dto/create-organizer.dto';
import { OrganizerScheduler } from './organizer.scheduler';

const MEMBRE_SELECT = { user: { select: { id: true, nom: true, email: true, photoUrl: true } } };

@Injectable()
export class OrganizerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: OrganizerScheduler,
  ) {}

  async create(bureauId: string, organisationId: string, userId: string, dto: CreateOrganizerDto) {
    const bureau = await this.prisma.bureau.findFirst({ where: { id: bureauId, organisationId } });
    if (!bureau) throw new NotFoundException('Bureau introuvable');

    const projet = await this.prisma.$transaction(async (tx) => {
      const created = await tx.projet.create({
        data: { bureauId, nom: dto.nom, estOrganizer: true },
      });
      await tx.conversation.create({ data: { projetId: created.id } });
      await tx.projetMembre.create({ data: { projetId: created.id, userId } });
      return created;
    });

    await this.scheduler.schedule(projet.id);
    return projet;
  }

  async findAllForBureau(bureauId: string, organisationId: string) {
    const bureau = await this.prisma.bureau.findFirst({ where: { id: bureauId, organisationId } });
    if (!bureau) throw new NotFoundException('Bureau introuvable');

    const organizers = await this.prisma.projet.findMany({
      where: { bureauId, estOrganizer: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nom: true,
        createdAt: true,
        derniereGenerationTaches: true,
        _count: { select: { membres: true, taches: true } },
      },
    });
    return organizers;
  }

  async findOne(projetId: string) {
    const projet = await this.prisma.projet.findUniqueOrThrow({
      where: { id: projetId },
      include: {
        membres: { select: MEMBRE_SELECT },
        taches: {
          orderBy: { createdAt: 'desc' },
          include: {
            assigneA: { select: { id: true, nom: true } },
            assignePar: { select: { id: true, nom: true } },
            valideur: { select: { id: true, nom: true } },
          },
        },
      },
    });
    return projet;
  }

  async addMembre(projetId: string, dto: AddOrganizerMembreDto) {
    const projet = await this.prisma.projet.findUniqueOrThrow({ where: { id: projetId } });

    const membre = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!membre) throw new NotFoundException("Ce collaborateur n'existe pas dans l'organisation");

    const bureauMembership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId: membre.id, bureauId: projet.bureauId } },
    });
    if (!bureauMembership) {
      throw new ForbiddenException(
        'Ce collaborateur ne fait pas partie du bureau de cet organizer',
      );
    }

    const existing = await this.prisma.projetMembre.findUnique({
      where: { projetId_userId: { projetId, userId: membre.id } },
    });
    if (existing) throw new ConflictException('Ce collaborateur est déjà dans cet organizer');

    await this.prisma.projetMembre.create({ data: { projetId, userId: membre.id } });
    return this.prisma.user.findUnique({
      where: { id: membre.id },
      select: { id: true, nom: true, email: true, photoUrl: true },
    });
  }

  async removeMembre(projetId: string, userId: string) {
    await this.prisma.projetMembre
      .delete({ where: { projetId_userId: { projetId, userId } } })
      .catch(() => {
        throw new NotFoundException('Ce collaborateur ne fait pas partie de cet organizer');
      });
  }

  async remove(projetId: string) {
    await this.scheduler.cancel(projetId);
    await this.prisma.projet.delete({ where: { id: projetId } });
  }
}
