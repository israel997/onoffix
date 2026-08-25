-- CreateEnum
CREATE TYPE "NiveauAlerte" AS ENUM ('AUCUNE', 'ORANGE', 'ROUGE');

-- AlterTable
ALTER TABLE "bureaux" ADD COLUMN     "alerte_jusqua" TIMESTAMP(3),
ADD COLUMN     "niveau_alerte" "NiveauAlerte" NOT NULL DEFAULT 'AUCUNE';
