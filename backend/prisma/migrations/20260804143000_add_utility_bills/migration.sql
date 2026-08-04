CREATE TABLE "utility_bills" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "consumption_kwh" DECIMAL(12,3) NOT NULL,
    "amount" DECIMAL(12,2),
    "supplier" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utility_bills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "utility_bills_document_id_period_start_period_end_key"
ON "utility_bills"("document_id", "period_start", "period_end");

CREATE INDEX "utility_bills_house_id_period_start_period_end_idx"
ON "utility_bills"("house_id", "period_start", "period_end");

ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_house_id_fkey"
FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_document_id_fkey"
FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
