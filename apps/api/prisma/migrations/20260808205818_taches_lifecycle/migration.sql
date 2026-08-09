-- AlterEnum
ALTER TYPE "StatutTache" ADD VALUE 'EN_COURS';

-- AlterTable
ALTER TABLE "taches" ADD COLUMN     "assigne_par_id" TEXT,
ADD COLUMN     "date_debut" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "taches" ADD CONSTRAINT "taches_assigne_par_id_fkey" FOREIGN KEY ("assigne_par_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

