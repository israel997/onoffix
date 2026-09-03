import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, RoleBureau, RoleGlobal } from '@prisma/client';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AiService } from '../ai/ai.service';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConvertPlanDto } from './dto/convert-plan.dto';
import { CreateTacheDto } from './dto/create-tache.dto';
import { OrganizerScheduler } from './organizer.scheduler';

const TACHE_INCLUDE = {
  assigneA: { select: { id: true, nom: true } },
  assignePar: { select: { id: true, nom: true } },
  valideur: { select: { id: true, nom: true } },
  conversation: { select: { id: true, nom: true } },
};

@Injectable()
export class OrganizerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
    private readonly aiService: AiService,
    private readonly notifications: NotificationsService,
    private readonly organizerScheduler: OrganizerScheduler,
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
        conversations: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async findPersonal(userId: string) {
    return this.prisma.projet.findFirstOrThrow({
      where: { proprietaireId: userId, estOrganizer: true },
      include: {
        taches: { orderBy: { createdAt: 'desc' }, include: TACHE_INCLUDE },
        conversations: { orderBy: { createdAt: 'desc' } },
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
    await this.chatService.deleteSubject(subjectId);
  }

  /** Relance le traitement IA des messages de ce Subject restés en échec définitif. */
  async retryProcessing(projetId: string, subjectId: string) {
    await this.chatService.assertSubjectBelongsToProjet(subjectId, projetId);
    const messages = await this.prisma.message.findMany({
      where: { conversationId: subjectId },
      select: { id: true },
    });
    await this.organizerScheduler.retryFailedProcessing(messages.map((m) => m.id));
  }

  async createTache(projetId: string, user: AuthenticatedUser, dto: CreateTacheDto) {
    const projet = await this.prisma.projet.findUniqueOrThrow({ where: { id: projetId } });

    if (dto.conversationId) {
      await this.chatService.assertSubjectBelongsToProjet(dto.conversationId, projetId);
    }

    if (projet.proprietaireId) {
      // Organizer personnel : la tâche s'assigne directement au propriétaire.
      return this.prisma.tache.create({
        data: {
          projetId,
          titre: dto.titre,
          description: dto.description,
          priorite: dto.priorite,
          dateEcheance: dto.dateEcheance ? new Date(dto.dateEcheance) : undefined,
          conversationId: dto.conversationId,
          assigneAId: projet.proprietaireId,
          assigneParId: projet.proprietaireId,
        },
        include: TACHE_INCLUDE,
      });
    }

    await this.assertManager(projet.bureauId!, user);

    // Une tâche de bureau créée sans assignation explicite passe par défaut au
    // propriétaire de l'organisation, pour qu'elle ne reste jamais orpheline.
    const bureau = await this.prisma.bureau.findUniqueOrThrow({
      where: { id: projet.bureauId! },
      select: { organisation: { select: { proprietaireId: true } } },
    });
    const proprietaireId = bureau.organisation.proprietaireId;

    const tache = await this.prisma.tache.create({
      data: {
        projetId,
        titre: dto.titre,
        description: dto.description,
        priorite: dto.priorite,
        conversationId: dto.conversationId,
        assigneAId: proprietaireId,
        assigneParId: user.userId,
      },
      include: TACHE_INCLUDE,
    });

    if (proprietaireId !== user.userId) {
      await this.notifications.create(
        proprietaireId,
        NotificationType.TACHE_ASSIGNEE,
        `On vous a assigné la tâche « ${tache.titre} »`,
        `/offices/${projet.bureauId}/tasks`,
      );
    }

    return tache;
  }

  /** Génère un aperçu de plan (nom de projet + tâches priorisées) depuis les messages d'un Subject. Rien n'est persisté. */
  async proposePlan(projetId: string, subjectId: string) {
    await this.chatService.assertSubjectBelongsToProjet(subjectId, projetId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId: subjectId },
      orderBy: { createdAt: 'asc' },
      include: { auteur: { select: { nom: true } } },
    });

    const texte = messages.map((m) => `${m.auteur.nom}: ${m.contenu}`).join('\n');
    return this.aiService.suggestPlan(texte);
  }

  /** Convertit un plan (revu/priorisé/assigné côté client) en un vrai Projet + tâches. */
  async convertPlan(projetId: string, user: AuthenticatedUser, dto: ConvertPlanDto) {
    const organizer = await this.prisma.projet.findUniqueOrThrow({ where: { id: projetId } });

    if (organizer.bureauId) {
      await this.assertManager(organizer.bureauId, user);
    }

    for (const tache of dto.taches) {
      if (tache.assigneAId && organizer.bureauId) {
        const membership = await this.prisma.userBureau.findUnique({
          where: { userId_bureauId: { userId: tache.assigneAId, bureauId: organizer.bureauId } },
        });
        if (!membership)
          throw new ForbiddenException('Ce collaborateur ne fait pas partie de ce bureau');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const projet = await tx.projet.create({
        data: {
          nom: dto.projetNom,
          bureauId: organizer.bureauId,
          proprietaireId: organizer.proprietaireId,
        },
      });

      await tx.tache.createMany({
        data: dto.taches.map((t) => ({
          projetId: projet.id,
          titre: t.titre,
          description: t.description,
          priorite: t.priorite,
          assigneAId: organizer.proprietaireId ?? t.assigneAId,
          assigneParId: organizer.proprietaireId ?? (t.assigneAId ? user.userId : undefined),
        })),
      });

      return tx.projet.findUniqueOrThrow({
        where: { id: projet.id },
        include: { taches: { include: TACHE_INCLUDE } },
      });
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
