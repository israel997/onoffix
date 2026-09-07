import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueueModule } from '../queue/queue.module';
import { BureauTachesController, MesTachesController, TachesController } from './taches.controller';
import { TachesService } from './taches.service';

@Module({
  imports: [NotificationsModule, QueueModule],
  controllers: [MesTachesController, TachesController, BureauTachesController],
  providers: [TachesService],
})
export class TachesModule {}
