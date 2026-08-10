import { Module } from '@nestjs/common';
import { OrganizerModule } from '../organizer/organizer.module';
import { OrganisationController } from './organisation.controller';
import { OrganisationService } from './organisation.service';

@Module({
  imports: [OrganizerModule],
  controllers: [OrganisationController],
  providers: [OrganisationService],
})
export class OrganisationModule {}
