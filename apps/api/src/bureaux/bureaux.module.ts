import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizerModule } from '../organizer/organizer.module';
import { QueueModule } from '../queue/queue.module';
import { BureauxController } from './bureaux.controller';
import { BureauxService } from './bureaux.service';

@Module({
  imports: [QueueModule, OrganizerModule, EmailModule, NotificationsModule],
  controllers: [BureauxController],
  providers: [BureauxService],
  exports: [BureauxService],
})
export class BureauxModule {}
