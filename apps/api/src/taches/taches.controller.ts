import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { BureauRoleGuard } from '../common/guards/bureau-role.guard';
import { BureauRole } from '../common/decorators/bureau-role.decorator';
import { RoleBureau } from '@prisma/client';
import { AssignTacheDto } from './dto/assign-tache.dto';
import { CreateBlocageDto } from './dto/create-blocage.dto';
import { UpdateTacheDto } from './dto/update-tache.dto';
import { ValiderTacheDto } from './dto/valider-tache.dto';
import { TachesService } from './taches.service';

const ANY_MEMBER = [RoleBureau.MANAGER, RoleBureau.COLLABORATEUR];

@Controller('taches')
export class MesTachesController {
  constructor(private readonly tachesService: TachesService) {}

  @Get('mes-taches')
  mesTaches(@CurrentUser() user: AuthenticatedUser) {
    return this.tachesService.mesTaches(user);
  }

  @Get('alertes')
  alertes(@CurrentUser() user: AuthenticatedUser) {
    return this.tachesService.alertes(user);
  }

  @Get('organisation')
  organisationTaches(@CurrentUser() user: AuthenticatedUser) {
    return this.tachesService.organisationTaches(user);
  }
}

@UseGuards(BureauRoleGuard)
@Controller('bureaux/:bureauId/taches')
export class BureauTachesController {
  constructor(private readonly tachesService: TachesService) {}

  @BureauRole(...ANY_MEMBER)
  @Get()
  listForBureau(@Param('bureauId') bureauId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tachesService.listForBureau(bureauId, user);
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
  declarer(
    @Param('tacheId') tacheId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('commentaire') commentaire?: string,
  ) {
    return this.tachesService.declarer(tacheId, user, commentaire);
  }

  @Post('annuler-declaration')
  annulerDeclaration(@Param('tacheId') tacheId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tachesService.annulerDeclaration(tacheId, user);
  }

  @Post('valider')
  valider(
    @Param('tacheId') tacheId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ValiderTacheDto,
  ) {
    return this.tachesService.valider(tacheId, user, dto.decision);
  }

  @Post('reouvrir')
  reouvrir(@Param('tacheId') tacheId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tachesService.reouvrir(tacheId, user);
  }

  @Get('blocages')
  listBlocages(@Param('tacheId') tacheId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tachesService.listBlocages(tacheId, user);
  }

  @Post('blocages')
  creerBlocage(
    @Param('tacheId') tacheId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBlocageDto,
  ) {
    return this.tachesService.creerBlocage(tacheId, user, dto);
  }

  @Patch('blocages/:blocageId/resoudre')
  resoudreBlocage(
    @Param('tacheId') tacheId: string,
    @Param('blocageId') blocageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tachesService.resoudreBlocage(tacheId, blocageId, user);
  }

  @Get('chrono')
  chronoStatut(@Param('tacheId') tacheId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tachesService.chronoStatut(tacheId, user);
  }

  @Delete()
  @HttpCode(204)
  async supprimer(@Param('tacheId') tacheId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.tachesService.supprimer(tacheId, user);
  }
}
