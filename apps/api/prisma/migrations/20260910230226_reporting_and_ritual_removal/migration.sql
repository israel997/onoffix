/*
  Warnings:

  - You are about to drop the `declarations_journalieres` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `declarations_taches` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "declarations_journalieres" DROP CONSTRAINT "declarations_journalieres_user_id_fkey";

-- DropForeignKey
ALTER TABLE "declarations_taches" DROP CONSTRAINT "declarations_taches_declaration_id_fkey";

-- DropForeignKey
ALTER TABLE "declarations_taches" DROP CONSTRAINT "declarations_taches_tache_id_fkey";

-- AlterTable
ALTER TABLE "taches" ADD COLUMN     "commentaire_validation" TEXT;

-- DropTable
DROP TABLE "declarations_journalieres";

-- DropTable
DROP TABLE "declarations_taches";

-- DropEnum
DROP TYPE "StatutValidationDeclaration";
