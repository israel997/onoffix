import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Bureau } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RITUELS_QUEUE, RituelJob } from './queue.constants';

/**
 * Programme les jobs récurrents par bureau (rappel, relance, résumé,
 * rapport hebdo) selon les paramètres définis en 2.4/2.6. À rappeler
 * (syncBureau) chaque fois que le manager modifie les réglages du bureau.
 */
@Injectable()
export class RituelsScheduler implements OnModuleInit {
  private readonly logger = new Logger(RituelsScheduler.name);

  constructor(
    @InjectQueue(RITUELS_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    try {
      const bureaux = await this.prisma.bureau.findMany();
      await Promise.all(bureaux.map((bureau) => this.syncBureau(bureau)));
      this.logger.log(`Rituels programmés pour ${bureaux.length} bureau(x)`);
    } catch (error) {
      // Ne bloque pas le démarrage de l'API si Redis est indisponible
      // (ex. en dev sans `docker compose up`) — les rituels seront
      // reprogrammés au prochain redémarrage une fois Redis accessible.
      this.logger.warn(`Impossible de programmer les rituels au démarrage: ${error}`);
    }
  }

  async syncBureau(bureau: Bureau) {
    const [heure, minute] = bureau.heureDeclaration.split(':').map(Number);
    const tz = bureau.fuseauHoraire;

    await this.queue.add(
      RituelJob.RAPPEL_DECLARATION,
      { bureauId: bureau.id },
      {
        jobId: `${bureau.id}:rappel`,
        repeat: { pattern: `${minute} ${heure} * * *`, tz },
      },
    );

    await this.queue.add(
      RituelJob.RELANCE_RETARD,
      { bureauId: bureau.id },
      {
        jobId: `${bureau.id}:relance`,
        repeat: {
          pattern: cronPlusMinutes(heure, minute, bureau.delaiRelanceMinutes),
          tz,
        },
      },
    );

    await this.queue.add(
      RituelJob.VALIDATION_LENDEMAIN,
      { bureauId: bureau.id },
      { jobId: `${bureau.id}:validation`, repeat: { pattern: '0 8 * * *', tz } },
    );

    await this.queue.add(
      RituelJob.RESUME_QUOTIDIEN,
      { bureauId: bureau.id },
      { jobId: `${bureau.id}:resume`, repeat: { pattern: '0 20 * * *', tz } },
    );

    await this.queue.add(
      RituelJob.RAPPORT_HEBDOMADAIRE,
      { bureauId: bureau.id },
      { jobId: `${bureau.id}:rapport`, repeat: { pattern: '0 8 * * 1', tz } },
    );
  }
}

function cronPlusMinutes(heure: number, minute: number, delaiMinutes: number): string {
  const total = heure * 60 + minute + delaiMinutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${m} ${h} * * *`;
}
