import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MesTachesController, TachesController } from './taches.controller';
import { TachesService } from './taches.service';

@Module({
  imports: [NotificationsModule],
  controllers: [MesTachesController, TachesController],
  providers: [TachesService],
})
export class TachesModule {}
