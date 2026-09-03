CREATE TYPE "InterventionKind" AS ENUM (
    'INSTALLATION',
    'MAINTENANCE',
    'INSPECTION',
    'BREAKDOWN',
    'REPAIR',
    'REPLACEMENT',
    'OTHER'
);

CREATE TYPE "InterventionDocumentRole" AS ENUM (
    'INVOICE',
    'REPORT',
    'RECEIPT',
    'PHOTO',
    'WARRANTY_PROOF',
    'OTHER'
);

CREATE TYPE "WarrantyKind" AS ENUM (
    'PURCHASE',
    'REPAIR',
    'EXTENDED',
    'OTHER'
);

CREATE TABLE "interventions" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "occurred_at" DATE NOT NULL,
    "kind" "InterventionKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contact_id" TEXT,
    "cost_amount" DECIMAL(12,2),
    "currency" TEXT,
    "evidence_status" "EvidenceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "interventions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "interventions_cost_currency_check" CHECK (
        ("cost_amount" IS NULL AND "currency" IS NULL)
        OR
        ("cost_amount" IS NOT NULL AND "cost_amount" >= 0 AND "currency" ~ '^[A-Z]{3}$')
    )
);

CREATE TABLE "intervention_assets" (
    "intervention_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "role" TEXT,
    "notes" TEXT,
    CONSTRAINT "intervention_assets_pkey" PRIMARY KEY ("intervention_id", "asset_id")
);

CREATE TABLE "intervention_documents" (
    "intervention_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "role" "InterventionDocumentRole" NOT NULL DEFAULT 'OTHER',
    CONSTRAINT "intervention_documents_pkey" PRIMARY KEY ("intervention_id", "document_id")
);

CREATE TABLE "warranties" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "origin_intervention_id" TEXT,
    "provider_contact_id" TEXT,
    "proof_document_id" TEXT,
    "starts_at" DATE,
    "expires_at" DATE NOT NULL,
    "kind" "WarrantyKind" NOT NULL DEFAULT 'PURCHASE',
    "evidence_status" "EvidenceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "confirmed_by_user_id" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "warranties_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "maintenance_occurrences" ADD COLUMN "intervention_id" TEXT;
ALTER TABLE "asset_timeline_events" ADD COLUMN "intervention_id" TEXT;

CREATE INDEX "interventions_house_id_occurred_at_idx" ON "interventions"("house_id", "occurred_at");
CREATE INDEX "interventions_contact_id_occurred_at_idx" ON "interventions"("contact_id", "occurred_at");
CREATE INDEX "intervention_assets_asset_id_idx" ON "intervention_assets"("asset_id");
CREATE INDEX "intervention_documents_document_id_idx" ON "intervention_documents"("document_id");
CREATE INDEX "warranties_asset_id_expires_at_idx" ON "warranties"("asset_id", "expires_at");

