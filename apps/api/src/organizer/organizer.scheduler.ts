import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ORGANIZER_PROCESS_JOB, ORGANIZER_QUEUE } from './organizer.constants';

function jobId(projetId: string) {
  return `organizer:${projetId}`;
}

/** Programme/annule le job récurrent de génération de tâches (toutes les N heures) par Organizer. */
@Injectable()
export class OrganizerScheduler implements OnModuleInit {
  private readonly logger = new Logger(OrganizerScheduler.name);

  constructor(
    @InjectQueue(ORGANIZER_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      const organizers = await this.prisma.projet.findMany({
        where: { estOrganizer: true },
        select: { id: true },
      });
      await Promise.all(organizers.map((o) => this.schedule(o.id)));
      this.logger.log(`Génération de tâches programmée pour ${organizers.length} organizer(s)`);
    } catch (error) {
      this.logger.warn(`Impossible de programmer les organizers au démarrage: ${error}`);
    }
  }

  async schedule(projetId: string) {
    const hours = this.config.get<number>('ORGANIZER_INTERVAL_HOURS', 4);
    await this.queue.add(
      ORGANIZER_PROCESS_JOB,
      { projetId },
      { jobId: jobId(projetId), repeat: { every: hours * 60 * 60 * 1000 } },
    );
  }

  async cancel(projetId: string) {
    const jobs = await this.queue.getRepeatableJobs();
    const match = jobs.find((job) => job.id === jobId(projetId));
    if (match) await this.queue.removeRepeatableByKey(match.key);
  }
}
