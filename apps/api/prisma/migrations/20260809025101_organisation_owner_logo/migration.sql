-- AlterTable
ALTER TABLE "organisations" ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "proprietaire_id" TEXT;

-- Backfill: the owner of an existing organisation is its earliest-created member.
UPDATE "organisations"
SET "proprietaire_id" = (
  SELECT "id" FROM "users"
  WHERE "users"."organisation_id" = "organisations"."id"
  ORDER BY "users"."created_at" ASC
  LIMIT 1
);

ALTER TABLE "organisations" ALTER COLUMN "proprietaire_id" SET NOT NULL;
