import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ArchiveRapportDto } from './dto/archive-rapport.dto';
import { CreateRapportDto } from './dto/create-rapport.dto';
import { UpdateRapportDto } from './dto/update-rapport.dto';
import { VisibiliteRapportDto } from './dto/visibilite-rapport.dto';
import { rapportImageMulterOptions } from './rapport-file.config';
import { RapportsService } from './rapports.service';

@Controller('rapports')
export class RapportsController {
  constructor(private readonly rapportsService: RapportsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('archived') archived?: string) {
    return this.rapportsService.list(user, archived === 'true');
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRapportDto) {
    return this.rapportsService.create(user, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.rapportsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRapportDto,
  ) {
    return this.rapportsService.update(id, user, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.rapportsService.remove(id, user);
  }

  @Patch(':id/archive')
  archive(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ArchiveRapportDto,
  ) {
    return this.rapportsService.setArchive(id, user, dto.archived);
  }

  @Patch(':id/visibilite')
  visibilite(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VisibiliteRapportDto,
  ) {
    return this.rapportsService.setVisibilite(id, user, dto.prive);
  }

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file', rapportImageMulterOptions))
  addImage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('jourId') jourId?: string,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    return this.rapportsService.addImage(id, user, jourId, file);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(204)
  async removeImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.rapportsService.removeImage(id, imageId, user);
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const { buffer, filename } = await this.rapportsService.generatePdf(id, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}
