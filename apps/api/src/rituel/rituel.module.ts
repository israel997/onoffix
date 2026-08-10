import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { BureauRituelController, RituelController } from './rituel.controller';
import { RituelService } from './rituel.service';

@Module({
  imports: [NotificationsModule],
  controllers: [RituelController, BureauRituelController],
  providers: [RituelService],
})
export class RituelModule {}
