import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ORGANIZER_PROCESS_JOB, ORGANIZER_QUEUE } from './organizer.constants';

/**
 * Chaque message d'un Subject déclenche son propre traitement IA, indépendamment
 * des autres — pas de fenêtre d'accumulation : un message = une unité de travail.
 */
@Injectable()
export class OrganizerScheduler {
  constructor(@InjectQueue(ORGANIZER_QUEUE) private readonly queue: Queue) {}

  async scheduleMessageProcessing(messageId: string) {
    await this.queue.add(
      ORGANIZER_PROCESS_JOB,
      { messageId },
      {
        jobId: messageId,
        // Panne IA transitoire (503/429) : le processor relance l'erreur,
        // BullMQ réessaie ce message plutôt que de le perdre.
        attempts: 4,
        backoff: { type: 'exponential', delay: 10_000 },
      },
    );
  }

  /**
   * Relance les messages de ce Subject dont le traitement a définitivement échoué
   * (ex. panne Gemini prolongée) — jobId = messageId, donc un job déjà réussi ou
   * encore en cours n'est jamais retouché.
   */
  async retryFailedProcessing(messageIds: string[]) {
    for (const messageId of messageIds) {
      const job = await this.queue.getJob(messageId);
      if (job && (await job.isFailed())) {
        await job.retry();
      }
    }
  }
}
