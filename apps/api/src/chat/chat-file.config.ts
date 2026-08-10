import type { Request } from 'express';
import { BadRequestException } from '@nestjs/common';
import { memoryStorage, type FileFilterCallback } from 'multer';

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 Mo — plafond général, tous types de fichiers
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 Mo — les images ne doivent pas être "lourdes"

export const messageFileMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('video/')) {
      cb(new BadRequestException('Les vidéos ne sont pas autorisées en pièce jointe'));
      return;
    }
    cb(null, true);
  },
};

export function assertImageWeight(file: Express.Multer.File) {
  if (file.mimetype.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
    throw new BadRequestException('Image trop lourde (5 Mo maximum)');
  }
}
