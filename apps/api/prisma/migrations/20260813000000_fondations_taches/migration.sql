-- CreateEnum
CREATE TYPE "SanteTache" AS ENUM ('NORMAL', 'A_SURVEILLER', 'A_RISQUE', 'BLOQUEE');

-- CreateEnum
CREATE TYPE "PrioriteTache" AS ENUM ('BASSE', 'NORMALE', 'HAUTE', 'URGENTE');

-- CreateEnum
CREATE TYPE "TypeBlocage" AS ENUM ('TACHE', 'PERSONNE', 'DECISION', 'CLIENT', 'RESSOURCE', 'EXTERNE');

-- AlterTable
ALTER TABLE "taches" ADD COLUMN     "date_echeance" TIMESTAMP(3),
ADD COLUMN     "duree_estimee_minutes" INTEGER,
ADD COLUMN     "priorite" "PrioriteTache" NOT NULL DEFAULT 'NORMALE',
ADD COLUMN     "sante" "SanteTache" NOT NULL DEFAULT 'NORMAL';

-- CreateTable
CREATE TABLE "taches_blocages" (
    "id" TEXT NOT NULL,
    "tache_id" TEXT NOT NULL,
    "type" "TypeBlocage" NOT NULL,
    "cause" TEXT,
    "bloquant_tache_id" TEXT,
    "responsable_id" TEXT,
    "date_debut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_fin" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taches_blocages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taches_sessions" (
    "id" TEXT NOT NULL,
    "tache_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fin" TIMESTAMP(3),

    CONSTRAINT "taches_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "taches_blocages_tache_id_idx" ON "taches_blocages"("tache_id");

-- CreateIndex
CREATE INDEX "taches_blocages_bloquant_tache_id_idx" ON "taches_blocages"("bloquant_tache_id");

-- CreateIndex
CREATE INDEX "taches_sessions_tache_id_idx" ON "taches_sessions"("tache_id");

-- CreateIndex
CREATE INDEX "taches_sessions_user_id_idx" ON "taches_sessions"("user_id");

-- AddForeignKey
ALTER TABLE "taches_blocages" ADD CONSTRAINT "taches_blocages_tache_id_fkey" FOREIGN KEY ("tache_id") REFERENCES "taches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches_blocages" ADD CONSTRAINT "taches_blocages_bloquant_tache_id_fkey" FOREIGN KEY ("bloquant_tache_id") REFERENCES "taches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches_blocages" ADD CONSTRAINT "taches_blocages_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches_sessions" ADD CONSTRAINT "taches_sessions_tache_id_fkey" FOREIGN KEY ("tache_id") REFERENCES "taches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches_sessions" ADD CONSTRAINT "taches_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

