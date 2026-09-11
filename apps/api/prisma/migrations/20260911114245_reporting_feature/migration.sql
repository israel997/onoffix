-- CreateEnum
CREATE TYPE "TypeRapport" AS ENUM ('GENERAL', 'WEEKLY');

-- CreateTable
CREATE TABLE "rapports" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypeRapport" NOT NULL,
    "contenu" TEXT,
    "est_prive" BOOLEAN NOT NULL DEFAULT false,
    "est_archive" BOOLEAN NOT NULL DEFAULT false,
    "createur_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rapports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rapports_jours" (
    "id" TEXT NOT NULL,
    "rapport_id" TEXT NOT NULL,
    "jour" INTEGER NOT NULL,
    "contenu" TEXT,
    "bons_points" TEXT,
    "points_negatifs" TEXT,
    "objectifs" TEXT,

    CONSTRAINT "rapports_jours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rapports_images" (
    "id" TEXT NOT NULL,
    "rapport_id" TEXT NOT NULL,
    "jour_id" TEXT,
    "url" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rapports_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rapports_mentions" (
    "id" TEXT NOT NULL,
    "rapport_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rapports_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rapports_organisation_id_idx" ON "rapports"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "rapports_jours_rapport_id_jour_key" ON "rapports_jours"("rapport_id", "jour");

-- CreateIndex
CREATE INDEX "rapports_images_rapport_id_idx" ON "rapports_images"("rapport_id");

-- CreateIndex
CREATE INDEX "rapports_images_jour_id_idx" ON "rapports_images"("jour_id");

-- CreateIndex
CREATE UNIQUE INDEX "rapports_mentions_rapport_id_user_id_key" ON "rapports_mentions"("rapport_id", "user_id");

-- AddForeignKey
ALTER TABLE "rapports" ADD CONSTRAINT "rapports_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports" ADD CONSTRAINT "rapports_createur_id_fkey" FOREIGN KEY ("createur_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports_jours" ADD CONSTRAINT "rapports_jours_rapport_id_fkey" FOREIGN KEY ("rapport_id") REFERENCES "rapports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports_images" ADD CONSTRAINT "rapports_images_rapport_id_fkey" FOREIGN KEY ("rapport_id") REFERENCES "rapports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports_images" ADD CONSTRAINT "rapports_images_jour_id_fkey" FOREIGN KEY ("jour_id") REFERENCES "rapports_jours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports_mentions" ADD CONSTRAINT "rapports_mentions_rapport_id_fkey" FOREIGN KEY ("rapport_id") REFERENCES "rapports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports_mentions" ADD CONSTRAINT "rapports_mentions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
