CREATE TYPE "EvidenceStatus" AS ENUM ('VERIFIED_PRESENT', 'DECLARED_PRESENT', 'DECLARED_ABSENT', 'UNKNOWN', 'NOT_APPLICABLE');
CREATE TYPE "ThermalServiceType" AS ENUM ('HEATING', 'COOLING', 'COMBINED');
CREATE TYPE "RegulatoryTerritoryKind" AS ENUM ('REGION', 'METROPOLITAN_CITY', 'PROVINCE', 'MUNICIPALITY');
CREATE TYPE "PlantResponsibilityType" AS ENUM ('OCCUPANT', 'OWNER', 'LANDLORD', 'CONDOMINIUM_ADMIN', 'THIRD_PARTY');
CREATE TYPE "RegulatoryRuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'BLOCKED', 'SUPERSEDED', 'SUSPENDED');
CREATE TYPE "MaintenanceSubjectType" AS ENUM ('HOUSE', 'THERMAL_SYSTEM', 'ASSET');
CREATE TYPE "MaintenanceOrigin" AS ENUM ('USER', 'GUIDELINE', 'REGULATORY');

ALTER TABLE "houses" ADD COLUMN "municipality_istat_code" TEXT;

CREATE TABLE "regulatory_territories" (
  "id" TEXT NOT NULL,
  "kind" "RegulatoryTerritoryKind" NOT NULL,
  "istat_code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parent_id" TEXT,
  "population" INTEGER,
  "population_reference_date" DATE,
  "valid_from" DATE NOT NULL,
  "valid_to" DATE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "regulatory_territories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "regulatory_territories_name_not_blank" CHECK (length(trim("name")) > 0),
  CONSTRAINT "regulatory_territories_istat_code_not_blank" CHECK (length(trim("istat_code")) > 0)
);

CREATE TABLE "regulatory_rules" (
  "id" TEXT NOT NULL,
  "stable_code" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "family" TEXT NOT NULL,
  "territory_id" TEXT,
  "scope" JSONB NOT NULL,
  "conditions" JSONB NOT NULL,
  "effect" JSONB NOT NULL,
  "source_title" TEXT NOT NULL,
  "source_url" TEXT NOT NULL,
  "source_published_at" DATE,
  "verified_at" TIMESTAMP(3) NOT NULL,
  "verified_by" TEXT,
  "valid_from" DATE NOT NULL,
  "valid_to" DATE,
  "status" "RegulatoryRuleStatus" NOT NULL DEFAULT 'DRAFT',
  "supersedes_rule_id" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "regulatory_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "regulatory_rules_version_positive" CHECK ("version" > 0),
  CONSTRAINT "regulatory_rules_required_text_not_blank" CHECK (
    length(trim("stable_code")) > 0 AND
    length(trim("family")) > 0 AND
    length(trim("source_title")) > 0 AND
    length(trim("source_url")) > 0
  )
);

CREATE TABLE "thermal_systems" (
  "id" TEXT NOT NULL,
  "house_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "service_type" "ThermalServiceType" NOT NULL,
  "distribution_description" TEXT,
  "evidence_status" "EvidenceStatus" NOT NULL DEFAULT 'UNKNOWN',
  "source_document_id" TEXT,
  "confirmed_by_user_id" TEXT,
  "confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "thermal_systems_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "thermal_systems_name_not_blank" CHECK (length(trim("name")) > 0)
);

ALTER TABLE "assets"
  ADD COLUMN "thermal_system_id" TEXT,
  ADD COLUMN "refrigerant" TEXT,
  ADD COLUMN "refrigerant_charge_kg" DECIMAL(10,3),
  ADD COLUMN "hermetically_sealed" BOOLEAN,
  ADD COLUMN "sealed_label_present" BOOLEAN,
  ADD COLUMN "leak_detection_system" BOOLEAN,
  ADD CONSTRAINT "assets_refrigerant_charge_non_negative" CHECK ("refrigerant_charge_kg" IS NULL OR "refrigerant_charge_kg" >= 0);

CREATE TABLE "plant_booklets" (
  "id" TEXT NOT NULL,
  "thermal_system_id" TEXT NOT NULL,
  "evidence_status" "EvidenceStatus" NOT NULL DEFAULT 'UNKNOWN',
  "registry_code_encrypted" TEXT,
  "registry_key_encrypted" TEXT,
  "plate_code_encrypted" TEXT,
  "registered_at" DATE,
  "active_from" DATE,
  "active_to" DATE,
  "source_document_id" TEXT,
  "confirmed_by_user_id" TEXT,
  "confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plant_booklets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "efficiency_control_reports" (
  "id" TEXT NOT NULL,
  "thermal_system_id" TEXT NOT NULL,
  "asset_id" TEXT,
  "control_date" DATE NOT NULL,
  "report_type" TEXT NOT NULL,
  "outcome" TEXT,
  "sticker_code" TEXT,
  "registry_transmission_date" DATE,
  "source_document_id" TEXT,
  "evidence_status" "EvidenceStatus" NOT NULL DEFAULT 'UNKNOWN',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "efficiency_control_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "efficiency_control_reports_type_not_blank" CHECK (length(trim("report_type")) > 0)
);

