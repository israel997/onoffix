-- CreateEnum
CREATE TYPE "RoleGlobal" AS ENUM ('ADMIN', 'MEMBRE');

-- CreateEnum
CREATE TYPE "RoleBureau" AS ENUM ('MANAGER', 'COLLABORATEUR');

-- CreateEnum
CREATE TYPE "StatutProjet" AS ENUM ('EN_COURS', 'TERMINE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "StatutTache" AS ENUM ('A_FAIRE', 'DECLARE', 'VALIDE', 'A_REVOIR');

-- CreateEnum
CREATE TYPE "StatutValidationDeclaration" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'LITIGE');

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "plan_abonnement" TEXT,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bureaux" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "fuseau_horaire" TEXT NOT NULL DEFAULT 'UTC',
    "heure_declaration" TEXT NOT NULL DEFAULT '18:30',
    "delai_relance_minutes" INTEGER NOT NULL DEFAULT 60,
    "classement_fiabilite_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bureaux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_global" "RoleGlobal" NOT NULL DEFAULT 'MEMBRE',
    "poste" TEXT,
    "bio" TEXT,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_bureaux" (
    "user_id" TEXT NOT NULL,
    "bureau_id" TEXT NOT NULL,
    "role_dans_bureau" "RoleBureau" NOT NULL DEFAULT 'COLLABORATEUR',
    "role_interne" TEXT,

    CONSTRAINT "users_bureaux_pkey" PRIMARY KEY ("user_id","bureau_id")
);

-- CreateTable
CREATE TABLE "projets" (
    "id" TEXT NOT NULL,
    "bureau_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "date_debut" TIMESTAMP(3),
    "date_fin" TIMESTAMP(3),
    "statut" "StatutProjet" NOT NULL DEFAULT 'EN_COURS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taches" (
    "id" TEXT NOT NULL,
    "projet_id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "assigne_a" TEXT,
    "statut" "StatutTache" NOT NULL DEFAULT 'A_FAIRE',
    "date_declaration" TIMESTAMP(3),
    "date_validation" TIMESTAMP(3),
    "valide_par" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sous_taches" (
    "id" TEXT NOT NULL,
    "tache_id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "est_coche" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sous_taches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "declarations_journalieres" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "heure_declaration" TIMESTAMP(3),
    "statut_validation" "StatutValidationDeclaration" NOT NULL DEFAULT 'EN_ATTENTE',

    CONSTRAINT "declarations_journalieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "declarations_taches" (
    "declaration_id" TEXT NOT NULL,
    "tache_id" TEXT NOT NULL,

    CONSTRAINT "declarations_taches_pkey" PRIMARY KEY ("declaration_id","tache_id")
);

-- CreateTable
CREATE TABLE "scores_fiabilite" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "taux_ponctualite" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taux_validation_directe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "regularite" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score_global" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scores_fiabilite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bureaux_organisation_id_idx" ON "bureaux"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organisation_id_idx" ON "users"("organisation_id");

-- CreateIndex
CREATE INDEX "projets_bureau_id_idx" ON "projets"("bureau_id");

-- CreateIndex
CREATE INDEX "taches_projet_id_idx" ON "taches"("projet_id");

-- CreateIndex
CREATE INDEX "taches_assigne_a_idx" ON "taches"("assigne_a");

-- CreateIndex
CREATE INDEX "sous_taches_tache_id_idx" ON "sous_taches"("tache_id");

-- CreateIndex
CREATE INDEX "declarations_journalieres_user_id_idx" ON "declarations_journalieres"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "declarations_journalieres_user_id_date_key" ON "declarations_journalieres"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "scores_fiabilite_user_id_periode_key" ON "scores_fiabilite"("user_id", "periode");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "bureaux" ADD CONSTRAINT "bureaux_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_bureaux" ADD CONSTRAINT "users_bureaux_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_bureaux" ADD CONSTRAINT "users_bureaux_bureau_id_fkey" FOREIGN KEY ("bureau_id") REFERENCES "bureaux"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projets" ADD CONSTRAINT "projets_bureau_id_fkey" FOREIGN KEY ("bureau_id") REFERENCES "bureaux"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches" ADD CONSTRAINT "taches_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches" ADD CONSTRAINT "taches_assigne_a_fkey" FOREIGN KEY ("assigne_a") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches" ADD CONSTRAINT "taches_valide_par_fkey" FOREIGN KEY ("valide_par") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sous_taches" ADD CONSTRAINT "sous_taches_tache_id_fkey" FOREIGN KEY ("tache_id") REFERENCES "taches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "declarations_journalieres" ADD CONSTRAINT "declarations_journalieres_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "declarations_taches" ADD CONSTRAINT "declarations_taches_declaration_id_fkey" FOREIGN KEY ("declaration_id") REFERENCES "declarations_journalieres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "declarations_taches" ADD CONSTRAINT "declarations_taches_tache_id_fkey" FOREIGN KEY ("tache_id") REFERENCES "taches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores_fiabilite" ADD CONSTRAINT "scores_fiabilite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
