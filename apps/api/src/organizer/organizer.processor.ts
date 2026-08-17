import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiService, type SuggestedTask } from '../ai/ai.service';
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
      await this.prisma.tache.createMany({
        data: suggestions.map((s) => ({
          projetId: message.conversation.projetId!,
          conversationId: message.conversationId,
          titre: s.titre,
          description: s.description,
          // Organizer personnel : les tâches générées s'assignent directement au propriétaire.
          assigneAId: message.conversation.projet!.proprietaireId ?? undefined,
          assigneParId: message.conversation.projet!.proprietaireId ?? undefined,
        })),
      });
    }

    await this.prisma.conversation.update({
      where: { id: message.conversationId },
      data: { derniereGenerationTaches: new Date() },
    });

    this.logger.log(`Message ${messageId}: ${suggestions.length} tâche(s) générée(s)`);
  }
}
