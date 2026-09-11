import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { Job } from 'bullmq';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RITUELS_QUEUE, RituelJob } from './queue.constants';

@Processor(RITUELS_QUEUE)
export class RituelsProcessor extends WorkerHost {
  private readonly logger = new Logger(RituelsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<{ bureauId: string } | { tacheId: string }>): Promise<void> {
    switch (job.name as RituelJob) {
      case RituelJob.VALIDATION_LENDEMAIN:
        this.logger.log(
          `Validation du lendemain — bureau ${(job.data as { bureauId: string }).bureauId}`,
        );
        break;
      case RituelJob.RESUME_QUOTIDIEN:
        this.logger.log(`Résumé quotidien — bureau ${(job.data as { bureauId: string }).bureauId}`);
        break;
      case RituelJob.RAPPORT_HEBDOMADAIRE:
        this.logger.log(
          `Rapport hebdomadaire — bureau ${(job.data as { bureauId: string }).bureauId}`,
        );
        break;
      case RituelJob.ALERTE_TACHE:
        await this.alerteTache((job.data as { tacheId: string }).tacheId);
        break;
      default:
        this.logger.warn(`Job inconnu: ${job.name}`);
    }
  }

  /** Envoie la notif push de rappel programmée sur une tâche — indépendant de son statut. */
  private async alerteTache(tacheId: string) {
    const tache = await this.prisma.tache.findUnique({
      where: { id: tacheId },
      select: {
        titre: true,
        assigneAId: true,
        alerteA: true,
        projet: { select: { bureauId: true } },
      },
    });
    // Alerte annulée ou remplacée entre-temps (alerteA vidé/changé) : ne rien envoyer.
    if (!tache || !tache.alerteA || !tache.assigneAId) return;

    await this.notifications.create(
      tache.assigneAId,
      NotificationType.ALERTE_TACHE,
      `ALERT ON THIS TASK: ${tache.titre}`,
      tache.projet.bureauId ? `/offices/${tache.projet.bureauId}/tasks` : '/my-space?tab=tasks',
    );

    await this.prisma.tache.update({ where: { id: tacheId }, data: { alerteA: null } });
    this.logger.log(`Alerte tâche envoyée — ${tacheId}`);
  }
}
