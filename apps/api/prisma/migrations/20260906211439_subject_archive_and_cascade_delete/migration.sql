-- DropForeignKey
ALTER TABLE "taches" DROP CONSTRAINT "taches_conversation_id_fkey";

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "est_archive" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "taches" ADD CONSTRAINT "taches_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
