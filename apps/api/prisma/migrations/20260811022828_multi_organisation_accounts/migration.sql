-- Multi-organisation support: introduce Account as the login identity,
-- separate from User which becomes a per-organisation membership.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateTable
CREATE TABLE "accounts" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- Backfill: one account per existing user (today's data is already 1:1 email<->user)
INSERT INTO "accounts" ("id", "email", "password_hash", "created_at")
SELECT gen_random_uuid()::text, "email", "password_hash", "created_at" FROM "users";

-- AlterTable: link users to accounts
ALTER TABLE "users" ADD COLUMN "account_id" TEXT;

UPDATE "users" u SET "account_id" = a."id" FROM "accounts" a WHERE a."email" = u."email";

ALTER TABLE "users" ALTER COLUMN "account_id" SET NOT NULL;

ALTER TABLE "users" ADD CONSTRAINT "users_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Password now lives solely on accounts; email is no longer globally unique on users
-- (the same person can have one membership row per organisation, sharing one account).
ALTER TABLE "users" DROP COLUMN "password_hash";

DROP INDEX IF EXISTS "users_email_key";

CREATE UNIQUE INDEX "users_account_id_organisation_id_key" ON "users"("account_id", "organisation_id");

CREATE INDEX "users_account_id_idx" ON "users"("account_id");
