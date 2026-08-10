import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleBureau, RoleGlobal } from '@prisma/client';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTacheDto } from './dto/create-tache.dto';

const TACHE_INCLUDE = {
  assigneA: { select: { id: true, nom: true } },
  assignePar: { select: { id: true, nom: true } },
  valideur: { select: { id: true, nom: true } },
};

@Injectable()
export class OrganizerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crée l'Organizer unique d'un bureau (chat en vrac + génération de tâches). */
  async createDefaultForBureau(bureauId: string, nom = 'Organizer') {
    return this.prisma.$transaction(async (tx) => {
      const projet = await tx.projet.create({ data: { bureauId, nom, estOrganizer: true } });
      await tx.conversation.create({ data: { projetId: projet.id } });
      return projet;
    });
  }

  /** Crée l'Organizer personnel d'un utilisateur, strictement privé. */
  async createPersonal(userId: string, nom = 'My Organizer') {
    return this.prisma.$transaction(async (tx) => {
      const projet = await tx.projet.create({
        data: { proprietaireId: userId, nom, estOrganizer: true },
      });
      await tx.conversation.create({ data: { projetId: projet.id } });
      return projet;
    });
  }

  async findForBureau(bureauId: string, organisationId: string) {
    const bureau = await this.prisma.bureau.findFirst({ where: { id: bureauId, organisationId } });
    if (!bureau) throw new NotFoundException('Bureau introuvable');

    return this.prisma.projet.findFirstOrThrow({
      where: { bureauId, estOrganizer: true },
      include: {
        taches: { orderBy: { createdAt: 'desc' }, include: TACHE_INCLUDE },
      },
    });
  }

  async findPersonal(userId: string) {
    return this.prisma.projet.findFirstOrThrow({
      where: { proprietaireId: userId, estOrganizer: true },
      include: {
        taches: { orderBy: { createdAt: 'desc' }, include: TACHE_INCLUDE },
      },
    });
  }

  async createTache(projetId: string, user: AuthenticatedUser, dto: CreateTacheDto) {
    const projet = await this.prisma.projet.findUniqueOrThrow({ where: { id: projetId } });

    if (projet.proprietaireId) {
      // Organizer personnel : la tâche s'assigne directement au propriétaire.
      return this.prisma.tache.create({
        data: {
          projetId,
          titre: dto.titre,
          description: dto.description,
          assigneAId: projet.proprietaireId,
          assigneParId: projet.proprietaireId,
        },
        include: TACHE_INCLUDE,
      });
    }

    await this.assertManager(projet.bureauId!, user);

    return this.prisma.tache.create({
      data: { projetId, titre: dto.titre, description: dto.description },
      include: TACHE_INCLUDE,
    });
  }

  private async assertManager(bureauId: string, user: AuthenticatedUser) {
    if (user.roleGlobal === RoleGlobal.ADMIN) return;
    const membership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId: user.userId, bureauId } },
    });
    if (!membership || membership.roleDansBureau !== RoleBureau.MANAGER) {
      throw new ForbiddenException('Seul un manager du bureau peut effectuer cette action');
    }
  }
}
