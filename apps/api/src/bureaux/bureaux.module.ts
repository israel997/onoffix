import { Module } from '@nestjs/common';
import { OrganizerModule } from '../organizer/organizer.module';
import { QueueModule } from '../queue/queue.module';
import { BureauxController } from './bureaux.controller';
import { BureauxService } from './bureaux.service';

@Module({
  imports: [QueueModule, OrganizerModule],
  controllers: [BureauxController],
  providers: [BureauxService],
  exports: [BureauxService],
})
export class BureauxModule {}
