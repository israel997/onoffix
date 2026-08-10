-- AlterTable
ALTER TABLE "projets" ADD COLUMN     "proprietaire_id" TEXT,
ALTER COLUMN "bureau_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "projets_proprietaire_id_idx" ON "projets"("proprietaire_id");

-- AddForeignKey
ALTER TABLE "projets" ADD CONSTRAINT "projets_proprietaire_id_fkey" FOREIGN KEY ("proprietaire_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A project is either bureau-owned (regular projects and bureau organizers)
-- or personally-owned (personal organizer), never both, never neither.
ALTER TABLE "projets" ADD CONSTRAINT "projets_bureau_ou_personnel_check" CHECK (
  (est_organizer = false AND bureau_id IS NOT NULL AND proprietaire_id IS NULL)
  OR (est_organizer = true AND bureau_id IS NOT NULL AND proprietaire_id IS NULL)
  OR (est_organizer = true AND bureau_id IS NULL AND proprietaire_id IS NOT NULL)
);

-- At most one personal Organizer per user, enforced at the database level.
CREATE UNIQUE INDEX "projets_proprietaire_id_organizer_unique" ON "projets" ("proprietaire_id") WHERE "est_organizer" = true;
