import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleBureau, RoleGlobal } from '@prisma/client';
import { memoryStorage } from 'multer';
import { BureauxService } from './bureaux.service';
import { BureauRole } from '../common/decorators/bureau-role.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BureauRoleGuard } from '../common/guards/bureau-role.guard';
import { StorageService } from '../common/storage.service';
import { AddMembreDto } from './dto/add-membre.dto';
import { CreateBureauDto } from './dto/create-bureau.dto';
import { ReorderBureauxDto } from './dto/reorder-bureaux.dto';
import { UpdateBureauDto } from './dto/update-bureau.dto';
import { UpdateMembreDto } from './dto/update-membre.dto';
import { UpdateParametresDto } from './dto/update-parametres.dto';

const ANY_MEMBER = [RoleBureau.MANAGER, RoleBureau.COLLABORATEUR];
const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2 Mo — juste une photo de bureau, pas un fichier lourd
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

@UseGuards(BureauRoleGuard)
@Controller('bureaux')
export class BureauxController {
  constructor(
    private readonly bureauxService: BureauxService,
    private readonly storage: StorageService,
  ) {}

  @Roles(RoleGlobal.ADMIN)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBureauDto) {
    return this.bureauxService.create(user.organisationId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.bureauxService.findAllForUser(user);
  }

  @Get('invitations/mine')
  listMyInvitations(@CurrentUser() user: AuthenticatedUser) {
    return this.bureauxService.listMyInvitations(user.userId);
  }

  @Post('invitations/:invitationId/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bureauxService.acceptInvitation(invitationId, user.userId);
  }

  @Post('invitations/:invitationId/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  declineInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bureauxService.declineInvitation(invitationId, user.userId);
  }

  @Roles(RoleGlobal.ADMIN)
  @Patch('reordonner')
  reorder(@CurrentUser() user: AuthenticatedUser, @Body() dto: ReorderBureauxDto) {
    return this.bureauxService.reorder(user.organisationId, dto);
  }

  @BureauRole(...ANY_MEMBER)
  @Get(':bureauId')
  findOne(@Param('bureauId') bureauId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bureauxService.findOne(bureauId, user);
  }

  @BureauRole(...ANY_MEMBER)
  @Get(':bureauId/stats')
  getStats(@Param('bureauId') bureauId: string) {
    return this.bureauxService.getStats(bureauId);
  }

  @BureauRole(RoleBureau.MANAGER)
  @Patch(':bureauId')
  update(
    @Param('bureauId') bureauId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBureauDto,
  ) {
    return this.bureauxService.update(bureauId, user.organisationId, dto);
  }

  @BureauRole(RoleBureau.MANAGER)
  @Patch(':bureauId/parametres')
  updateParametres(
    @Param('bureauId') bureauId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateParametresDto,
  ) {
    return this.bureauxService.updateParametres(bureauId, user.organisationId, dto);
  }

  @Roles(RoleGlobal.ADMIN)
  @Delete(':bureauId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('bureauId') bureauId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bureauxService.remove(bureauId, user.organisationId);
  }

  @BureauRole(RoleBureau.MANAGER)
  @Post(':bureauId/photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PHOTO_SIZE },
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
  async uploadPhoto(
    @Param('bureauId') bureauId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    const url = await this.storage.upload(file.buffer, 'bureaux', file.originalname, file.mimetype);
    return this.bureauxService.setPhoto(bureauId, user.organisationId, url);
  }

  @BureauRole(RoleBureau.MANAGER)
  @Delete(':bureauId/photo')
  removePhoto(@Param('bureauId') bureauId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bureauxService.setPhoto(bureauId, user.organisationId, null);
  }

  @BureauRole(RoleBureau.MANAGER)
  @Post(':bureauId/membres')
  addMembre(
    @Param('bureauId') bureauId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddMembreDto,
  ) {
    return this.bureauxService.addMembre(bureauId, user.organisationId, dto, user);
  }

  @BureauRole(RoleBureau.MANAGER)
  @Get(':bureauId/invitations')
  listInvitations(@Param('bureauId') bureauId: string) {
    return this.bureauxService.listInvitations(bureauId);
  }

  @BureauRole(RoleBureau.MANAGER)
  @Delete(':bureauId/invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelInvitation(
    @Param('bureauId') bureauId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.bureauxService.cancelInvitation(bureauId, invitationId);
  }

  @BureauRole(RoleBureau.MANAGER)
  @Patch(':bureauId/membres/:userId')
  updateMembre(
    @Param('bureauId') bureauId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMembreDto,
  ) {
    return this.bureauxService.updateMembre(bureauId, userId, dto);
  }

  @BureauRole(RoleBureau.MANAGER)
  @Delete(':bureauId/membres/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMembre(@Param('bureauId') bureauId: string, @Param('userId') userId: string) {
    return this.bureauxService.removeMembre(bureauId, userId);
  }
}
