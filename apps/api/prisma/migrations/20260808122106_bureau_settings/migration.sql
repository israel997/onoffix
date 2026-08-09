-- CreateEnum
CREATE TYPE "CouleurBureau" AS ENUM ('BLUE', 'PURPLE', 'GREEN', 'AMBER', 'PINK', 'SLATE');

-- AlterTable
ALTER TABLE "bureaux" ADD COLUMN     "couleur" "CouleurBureau" NOT NULL DEFAULT 'BLUE',
ADD COLUMN     "ordre" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "photo_url" TEXT;
