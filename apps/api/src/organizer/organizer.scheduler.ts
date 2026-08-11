import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ORGANIZER_PROCESS_JOB, ORGANIZER_QUEUE } from './organizer.constants';

function jobId(subjectId: string) {
  return `organizer:${subjectId}`;
}

/** Programme/annule le job récurrent de génération de tâches (toutes les N minutes) par Subject. */
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
      const subjects = await this.prisma.conversation.findMany({
        where: { projet: { estOrganizer: true } },
        select: { id: true },
      });
      await Promise.all(subjects.map((s) => this.scheduleSubject(s.id)));
      this.logger.log(`Génération de tâches programmée pour ${subjects.length} Subject(s)`);
    } catch (error) {
      this.logger.warn(`Impossible de programmer les Subjects au démarrage: ${error}`);
    }
  }

  /** Programme tous les Subjects actuels de cet Organizer (utilisé juste après sa création). */
  async schedule(projetId: string) {
    const subjects = await this.prisma.conversation.findMany({
      where: { projetId },
      select: { id: true },
    });
    await Promise.all(subjects.map((s) => this.scheduleSubject(s.id)));
  }

  async scheduleSubject(subjectId: string) {
    const minutes = this.config.get<number>('ORGANIZER_INTERVAL_MINUTES', 30);
    await this.queue.add(
      ORGANIZER_PROCESS_JOB,
      { subjectId },
      { jobId: jobId(subjectId), repeat: { every: minutes * 60 * 1000 } },
    );
  }

  /** Annule tous les Subjects de cet Organizer (utilisé à la suppression du bureau). */
  async cancel(projetId: string) {
    const subjects = await this.prisma.conversation.findMany({
      where: { projetId },
      select: { id: true },
    });
    await Promise.all(subjects.map((s) => this.cancelSubject(s.id)));
  }

  async cancelSubject(subjectId: string) {
    const jobs = await this.queue.getRepeatableJobs();
    const match = jobs.find((job) => job.id === jobId(subjectId));
    if (match) await this.queue.removeRepeatableByKey(match.key);
  }
}
