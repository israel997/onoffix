-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CouleurBureau" ADD VALUE 'RED';
ALTER TYPE "CouleurBureau" ADD VALUE 'ORANGE';
ALTER TYPE "CouleurBureau" ADD VALUE 'TEAL';
ALTER TYPE "CouleurBureau" ADD VALUE 'CYAN';
ALTER TYPE "CouleurBureau" ADD VALUE 'INDIGO';
ALTER TYPE "CouleurBureau" ADD VALUE 'ROSE';
