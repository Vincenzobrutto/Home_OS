-- CreateEnum
CREATE TYPE "GenesisStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PROCESSING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AcquisitionSource" AS ENUM ('MANUAL', 'SCAN_MOCK', 'DOCUMENT', 'IMPORT');

-- CreateEnum
CREATE TYPE "ScanSessionType" AS ENUM ('GUIDED_MOCK', 'PHOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "ScanSessionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ObservationEntityType" AS ENUM ('ROOM', 'ASSET');

-- CreateEnum
CREATE TYPE "ObservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'EDITED');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "RecommendationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('OPEN', 'DISMISSED', 'DONE');

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "confirmed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "estimated_replacement_year" INTEGER,
ADD COLUMN     "source" "AcquisitionSource" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "houses" ADD COLUMN     "address" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "genesis_status" "GenesisStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "property_type" TEXT;

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "confirmed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "floor_id" TEXT,
ADD COLUMN     "source" "AcquisitionSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "floors" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_sessions" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "type" "ScanSessionType" NOT NULL,
    "status" "ScanSessionStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "scan_session_id" TEXT NOT NULL,
    "entity_type" "ObservationEntityType" NOT NULL,
    "proposed_name" TEXT NOT NULL,
    "proposed_category" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ObservationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "document_id" TEXT,
    "category" TEXT NOT NULL,
    "severity" "IssueSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "resolution_hint" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "rule_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "issue_id" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "RecommendationPriority" NOT NULL,
    "estimated_impact" TEXT,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_snapshots" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "documentation_score" INTEGER NOT NULL,
    "maintenance_score" INTEGER NOT NULL,
    "safety_score" INTEGER NOT NULL,
    "efficiency_score" INTEGER NOT NULL,
    "completeness_score" INTEGER NOT NULL,
    "calculation_version" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "house_timeline_events" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "document_id" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'system',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "house_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issues_house_id_rule_code_status_idx" ON "issues"("house_id", "rule_code", "status");

-- CreateIndex
CREATE INDEX "score_snapshots_house_id_calculated_at_idx" ON "score_snapshots"("house_id", "calculated_at");

-- CreateIndex
CREATE INDEX "house_timeline_events_house_id_event_date_idx" ON "house_timeline_events"("house_id", "event_date");

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_sessions" ADD CONSTRAINT "scan_sessions_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_scan_session_id_fkey" FOREIGN KEY ("scan_session_id") REFERENCES "scan_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_snapshots" ADD CONSTRAINT "score_snapshots_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "house_timeline_events" ADD CONSTRAINT "house_timeline_events_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
