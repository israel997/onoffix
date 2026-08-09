-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "fichier_nom" TEXT,
ADD COLUMN     "fichier_taille_octets" INTEGER,
ADD COLUMN     "fichier_type" TEXT,
ADD COLUMN     "fichier_url" TEXT,
ALTER COLUMN "contenu" DROP NOT NULL;

