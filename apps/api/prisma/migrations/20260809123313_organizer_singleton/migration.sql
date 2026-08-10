-- DropForeignKey
ALTER TABLE "projets_membres" DROP CONSTRAINT "projets_membres_projet_id_fkey";

-- DropForeignKey
ALTER TABLE "projets_membres" DROP CONSTRAINT "projets_membres_user_id_fkey";

-- DropTable
DROP TABLE "projets_membres";

-- At most one Organizer project per bureau, enforced at the database level.
CREATE UNIQUE INDEX "projets_bureau_id_organizer_unique" ON "projets" ("bureau_id") WHERE "est_organizer" = true;
