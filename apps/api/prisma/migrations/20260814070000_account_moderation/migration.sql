-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "banned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pays" TEXT,
ADD COLUMN     "restricted" BOOLEAN NOT NULL DEFAULT false;

