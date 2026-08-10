import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';
import { RITUELS_QUEUE } from './queue.constants';
import { RituelsProcessor } from './rituels.processor';
import { RituelsScheduler } from './rituels.scheduler';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');
        if (url) {
          const parsed = new URL(url);
          return {
            connection: {
              host: parsed.hostname,
              port: Number(parsed.port),
              username: parsed.username || undefined,
              password: parsed.password || undefined,
              tls: parsed.protocol === 'rediss:' ? {} : undefined,
            },
          };
        }
        return {
          connection: {
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
          },
        };
      },
    }),
    BullModule.registerQueue({ name: RITUELS_QUEUE }),
    NotificationsModule,
  ],
  providers: [RituelsProcessor, RituelsScheduler],
  exports: [RituelsScheduler],
})
export class QueueModule {}
