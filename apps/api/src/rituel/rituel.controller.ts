import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RoleBureau } from '@prisma/client';
import { BureauRole } from '../common/decorators/bureau-role.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { BureauRoleGuard } from '../common/guards/bureau-role.guard';
import { DeclarerRituelDto } from './dto/declarer-rituel.dto';
import { RituelService } from './rituel.service';

@Controller('rituel')
export class RituelController {
  constructor(private readonly rituelService: RituelService) {}

  @Get('aujourdhui')
  aujourdhui(@CurrentUser() user: AuthenticatedUser) {
    return this.rituelService.getAujourdhui(user);
  }

  @Post('declarer')
  declarer(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeclarerRituelDto) {
    return this.rituelService.declarer(user, dto.tacheIds);
  }
}

@UseGuards(BureauRoleGuard)
@Controller('bureaux/:bureauId/rituel')
export class BureauRituelController {
  constructor(private readonly rituelService: RituelService) {}

  @BureauRole(RoleBureau.MANAGER)
  @Get()
  findAll(@Param('bureauId') bureauId: string) {
    return this.rituelService.getBureauRituel(bureauId);
  }

  @BureauRole(RoleBureau.MANAGER, RoleBureau.COLLABORATEUR)
  @Get('brief')
  brief(@Param('bureauId') bureauId: string) {
    return this.rituelService.getDailyBrief(bureauId);
  }

  @BureauRole(RoleBureau.MANAGER)
  @Post('membres/:userId/valider')
  valider(
    @Param('bureauId') bureauId: string,
    @Param('userId') userId: string,
    @Body() dto: DeclarerRituelDto,
  ) {
    return this.rituelService.validerMembre(bureauId, userId, dto.tacheIds);
  }
}
