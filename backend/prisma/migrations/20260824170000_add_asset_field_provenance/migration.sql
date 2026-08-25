-- FieldSource: MANUAL/AI_EXTRACTED -> DECLARED/EXTRACTED/ATTESTED (rinomina
-- + nuovo valore). Le righe esistenti (79 MANUAL, 101 AI_EXTRACTED al
-- momento di scrivere questa migrazione) vengono mappate 1:1, non perse.
ALTER TYPE "FieldSource" RENAME TO "FieldSource_old";
CREATE TYPE "FieldSource" AS ENUM ('DECLARED', 'EXTRACTED', 'ATTESTED');

ALTER TABLE "asset_custom_fields" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "asset_custom_fields" ALTER COLUMN "source" TYPE "FieldSource" USING (
  CASE "source"::text
    WHEN 'MANUAL' THEN 'DECLARED'
    WHEN 'AI_EXTRACTED' THEN 'EXTRACTED'
  END
)::"FieldSource";
ALTER TABLE "asset_custom_fields" ALTER COLUMN "source" SET DEFAULT 'DECLARED';

DROP TYPE "FieldSource_old";

-- AlterTable: provenienza per i campi liberi (B38) — nulli per le righe
-- esistenti, non conosciamo la loro vera origine/conferma.
ALTER TABLE "asset_custom_fields" ADD COLUMN "source_document_id" TEXT;
ALTER TABLE "asset_custom_fields" ADD COLUMN "confirmed_by_user_id" TEXT;
ALTER TABLE "asset_custom_fields" ADD COLUMN "confirmed_at" TIMESTAMP(3);

ALTER TABLE "asset_custom_fields" ADD CONSTRAINT "asset_custom_fields_source_document_id_fkey"
  FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asset_custom_fields" ADD CONSTRAINT "asset_custom_fields_confirmed_by_user_id_fkey"
  FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: provenienza dei 7 campi strutturati di Asset (installedAt,
-- warrantyUntil, purchasedAt, serialNumber, manufacturer, model, supplier).
-- Nessun backfill per gli Asset esistenti: la tabella nasce vuota, un
-- record compare solo dal prossimo campo scritto in poi.
CREATE TABLE "asset_field_provenance" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "origin" "FieldSource" NOT NULL,
    "source_document_id" TEXT,
    "confirmed_by_user_id" TEXT,
    "confirmed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_field_provenance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "asset_field_provenance_asset_id_field_name_key" ON "asset_field_provenance"("asset_id", "field_name");

ALTER TABLE "asset_field_provenance" ADD CONSTRAINT "asset_field_provenance_asset_id_fkey"
  FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset_field_provenance" ADD CONSTRAINT "asset_field_provenance_source_document_id_fkey"
  FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asset_field_provenance" ADD CONSTRAINT "asset_field_provenance_confirmed_by_user_id_fkey"
  FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
