import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleBureau, RoleGlobal } from '@prisma/client';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ChatService } from '../chat/chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTacheDto } from './dto/create-tache.dto';
import { OrganizerScheduler } from './organizer.scheduler';

const TACHE_INCLUDE = {
  assigneA: { select: { id: true, nom: true } },
  assignePar: { select: { id: true, nom: true } },
  valideur: { select: { id: true, nom: true } },
};

@Injectable()
export class OrganizerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
    private readonly scheduler: OrganizerScheduler,
  ) {}

  /** Crée l'Organizer unique d'un bureau (chat en vrac + génération de tâches). */
  async createDefaultForBureau(bureauId: string, nom = 'Organizer') {
    return this.prisma.$transaction(async (tx) => {
      const projet = await tx.projet.create({ data: { bureauId, nom, estOrganizer: true } });
      await tx.conversation.create({ data: { projetId: projet.id, nom: 'General' } });
      return projet;
    });
  }

  /** Crée l'Organizer personnel d'un utilisateur, strictement privé. */
  async createPersonal(userId: string, nom = 'My Organizer') {
    return this.prisma.$transaction(async (tx) => {
      const projet = await tx.projet.create({
        data: { proprietaireId: userId, nom, estOrganizer: true },
      });
      await tx.conversation.create({ data: { projetId: projet.id, nom: 'General' } });
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
        conversations: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async findPersonal(userId: string) {
    return this.prisma.projet.findFirstOrThrow({
      where: { proprietaireId: userId, estOrganizer: true },
      include: {
        taches: { orderBy: { createdAt: 'desc' }, include: TACHE_INCLUDE },
        conversations: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  listSubjects(projetId: string) {
    return this.chatService.listSubjects(projetId);
  }

  createSubject(projetId: string, nom: string) {
    return this.chatService.createSubject(projetId, nom);
  }

  async renameSubject(projetId: string, subjectId: string, nom: string) {
    await this.chatService.assertSubjectBelongsToProjet(subjectId, projetId);
    return this.chatService.renameSubject(subjectId, nom);
  }

  async deleteSubject(projetId: string, subjectId: string) {
    await this.chatService.assertSubjectBelongsToProjet(subjectId, projetId);
    const remaining = await this.chatService.listSubjects(projetId);
    if (remaining.length <= 1) {
      throw new ForbiddenException('Un organizer doit garder au moins un Subject');
    }
    await this.scheduler.cancelSubject(subjectId);
    await this.chatService.deleteSubject(subjectId);
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
