ALTER TABLE "houses"
  ADD COLUMN "province" TEXT,
  ADD COLUMN "cadastral_municipality" TEXT,
  ADD COLUMN "cadastral_municipality_code" TEXT,
  ADD COLUMN "cadastral_section" TEXT,
  ADD COLUMN "cadastral_sheet" TEXT,
  ADD COLUMN "cadastral_parcel" TEXT,
  ADD COLUMN "cadastral_subaltern" TEXT,
  ADD COLUMN "cadastral_category" TEXT,
  ADD COLUMN "cadastral_class" TEXT,
  ADD COLUMN "cadastral_consistency" TEXT,
  ADD COLUMN "cadastral_surface_sqm" DECIMAL(10,2),
  ADD COLUMN "cadastral_income" DECIMAL(12,2),
  ADD COLUMN "floors_count" INTEGER,
  ADD COLUMN "usable_surface_sqm" DECIMAL(10,2),
  ADD COLUMN "heated_surface_sqm" DECIMAL(10,2),
  ADD COLUMN "renovation_year" INTEGER,
  ADD COLUMN "ape_code" TEXT,
  ADD COLUMN "ape_issued_at" DATE,
  ADD COLUMN "ape_expires_at" DATE,
  ADD COLUMN "energy_class" TEXT,
  ADD COLUMN "epgl_nren" DECIMAL(12,3),
  ADD COLUMN "epgl_ren" DECIMAL(12,3),
  ADD COLUMN "co2_emissions" DECIMAL(12,3),
  ADD COLUMN "climate_zone" TEXT,
  ADD COLUMN "energy_use_category" TEXT,
  ADD COLUMN "habitability_status" TEXT,
  ADD COLUMN "habitability_date" DATE,
  ADD COLUMN "habitability_protocol" TEXT;

CREATE TABLE "house_field_provenance" (
  "id" TEXT NOT NULL,
  "house_id" TEXT NOT NULL,
  "field_name" TEXT NOT NULL,
  "origin" "FieldSource" NOT NULL,
  "source_document_id" TEXT,
  "confirmed_by_user_id" TEXT,
  "confirmed_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "house_field_provenance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "house_field_provenance_house_id_field_name_key"
  ON "house_field_provenance"("house_id", "field_name");

ALTER TABLE "house_field_provenance"
  ADD CONSTRAINT "house_field_provenance_house_id_fkey"
  FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "house_field_provenance"
  ADD CONSTRAINT "house_field_provenance_source_document_id_fkey"
  FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "house_field_provenance"
  ADD CONSTRAINT "house_field_provenance_confirmed_by_user_id_fkey"
  FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
