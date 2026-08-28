import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationType } from '@prisma/client';
import { AiService, type SuggestedTask } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ORGANIZER_QUEUE } from './organizer.constants';

/**
 * Traite un unique message d'Organizer et le transforme en 0, 1 ou plusieurs
 * tâches via l'IA. Chaque message est une unité de travail indépendante — pas
 * d'accumulation entre messages, donc pas de risque de perdre tout un batch si
 * un seul appel IA échoue.
 */
@Processor(ORGANIZER_QUEUE)
export class OrganizerProcessor extends WorkerHost {
  private readonly logger = new Logger(OrganizerProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<{ messageId: string }>): Promise<void> {
    const { messageId } = job.data;

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        auteur: { select: { nom: true } },
        conversation: { include: { projet: true } },
      },
    });
    if (!message || !message.conversation?.projet?.estOrganizer) return;
    if (!message.contenu?.trim()) return; // pièce jointe sans texte : rien à extraire

    const texte = `${message.auteur.nom}: ${message.contenu}`;

    let suggestions: SuggestedTask[];
    try {
      suggestions = await this.aiService.suggestTasks(texte);
    } catch (error) {
      this.logger.warn(
        `Message ${messageId}: échec de la génération IA, nouvelle tentative programmée — ${error}`,
      );
      throw error; // BullMQ réessaie ce job (cf. scheduler : attempts + backoff).
    }

    if (suggestions.length > 0) {
      const projet = message.conversation.projet;
      // Organizer personnel : les tâches générées s'assignent directement au propriétaire.
      // Organizer de bureau : par défaut à l'auteur du message — c'est lui qui a écrit
      // ça, pas à l'admin de l'organisation qui n'a peut-être rien à voir là-dedans.
      const assigneeId = projet.proprietaireId ?? message.auteurId;

      await this.prisma.tache.createMany({
        data: suggestions.map((s) => ({
          projetId: message.conversation.projetId!,
          conversationId: message.conversationId,
          titre: s.titre,
          description: s.description,
          assigneAId: assigneeId,
          assigneParId: assigneeId,
        })),
      });

      if (assigneeId && !projet.proprietaireId) {
        await this.notifications.create(
          assigneeId,
          NotificationType.TACHE_ASSIGNEE,
          suggestions.length === 1
            ? `On vous a assigné la tâche « ${suggestions[0].titre} »`
            : `${suggestions.length} nouvelles tâches vous ont été assignées`,
          `/offices/${projet.bureauId}/tasks`,
        );
      }
    }

    await this.prisma.conversation.update({
      where: { id: message.conversationId },
      // Un succès efface un éventuel échec précédent affiché à l'utilisateur.
      data: { derniereGenerationTaches: new Date(), dernierEchecTraitement: null },
    });

    this.logger.log(`Message ${messageId}: ${suggestions.length} tâche(s) générée(s)`);
  }

  /**
   * Ne se déclenche qu'une fois toutes les tentatives épuisées (BullMQ appelle cet
   * event à chaque échec, y compris ceux qui seront encore réessayés) — sans ça,
   * un Subject reste bloqué sur "Not processed yet" indéfiniment sans que personne
   * ne le sache (cf. panne Gemini "503 high demand" prolongée déjà observée en prod).
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<{ messageId: string }>) {
    if (job.attemptsMade < (job.opts.attempts ?? 1)) return;

    const message = await this.prisma.message.findUnique({
      where: { id: job.data.messageId },
      select: { conversationId: true },
    });
    if (!message) return;

    await this.prisma.conversation.update({
      where: { id: message.conversationId },
      data: { dernierEchecTraitement: new Date() },
    });
  }
}
