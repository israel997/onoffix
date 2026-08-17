import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ORGANIZER_PROCESS_JOB, ORGANIZER_QUEUE } from './organizer.constants';

// BullMQ v5 rejects custom job IDs containing ":" (reserved for its own key
// namespacing) — the subject id alone is already unique within this queue.
function debounceJobId(subjectId: string) {
  return subjectId;
}

/**
 * Déclenche la génération de tâches d'un Subject ~30s après son dernier
 * message (debounce) : chaque nouveau message repousse l'échéance, au lieu
 * du poll fixe toutes les 30 minutes utilisé auparavant.
 */
@Injectable()
export class OrganizerScheduler {
  private readonly logger = new Logger(OrganizerScheduler.name);

  constructor(
    @InjectQueue(ORGANIZER_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Reprogramme l'échéance de génération d'un Subject à ~30s dans le futur. */
  async debounceSubject(subjectId: string) {
    const seconds = this.config.get<number>('ORGANIZER_DEBOUNCE_SECONDS', 30);
    const id = debounceJobId(subjectId);

    const existing = await this.queue.getJob(id);
    if (existing) {
      try {
        await existing.remove();
      } catch {
        // Déjà en cours de traitement : un nouveau cycle sera programmé une
        // fois celui-ci terminé (prochain message → prochain debounce).
        return;
      }
    }

    await this.queue.add(
      ORGANIZER_PROCESS_JOB,
      { subjectId },
      {
        jobId: id,
        delay: seconds * 1000,
        // En cas de panne IA transitoire (503/429), le processor relance
        // l'erreur — BullMQ réessaie ce job plutôt que de perdre les messages.
        attempts: 4,
        backoff: { type: 'exponential', delay: 10_000 },
      },
    );
  }

  async cancelSubject(subjectId: string) {
    const existing = await this.queue.getJob(debounceJobId(subjectId));
    if (!existing) return;
    try {
      await existing.remove();
    } catch (error) {
      this.logger.warn(`Impossible d'annuler le job du Subject ${subjectId}: ${error}`);
    }
  }

  /** Annule les échéances en attente de tous les Subjects de cet Organizer. */
  async cancel(projetId: string) {
    const subjects = await this.prisma.conversation.findMany({
      where: { projetId },
      select: { id: true },
    });
    await Promise.all(subjects.map((s) => this.cancelSubject(s.id)));
  }
}
