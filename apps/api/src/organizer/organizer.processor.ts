import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { ORGANIZER_QUEUE } from './organizer.constants';

/**
 * Relit les messages d'un Subject (Conversation) d'Organizer depuis la
 * dernière génération et les transforme en tâches via l'IA. Les tâches
 * s'accumulent — rien n'est écrasé d'un cycle à l'autre (cf. phase C).
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

  async process(job: Job<{ subjectId: string }>): Promise<void> {
    const { subjectId } = job.data;

    const subject = await this.prisma.conversation.findUnique({
      where: { id: subjectId },
      include: { projet: true },
    });
    if (!subject || !subject.projet?.estOrganizer) return;

    const now = new Date();

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: subjectId,
        createdAt: subject.derniereGenerationTaches
          ? { gt: subject.derniereGenerationTaches }
          : undefined,
      },
      orderBy: { createdAt: 'asc' },
      include: { auteur: { select: { nom: true } } },
    });

    if (messages.length === 0) {
      await this.prisma.conversation.update({
        where: { id: subjectId },
        data: { derniereGenerationTaches: now },
      });
      return;
    }

    const texte = messages.map((m) => `${m.auteur.nom}: ${m.contenu}`).join('\n');
    const suggestions = await this.aiService.suggestTasks(texte);

    if (suggestions.length > 0) {
      await this.prisma.tache.createMany({
        data: suggestions.map((s) => ({
          projetId: subject.projetId!,
          conversationId: subjectId,
          titre: s.titre,
          description: s.description,
          // Organizer personnel : les tâches générées s'assignent directement au propriétaire.
          assigneAId: subject.projet!.proprietaireId ?? undefined,
          assigneParId: subject.projet!.proprietaireId ?? undefined,
        })),
      });
    }

    await this.prisma.conversation.update({
      where: { id: subjectId },
      data: { derniereGenerationTaches: now },
    });
    this.logger.log(
      `Subject ${subjectId}: ${suggestions.length} tâche(s) générée(s) depuis ${messages.length} message(s)`,
    );
  }
}