ALTER TABLE "interventions" ADD CONSTRAINT "interventions_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "intervention_assets" ADD CONSTRAINT "intervention_assets_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "intervention_assets" ADD CONSTRAINT "intervention_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "intervention_documents" ADD CONSTRAINT "intervention_documents_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "intervention_documents" ADD CONSTRAINT "intervention_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_origin_intervention_id_fkey" FOREIGN KEY ("origin_intervention_id") REFERENCES "interventions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_provider_contact_id_fkey" FOREIGN KEY ("provider_contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_proof_document_id_fkey" FOREIGN KEY ("proof_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_confirmed_by_user_id_fkey" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maintenance_occurrences" ADD CONSTRAINT "maintenance_occurrences_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asset_timeline_events" ADD CONSTRAINT "asset_timeline_events_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill conservativo. Una Occurrence viene convertita solo quando esiste
-- una e una sola riga timeline con Asset/data/documento/contatto equivalenti.
-- Le righe ambigue rimangono legacy e non ricevono dati inventati.
CREATE TEMP TABLE "_b47_unambiguous_matches" ON COMMIT DROP AS
WITH "candidate_matches" AS (
    SELECT
        mo."id" AS "occurrence_id",
        mo."maintenance_plan_id",
        mo."asset_id",
        mo."completed_at",
        mo."contact_id",
        mo."document_id",
        mo."notes",
        mo."created_at",
        mp."house_id",
        mp."title",
        ate."id" AS "event_id",
        COUNT(*) OVER (PARTITION BY mo."id") AS "matches_count"
    FROM "maintenance_occurrences" mo
    INNER JOIN "maintenance_plans" mp ON mp."id" = mo."maintenance_plan_id"
    INNER JOIN "asset_timeline_events" ate
        ON ate."asset_id" = mo."asset_id"
        AND ate."event_date" = mo."completed_at"
        AND ate."contact_id" IS NOT DISTINCT FROM mo."contact_id"
        AND ate."document_id" IS NOT DISTINCT FROM mo."document_id"
),
"eligible" AS (
    SELECT * FROM "candidate_matches" WHERE "matches_count" = 1
)
SELECT
    e.*,
    CASE
        WHEN e."document_id" IS NOT NULL THEN MIN(e."event_id") OVER (
            PARTITION BY e."house_id", e."completed_at", e."contact_id", e."document_id"
        )
        ELSE e."event_id"
    END AS "intervention_id"
FROM "eligible" e;

INSERT INTO "interventions" (
    "id", "house_id", "occurred_at", "kind", "title", "description",
    "contact_id", "cost_amount", "currency", "evidence_status",
    "created_by_user_id", "created_at", "updated_at"
)
SELECT DISTINCT ON (m."intervention_id")
    m."intervention_id",
    m."house_id",
    m."completed_at",
    'MAINTENANCE'::"InterventionKind",
    CASE
        WHEN COUNT(*) OVER (PARTITION BY m."intervention_id") > 1
            THEN 'Intervento su più asset'
        ELSE m."title"
    END,
    m."notes",
    m."contact_id",
    NULL,
    NULL,
    CASE
        WHEN m."document_id" IS NOT NULL THEN 'VERIFIED_PRESENT'::"EvidenceStatus"
        ELSE 'UNKNOWN'::"EvidenceStatus"
    END,
    NULL,
    m."created_at",
    m."created_at"
FROM "_b47_unambiguous_matches" m
ORDER BY m."intervention_id", m."occurrence_id";

INSERT INTO "intervention_assets" ("intervention_id", "asset_id")
SELECT DISTINCT "intervention_id", "asset_id"
FROM "_b47_unambiguous_matches";

INSERT INTO "intervention_documents" ("intervention_id", "document_id", "role")
SELECT DISTINCT "intervention_id", "document_id", 'OTHER'::"InterventionDocumentRole"
FROM "_b47_unambiguous_matches"
WHERE "document_id" IS NOT NULL;

UPDATE "maintenance_occurrences" mo
SET "intervention_id" = m."intervention_id"
FROM "_b47_unambiguous_matches" m
WHERE mo."id" = m."occurrence_id";

UPDATE "asset_timeline_events" ate
SET "intervention_id" = m."intervention_id"
FROM "_b47_unambiguous_matches" m
WHERE ate."id" = m."event_id";

-- Una garanzia legacy per Asset, senza inventare prove. Il documento viene
-- collegato solo quando la provenienza di warrantyUntil lo cita davvero.
INSERT INTO "warranties" (
    "id", "asset_id", "origin_intervention_id", "provider_contact_id",
    "proof_document_id", "starts_at", "expires_at", "kind",
    "evidence_status", "notes", "confirmed_by_user_id", "confirmed_at",
    "created_at", "updated_at"
)
SELECT
    a."id",
    a."id",
    NULL,
    NULL,
    proof_document."id",
    a."purchased_at",
    a."warranty_until",
    'PURCHASE'::"WarrantyKind",
    CASE
        WHEN proof_document."id" IS NOT NULL THEN 'VERIFIED_PRESENT'::"EvidenceStatus"
        ELSE 'UNKNOWN'::"EvidenceStatus"
    END,
    'Importata dal campo garanzia preesistente dell''Asset',
    afp."confirmed_by_user_id",
    afp."confirmed_at",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "assets" a
LEFT JOIN "asset_field_provenance" afp
    ON afp."asset_id" = a."id" AND afp."field_name" = 'warrantyUntil'
LEFT JOIN "documents" proof_document
    ON proof_document."id" = afp."source_document_id"
    AND proof_document."house_id" = a."house_id"
    AND proof_document."status" = 'CONFIRMED'
WHERE a."warranty_until" IS NOT NULL;

-- Il deploy stampa conteggi verificabili senza interrompere la migrazione.
-- Le Occurrence senza match o con match multipli restano intenzionalmente legacy.
DO $$
DECLARE
    matched_occurrences INTEGER;
    migrated_interventions INTEGER;
    linked_legacy_events INTEGER;
    legacy_occurrences INTEGER;
    created_warranties INTEGER;
BEGIN
    SELECT COUNT(*) INTO matched_occurrences FROM "_b47_unambiguous_matches";
    SELECT COUNT(DISTINCT "intervention_id") INTO migrated_interventions FROM "_b47_unambiguous_matches";
    SELECT COUNT(*) INTO linked_legacy_events
    FROM "asset_timeline_events"
    WHERE "intervention_id" IS NOT NULL;
    SELECT COUNT(*) INTO legacy_occurrences
    FROM "maintenance_occurrences"
    WHERE "intervention_id" IS NULL;
    SELECT COUNT(*) INTO created_warranties FROM "warranties";

    RAISE NOTICE 'B47 backfill: % occurrence collegate, % interventi creati, % eventi legacy collegati, % occurrence lasciate legacy, % garanzie totali',
        matched_occurrences,
        migrated_interventions,
        linked_legacy_events,
        legacy_occurrences,
        created_warranties;
END $$;
