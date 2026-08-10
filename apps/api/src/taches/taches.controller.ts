import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AssignTacheDto } from './dto/assign-tache.dto';
import { UpdateTacheDto } from './dto/update-tache.dto';
import { ValiderTacheDto } from './dto/valider-tache.dto';
import { TachesService } from './taches.service';

@Controller('taches')
export class MesTachesController {
  constructor(private readonly tachesService: TachesService) {}

  @Get('mes-taches')
  mesTaches(@CurrentUser() user: AuthenticatedUser) {
    return this.tachesService.mesTaches(user);
  }
}

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

  @Patch()
  modifier(
    @Param('tacheId') tacheId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTacheDto,
  ) {
    return this.tachesService.modifier(tacheId, user, dto);
  }

  @Post('accepter')
  accepter(@Param('tacheId') tacheId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tachesService.accepter(tacheId, user);
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
