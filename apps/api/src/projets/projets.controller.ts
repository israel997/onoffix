import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleBureau } from '@prisma/client';
import { BureauRole } from '../common/decorators/bureau-role.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { BureauRoleGuard } from '../common/guards/bureau-role.guard';
import { ProjetAccessGuard } from '../common/guards/projet-access.guard';
import { CreateProjetDto } from './dto/create-projet.dto';
import { CreateProjetTacheDto } from './dto/create-projet-tache.dto';
import { UpdateProjetDto } from './dto/update-projet.dto';
import { ProjetsService } from './projets.service';

const ANY_MEMBER = [RoleBureau.MANAGER, RoleBureau.COLLABORATEUR];

@UseGuards(BureauRoleGuard)
@Controller('bureaux/:bureauId/projets')
export class BureauProjetsController {
  constructor(private readonly projetsService: ProjetsService) {}

  @BureauRole(RoleBureau.MANAGER)
  @Post()
  create(
    @Param('bureauId') bureauId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProjetDto,
  ) {
    return this.projetsService.create(bureauId, user, dto);
  }

  @BureauRole(...ANY_MEMBER)
  @Get()
  list(@Param('bureauId') bureauId: string) {
    return this.projetsService.listForBureau(bureauId);
  }
}

@UseGuards(ProjetAccessGuard)
@Controller('projets/:projetId')
export class ProjetsController {
  constructor(private readonly projetsService: ProjetsService) {}

  @Get()
  findOne(@Param('projetId') projetId: string) {
    return this.projetsService.findOne(projetId);
  }

  @Get('stats')
  getStats(@Param('projetId') projetId: string) {
    return this.projetsService.getStats(projetId);
  }

  @Get('rapport')
  getRapport(@Param('projetId') projetId: string) {
    return this.projetsService.genererRapport(projetId);
  }

  @Patch()
  update(
    @Param('projetId') projetId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProjetDto,
  ) {
    return this.projetsService.update(projetId, user, dto);
  }

  @Delete()
  remove(@Param('projetId') projetId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projetsService.remove(projetId, user);
  }

  @Post('taches')
  createTache(
    @Param('projetId') projetId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProjetTacheDto,
  ) {
    return this.projetsService.createTache(projetId, user, dto);
  }
}
