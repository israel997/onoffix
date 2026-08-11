-- Subjects: an Organizer (projet) can now have several named Conversations
-- instead of exactly one. Existing single conversation per organizer is kept
-- and renamed "General", carrying over its last-generation timestamp.

-- 1. Add nom + derniere_generation_taches to conversations
ALTER TABLE "conversations" ADD COLUMN "nom" TEXT NOT NULL DEFAULT 'General';
ALTER TABLE "conversations" ADD COLUMN "derniere_generation_taches" TIMESTAMP(3);

-- 2. Backfill derniere_generation_taches from the projet it belonged to
UPDATE "conversations" c
SET "derniere_generation_taches" = p."derniere_generation_taches"
FROM "projets" p
WHERE c."projet_id" = p."id";

-- 3. projet_id is no longer unique (many subjects per organizer)
DROP INDEX "conversations_projet_id_key";
CREATE INDEX "conversations_projet_id_idx" ON "conversations"("projet_id");

-- 4. Tasks can now reference the subject (conversation) that generated them
ALTER TABLE "taches" ADD COLUMN "conversation_id" TEXT;
CREATE INDEX "taches_conversation_id_idx" ON "taches"("conversation_id");
ALTER TABLE "taches" ADD CONSTRAINT "taches_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Drop the now-per-subject timestamp from projets
ALTER TABLE "projets" DROP COLUMN "derniere_generation_taches";
