import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from './storage.service';

@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get('download')
  async download(@Query('url') url: string, @Query('name') name: string, @Res() res: Response) {
    if (!url) throw new BadRequestException('url manquante');
    await this.storage.pipeDownload(url, name || 'file', res);
  }
}
