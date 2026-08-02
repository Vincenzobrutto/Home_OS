-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('CUCINA', 'SOGGIORNO', 'CAMERA', 'BAGNO');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('CALDAIA', 'ELETTRICO', 'IDRAULICO', 'FOTOVOLTAICO', 'CLIMA', 'TETTO', 'FINESTRE', 'ELETTRODOMESTICO');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('OK', 'ATTENTION', 'DUE');

-- CreateEnum
CREATE TYPE "FieldSource" AS ENUM ('MANUAL', 'AI_EXTRACTED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'ANALYZING', 'ANALYZED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'MEMBER', 'VIEWER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "houses" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "surface_sqm" DECIMAL(65,30),
    "rooms_count" INTEGER,
    "build_year" INTEGER,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "house_memberships" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "house_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "type" "RoomType" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "plan_geometry" JSONB,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "room_id" TEXT,
    "type" "AssetType" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "installed_at" DATE,
    "warranty_until" DATE,
    "status" "AssetStatus" NOT NULL DEFAULT 'ATTENTION',
    "plan_pos_x" DECIMAL(65,30),
    "plan_pos_y" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_custom_fields" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" "FieldSource" NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "asset_custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT,
    "house_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "doc_type" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "ai_confidence" DECIMAL(65,30),
    "extracted_fields" JSONB,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_timeline_events" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "event_type" TEXT NOT NULL,
    "detail" TEXT,
    "document_id" TEXT,

    CONSTRAINT "asset_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "houses_code_key" ON "houses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "house_memberships_house_id_user_id_key" ON "house_memberships"("house_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");

-- CreateIndex
CREATE UNIQUE INDEX "assets_code_key" ON "assets"("code");

-- AddForeignKey
ALTER TABLE "houses" ADD CONSTRAINT "houses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "house_memberships" ADD CONSTRAINT "house_memberships_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "house_memberships" ADD CONSTRAINT "house_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_custom_fields" ADD CONSTRAINT "asset_custom_fields_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_timeline_events" ADD CONSTRAINT "asset_timeline_events_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_timeline_events" ADD CONSTRAINT "asset_timeline_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
