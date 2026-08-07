import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RITUELS_QUEUE } from './queue.constants';
import { RituelsProcessor } from './rituels.processor';
import { RituelsScheduler } from './rituels.scheduler';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue({ name: RITUELS_QUEUE }),
  ],
  providers: [RituelsProcessor, RituelsScheduler],
})
export class QueueModule {}
