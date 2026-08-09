import { randomUUID } from 'crypto';
import { unlink } from 'fs/promises';
import { extname } from 'path';
import type { Request } from 'express';
import { BadRequestException } from '@nestjs/common';
import { diskStorage, type FileFilterCallback } from 'multer';
import { MESSAGES_UPLOADS_DIR } from '../common/uploads';

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 Mo — plafond général, tous types de fichiers
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 Mo — les images ne doivent pas être "lourdes"

export const messageFileMulterOptions = {
  storage: diskStorage({
    destination: MESSAGES_UPLOADS_DIR,
    filename: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void,
    ) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('video/')) {
      cb(new BadRequestException('Les vidéos ne sont pas autorisées en pièce jointe'));
      return;
    }
    cb(null, true);
  },
};

/** Vérifie le poids d'une image après écriture sur disque (multer ne connaît pas la taille finale avant coup). */
export async function assertImageWeight(file: Express.Multer.File) {
  if (file.mimetype.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
    await unlink(file.path).catch(() => undefined);
    throw new BadRequestException('Image trop lourde (5 Mo maximum)');
  }
}
