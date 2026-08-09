import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AssignTacheDto } from './dto/assign-tache.dto';
import { ValiderTacheDto } from './dto/valider-tache.dto';
import { TachesService } from './taches.service';

@Controller('taches/:tacheId')
export class TachesController {
  constructor(private readonly tachesService: TachesService) {}

  @Patch('assigner')
  assigner(
    @Param('tacheId') tacheId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignTacheDto,
  ) {
    return this.tachesService.assigner(tacheId, user, dto.userId);
  }

  @Post('demarrer')
  demarrer(@Param('tacheId') tacheId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tachesService.demarrer(tacheId, user);
  }

  @Post('declarer')
  declarer(@Param('tacheId') tacheId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tachesService.declarer(tacheId, user);
  }

  @Post('valider')
  valider(
    @Param('tacheId') tacheId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ValiderTacheDto,
  ) {
    return this.tachesService.valider(tacheId, user, dto.decision);
  }
}
