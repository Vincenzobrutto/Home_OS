-- AlterEnum
ALTER TYPE "DocumentSource" ADD VALUE 'DRIVE';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "drive_file_id" TEXT,
ADD COLUMN     "drive_modified_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "drive_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "google_email" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "folder_id" TEXT,
    "folder_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drive_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drive_connections_user_id_key" ON "drive_connections"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_house_id_drive_file_id_key" ON "documents"("house_id", "drive_file_id");

-- AddForeignKey
ALTER TABLE "drive_connections" ADD CONSTRAINT "drive_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