CREATE TABLE "plant_responsibilities" (
  "id" TEXT NOT NULL,
  "house_id" TEXT NOT NULL,
  "thermal_system_id" TEXT NOT NULL,
  "responsibility_type" "PlantResponsibilityType" NOT NULL,
  "user_id" TEXT,
  "display_name" TEXT,
  "valid_from" DATE NOT NULL,
  "valid_to" DATE,
  "evidence_status" "EvidenceStatus" NOT NULL DEFAULT 'UNKNOWN',
  "source_document_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plant_responsibilities_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "maintenance_plans"
  ADD COLUMN "house_id" TEXT,
  ADD COLUMN "thermal_system_id" TEXT,
  ADD COLUMN "subject_type" "MaintenanceSubjectType" NOT NULL DEFAULT 'ASSET',
  ADD COLUMN "origin" "MaintenanceOrigin" NOT NULL DEFAULT 'USER',
  ADD COLUMN "regulatory_rule_id" TEXT,
  ADD COLUMN "generated_key" TEXT,
  ADD COLUMN "evidence_status" "EvidenceStatus",
  ADD COLUMN "source_snapshot" JSONB;

UPDATE "maintenance_plans" AS mp
SET "house_id" = a."house_id"
FROM "assets" AS a
WHERE a."id" = mp."asset_id";

ALTER TABLE "maintenance_plans"
  ALTER COLUMN "house_id" SET NOT NULL,
  ALTER COLUMN "asset_id" DROP NOT NULL,
  ADD CONSTRAINT "maintenance_plans_subject_xor" CHECK (
    ("subject_type" = 'HOUSE' AND "asset_id" IS NULL AND "thermal_system_id" IS NULL) OR
    ("subject_type" = 'ASSET' AND "asset_id" IS NOT NULL AND "thermal_system_id" IS NULL) OR
    ("subject_type" = 'THERMAL_SYSTEM' AND "asset_id" IS NULL AND "thermal_system_id" IS NOT NULL)
  );

CREATE UNIQUE INDEX "regulatory_territories_istat_code_valid_from_key" ON "regulatory_territories"("istat_code", "valid_from");
CREATE INDEX "regulatory_territories_parent_id_idx" ON "regulatory_territories"("parent_id");
CREATE UNIQUE INDEX "regulatory_rules_stable_code_version_key" ON "regulatory_rules"("stable_code", "version");
CREATE INDEX "regulatory_rules_territory_id_family_status_valid_from_idx" ON "regulatory_rules"("territory_id", "family", "status", "valid_from");
CREATE INDEX "thermal_systems_house_id_idx" ON "thermal_systems"("house_id");
CREATE INDEX "plant_booklets_thermal_system_id_active_to_idx" ON "plant_booklets"("thermal_system_id", "active_to");
CREATE UNIQUE INDEX "plant_booklets_one_active_per_system" ON "plant_booklets"("thermal_system_id") WHERE "active_to" IS NULL;
CREATE INDEX "efficiency_control_reports_thermal_system_id_control_date_idx" ON "efficiency_control_reports"("thermal_system_id", "control_date");
CREATE INDEX "plant_responsibilities_thermal_system_id_valid_from_idx" ON "plant_responsibilities"("thermal_system_id", "valid_from");
CREATE UNIQUE INDEX "maintenance_plans_generated_key_key" ON "maintenance_plans"("generated_key");
CREATE INDEX "maintenance_plans_house_id_next_due_at_idx" ON "maintenance_plans"("house_id", "next_due_at");
CREATE INDEX "maintenance_plans_thermal_system_id_next_due_at_idx" ON "maintenance_plans"("thermal_system_id", "next_due_at");

ALTER TABLE "regulatory_territories" ADD CONSTRAINT "regulatory_territories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "regulatory_territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "regulatory_rules" ADD CONSTRAINT "regulatory_rules_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "regulatory_territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "regulatory_rules" ADD CONSTRAINT "regulatory_rules_supersedes_rule_id_fkey" FOREIGN KEY ("supersedes_rule_id") REFERENCES "regulatory_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "thermal_systems" ADD CONSTRAINT "thermal_systems_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "thermal_systems" ADD CONSTRAINT "thermal_systems_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "thermal_systems" ADD CONSTRAINT "thermal_systems_confirmed_by_user_id_fkey" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_thermal_system_id_fkey" FOREIGN KEY ("thermal_system_id") REFERENCES "thermal_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "plant_booklets" ADD CONSTRAINT "plant_booklets_thermal_system_id_fkey" FOREIGN KEY ("thermal_system_id") REFERENCES "thermal_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plant_booklets" ADD CONSTRAINT "plant_booklets_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "plant_booklets" ADD CONSTRAINT "plant_booklets_confirmed_by_user_id_fkey" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "efficiency_control_reports" ADD CONSTRAINT "efficiency_control_reports_thermal_system_id_fkey" FOREIGN KEY ("thermal_system_id") REFERENCES "thermal_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "efficiency_control_reports" ADD CONSTRAINT "efficiency_control_reports_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "efficiency_control_reports" ADD CONSTRAINT "efficiency_control_reports_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "plant_responsibilities" ADD CONSTRAINT "plant_responsibilities_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plant_responsibilities" ADD CONSTRAINT "plant_responsibilities_thermal_system_id_fkey" FOREIGN KEY ("thermal_system_id") REFERENCES "thermal_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plant_responsibilities" ADD CONSTRAINT "plant_responsibilities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "plant_responsibilities" ADD CONSTRAINT "plant_responsibilities_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_thermal_system_id_fkey" FOREIGN KEY ("thermal_system_id") REFERENCES "thermal_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_regulatory_rule_id_fkey" FOREIGN KEY ("regulatory_rule_id") REFERENCES "regulatory_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
