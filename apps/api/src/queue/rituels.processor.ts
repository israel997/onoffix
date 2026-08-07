import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RITUELS_QUEUE, RituelJob } from './queue.constants';

/**
 * Traite les rituels automatisés du bureau (cf. 2.4 du cahier des charges).
 * La logique métier (requêtes Prisma, envoi de notifications) sera branchée
 * au fur et à mesure de l'implémentation des modules Reporting/Notifications.
 */
@Processor(RITUELS_QUEUE)
export class RituelsProcessor extends WorkerHost {
  private readonly logger = new Logger(RituelsProcessor.name);

  process(job: Job<{ bureauId: string }>): Promise<void> {
    switch (job.name as RituelJob) {
      case RituelJob.RAPPEL_DECLARATION:
        this.logger.log(`Rappel de déclaration — bureau ${job.data.bureauId}`);
        break;
      case RituelJob.RELANCE_RETARD:
        this.logger.log(`Relance de retard — bureau ${job.data.bureauId}`);
        break;
      case RituelJob.VALIDATION_LENDEMAIN:
        this.logger.log(`Validation du lendemain — bureau ${job.data.bureauId}`);
        break;
      case RituelJob.RESUME_QUOTIDIEN:
        this.logger.log(`Résumé quotidien — bureau ${job.data.bureauId}`);
        break;
      case RituelJob.RAPPORT_HEBDOMADAIRE:
        this.logger.log(`Rapport hebdomadaire — bureau ${job.data.bureauId}`);
        break;
      default:
        this.logger.warn(`Job inconnu: ${job.name}`);
    }
    return Promise.resolve();
  }
}
