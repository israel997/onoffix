-- AlterTable
ALTER TABLE "declarations_taches" ADD COLUMN     "coche_par_admin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "coche_par_membre" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "taches" ADD COLUMN     "date_cible" DATE;
