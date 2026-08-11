import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { OrganizerModule } from '../organizer/organizer.module';
import { OrganisationController } from './organisation.controller';
import { OrganisationService } from './organisation.service';

@Module({
  imports: [OrganizerModule, EmailModule],
  controllers: [OrganisationController],
  providers: [OrganisationService],
})
export class OrganisationModule {}
