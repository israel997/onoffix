import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { ORGANIZER_QUEUE } from './organizer.constants';

/**
 * Relit les messages de l'Organizer depuis la dernière génération et les
 * transforme en tâches via l'IA. Les tâches s'accumulent — rien n'est
 * écrasé d'un cycle à l'autre (cf. phase C du cahier des charges).
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

  async process(job: Job<{ projetId: string }>): Promise<void> {
    const { projetId } = job.data;

    const projet = await this.prisma.projet.findUnique({ where: { id: projetId } });
    if (!projet || !projet.estOrganizer) return;

    const conversation = await this.prisma.conversation.findUnique({ where: { projetId } });
    const now = new Date();

    if (!conversation) {
      await this.prisma.projet.update({
        where: { id: projetId },
        data: { derniereGenerationTaches: now },
      });
      return;
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        createdAt: projet.derniereGenerationTaches
          ? { gt: projet.derniereGenerationTaches }
          : undefined,
      },
      orderBy: { createdAt: 'asc' },
      include: { auteur: { select: { nom: true } } },
    });

    if (messages.length === 0) {
      await this.prisma.projet.update({
        where: { id: projetId },
        data: { derniereGenerationTaches: now },
      });
      return;
    }

    const texte = messages.map((m) => `${m.auteur.nom}: ${m.contenu}`).join('\n');
    const suggestions = await this.aiService.suggestTasks(texte);

    if (suggestions.length > 0) {
      await this.prisma.tache.createMany({
        data: suggestions.map((s) => ({
          projetId,
          titre: s.titre,
          description: s.description,
          // Organizer personnel : les tâches générées s'assignent directement au propriétaire.
          assigneAId: projet.proprietaireId ?? undefined,
          assigneParId: projet.proprietaireId ?? undefined,
        })),
      });
    }

    await this.prisma.projet.update({
      where: { id: projetId },
      data: { derniereGenerationTaches: now },
    });
    this.logger.log(
      `Organizer ${projetId}: ${suggestions.length} tâche(s) générée(s) depuis ${messages.length} message(s)`,
    );
  }
}
