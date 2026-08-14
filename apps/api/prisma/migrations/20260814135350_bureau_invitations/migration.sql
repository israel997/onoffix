-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'INVITATION_BUREAU';

-- CreateTable
CREATE TABLE "bureau_invitations" (
    "id" TEXT NOT NULL,
    "bureau_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_dans_bureau" "RoleBureau" NOT NULL DEFAULT 'COLLABORATEUR',
    "role_interne" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bureau_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bureau_invitations_bureau_id_user_id_key" ON "bureau_invitations"("bureau_id", "user_id");

-- AddForeignKey
ALTER TABLE "bureau_invitations" ADD CONSTRAINT "bureau_invitations_bureau_id_fkey" FOREIGN KEY ("bureau_id") REFERENCES "bureaux"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bureau_invitations" ADD CONSTRAINT "bureau_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
