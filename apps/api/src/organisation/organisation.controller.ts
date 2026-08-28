import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleGlobal } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { StorageService } from '../common/storage.service';
import { AddOrganisationMembreDto } from './dto/add-organisation-membre.dto';
import { UpdateMembrePosteDto } from './dto/update-membre-poste.dto';
import { UpdateMembreRoleDto } from './dto/update-membre-role.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { OrganisationService } from './organisation.service';

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 Mo
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

@Controller('organisation')
export class OrganisationController {
  constructor(
    private readonly organisationService: OrganisationService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  findOne(@CurrentUser() user: AuthenticatedUser) {
    return this.organisationService.findOne(user.organisationId);
  }

  @Roles(RoleGlobal.ADMIN)
  @Patch()
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOrganisationDto) {
    return this.organisationService.updateNom(user.organisationId, dto);
  }

  @Get('membres')
  listMembres(@CurrentUser() user: AuthenticatedUser) {
    return this.organisationService.listMembres(user.organisationId);
  }

  @Get('stats')
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.organisationService.getStats(user.organisationId);
  }

  @Get('membres/:userId/stats')
  getMembreStats(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // Voir les stats de quelqu'un d'autre est réservé aux admins — sinon n'importe
    // quel membre pourrait consulter la performance de n'importe qui d'autre.
    if (userId !== user.userId && user.roleGlobal !== RoleGlobal.ADMIN) {
      throw new ForbiddenException('Vous ne pouvez consulter que vos propres statistiques');
    }
    const range = from && to ? { from: new Date(from), to: new Date(to) } : undefined;
    return this.organisationService.getMembreStats(user.organisationId, userId, range);
  }

  @Get('membres/:userId/journal')
  getMembreJournal(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (userId !== user.userId && user.roleGlobal !== RoleGlobal.ADMIN) {
      throw new ForbiddenException('Vous ne pouvez consulter que votre propre journal');
    }
    return this.organisationService.getMembreJournal(
      user.organisationId,
      userId,
      new Date(from),
      new Date(to),
    );
  }

  @Roles(RoleGlobal.ADMIN)
  @Post('membres')
  addMembre(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddOrganisationMembreDto) {
    return this.organisationService.addMembre(user.organisationId, dto, user);
  }

  @Roles(RoleGlobal.ADMIN)
  @Patch('membres/:userId/role')
  updateMembreRole(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMembreRoleDto,
  ) {
    return this.organisationService.updateMembreRole(user.organisationId, userId, user, dto);
  }

  @Roles(RoleGlobal.ADMIN)
  @Patch('membres/:userId/poste')
  updateMembrePoste(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMembrePosteDto,
  ) {
    return this.organisationService.updateMembrePoste(user.organisationId, userId, dto);
  }

  @Roles(RoleGlobal.ADMIN)
  @Delete('membres/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMembre(@Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organisationService.removeMembre(user.organisationId, userId, user);
  }

  @Roles(RoleGlobal.ADMIN)
  @Get('invitations')
  listInvitations(@CurrentUser() user: AuthenticatedUser) {
    return this.organisationService.listInvitations(user.organisationId);
  }

  @Roles(RoleGlobal.ADMIN)
  @Delete('invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organisationService.cancelInvitation(user.organisationId, invitationId);
  }

  @Roles(RoleGlobal.ADMIN)
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_LOGO_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          cb(
            new BadRequestException('Format d’image non supporté (PNG, JPEG ou WebP uniquement)'),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadLogo(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    const url = await this.storage.upload(
      file.buffer,
      'organisation',
      file.originalname,
      file.mimetype,
    );
    return this.organisationService.setLogo(user.organisationId, url);
  }

  @Roles(RoleGlobal.ADMIN)
  @Delete('logo')
  removeLogo(@CurrentUser() user: AuthenticatedUser) {
    return this.organisationService.setLogo(user.organisationId, null);
  }

  @Roles(RoleGlobal.ADMIN)
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser) {
    return this.organisationService.remove(user.organisationId, user);
  }
}
