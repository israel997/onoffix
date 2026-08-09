import { Body, Controller, Get, Post } from '@nestjs/common';
import { RoleGlobal } from '@prisma/client';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AddOrganisationMembreDto } from './dto/add-organisation-membre.dto';
import { OrganisationService } from './organisation.service';

@Controller('organisation')
export class OrganisationController {
  constructor(private readonly organisationService: OrganisationService) {}

  @Get('membres')
  listMembres(@CurrentUser() user: AuthenticatedUser) {
    return this.organisationService.listMembres(user.organisationId);
  }

  @Roles(RoleGlobal.ADMIN)
  @Post('membres')
  addMembre(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddOrganisationMembreDto) {
    return this.organisationService.addMembre(user.organisationId, dto);
  }
}
