-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ALERTE_TACHE';

-- AlterTable
ALTER TABLE "taches" ADD COLUMN     "alerte_a" TIMESTAMP(3);
