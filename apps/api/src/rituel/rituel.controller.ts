import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RoleBureau } from '@prisma/client';
import { BureauRole } from '../common/decorators/bureau-role.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { BureauRoleGuard } from '../common/guards/bureau-role.guard';
import { RituelService } from './rituel.service';

@Controller('rituel')
export class RituelController {
  constructor(private readonly rituelService: RituelService) {}

  /** Qui a validé quoi aujourd'hui — un membre voit ses bureaux, un admin voit tout. */
  @Get('validations-aujourdhui')
  validationsAujourdhui(@CurrentUser() user: AuthenticatedUser) {
    return this.rituelService.getValidationsAujourdhui(user);
  }
}

@UseGuards(BureauRoleGuard)
@Controller('bureaux/:bureauId/rituel')
export class BureauRituelController {
  constructor(private readonly rituelService: RituelService) {}

  @BureauRole(RoleBureau.MANAGER, RoleBureau.COLLABORATEUR)
  @Get('brief')
  brief(@Param('bureauId') bureauId: string) {
    return this.rituelService.getDailyBrief(bureauId);
  }
}
