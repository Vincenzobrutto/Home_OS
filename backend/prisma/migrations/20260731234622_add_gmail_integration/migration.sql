-- CreateEnum
CREATE TYPE "DocumentSource" AS ENUM ('UPLOAD', 'GMAIL');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "email_date" TIMESTAMP(3),
ADD COLUMN     "email_from" TEXT,
ADD COLUMN     "email_subject" TEXT,
ADD COLUMN     "gmail_message_id" TEXT,
ADD COLUMN     "ignored_at" TIMESTAMP(3),
ADD COLUMN     "imported_at" TIMESTAMP(3),
ADD COLUMN     "source" "DocumentSource" NOT NULL DEFAULT 'UPLOAD';

-- CreateTable
CREATE TABLE "gmail_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "google_email" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmail_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gmail_connections_user_id_key" ON "gmail_connections"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_house_id_gmail_message_id_key" ON "documents"("house_id", "gmail_message_id");

-- AddForeignKey
ALTER TABLE "gmail_connections" ADD CONSTRAINT "gmail_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
