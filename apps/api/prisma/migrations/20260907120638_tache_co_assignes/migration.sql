-- CreateTable
CREATE TABLE "taches_assignees" (
    "id" TEXT NOT NULL,
    "tache_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taches_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "taches_assignees_user_id_idx" ON "taches_assignees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "taches_assignees_tache_id_user_id_key" ON "taches_assignees"("tache_id", "user_id");

-- AddForeignKey
ALTER TABLE "taches_assignees" ADD CONSTRAINT "taches_assignees_tache_id_fkey" FOREIGN KEY ("tache_id") REFERENCES "taches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches_assignees" ADD CONSTRAINT "taches_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
