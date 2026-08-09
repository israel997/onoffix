import { join } from 'path';

/** Résolu par rapport au cwd du process — toujours apps/api quel que soit le mode de lancement (dev watch ou `node dist/src/main`). */
export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const BUREAUX_UPLOADS_DIR = join(UPLOADS_ROOT, 'bureaux');
export const MESSAGES_UPLOADS_DIR = join(UPLOADS_ROOT, 'messages');
