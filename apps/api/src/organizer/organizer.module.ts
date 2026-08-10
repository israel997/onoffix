import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ChatModule } from '../chat/chat.module';
import {
  BureauOrganizersController,
  OrganizerController,
  PersonalOrganizerController,
} from './organizer.controller';
import { ORGANIZER_QUEUE } from './organizer.constants';
import { OrganizerProcessor } from './organizer.processor';
import { OrganizerScheduler } from './organizer.scheduler';
import { OrganizerService } from './organizer.service';

@Module({
  imports: [BullModule.registerQueue({ name: ORGANIZER_QUEUE }), AiModule, ChatModule],
  controllers: [BureauOrganizersController, OrganizerController, PersonalOrganizerController],
  providers: [OrganizerService, OrganizerScheduler, OrganizerProcessor],
  exports: [OrganizerService, OrganizerScheduler],
})
export class OrganizerModule {}
