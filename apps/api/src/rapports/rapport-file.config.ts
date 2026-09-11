import type { Request } from 'express';
import { BadRequestException } from '@nestjs/common';
import { memoryStorage, type FileFilterCallback } from 'multer';
import { MAX_IMAGE_SIZE } from '../chat/chat-file.config';

export const rapportImageMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new BadRequestException('Seules les images sont autorisées'));
      return;
    }
    cb(null, true);
  },
};
