-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "projet_id" TEXT,
ALTER COLUMN "bureau_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "projets" ADD COLUMN     "derniere_generation_taches" TIMESTAMP(3),
ADD COLUMN     "est_organizer" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "projets_membres" (
    "projet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projets_membres_pkey" PRIMARY KEY ("projet_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_projet_id_key" ON "conversations"("projet_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projets_membres" ADD CONSTRAINT "projets_membres_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projets_membres" ADD CONSTRAINT "projets_membres_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

