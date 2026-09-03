-- AlterTable
ALTER TABLE "taches_blocages" ADD COLUMN     "signale_par_id" TEXT;

-- AddForeignKey
ALTER TABLE "taches_blocages" ADD CONSTRAINT "taches_blocages_signale_par_id_fkey" FOREIGN KEY ("signale_par_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
