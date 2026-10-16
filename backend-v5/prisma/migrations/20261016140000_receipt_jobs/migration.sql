-- Additive receipt simulation jobs. Existing jobs and original documents are untouched.
CREATE TABLE "ReceiptAnalysisJob" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "homeId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "documentVersion" INTEGER NOT NULL,
  "documentSha256" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "consentToProviderTransfer" BOOLEAN NOT NULL DEFAULT false,
  "key" TEXT NOT NULL,
  "digest" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'queued',
  "version" INTEGER NOT NULL DEFAULT 1,
  "draftId" TEXT,
  "errorCode" TEXT,
  "leaseToken" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "firstStartedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReceiptAnalysisJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReceiptAnalysisJob_values_check" CHECK (
    "documentVersion">0 AND "version">0 AND "documentSha256" ~ '^[a-f0-9]{64}$'
    AND "digest" ~ '^[a-f0-9]{64}$' AND "key" ~ '^[A-Za-z0-9_-]{16,100}$'
    AND "provider"='receipt_fixture_v1' AND NOT "consentToProviderTransfer"
    AND "state" IN ('queued','running','succeeded','failed')
    AND (("state"='running' AND "leaseToken" IS NOT NULL AND "leaseUntil" IS NOT NULL AND "firstStartedAt" IS NOT NULL)
      OR ("state"<>'running' AND "leaseToken" IS NULL AND "leaseUntil" IS NULL))
    AND (("state"='succeeded' AND "draftId" IS NOT NULL) OR ("state"<>'succeeded' AND "draftId" IS NULL))
    AND (("state"='failed' AND "errorCode" IS NOT NULL) OR ("state"<>'failed' AND "errorCode" IS NULL))
  )
);
CREATE UNIQUE INDEX "ReceiptAnalysisJob_draftId_key" ON "ReceiptAnalysisJob"("draftId");
CREATE UNIQUE INDEX "ReceiptAnalysisJob_accountId_homeId_key_key" ON "ReceiptAnalysisJob"("accountId","homeId","key");
CREATE INDEX "ReceiptAnalysisJob_state_leaseUntil_createdAt_id_idx" ON "ReceiptAnalysisJob"("state","leaseUntil","createdAt","id");
CREATE INDEX "ReceiptAnalysisJob_accountId_homeId_documentId_createdAt_id_idx" ON "ReceiptAnalysisJob"("accountId","homeId","documentId","createdAt","id");
CREATE UNIQUE INDEX "ReceiptAnalysisJob_one_active_source" ON "ReceiptAnalysisJob"("accountId","homeId","documentId","documentVersion","documentSha256","provider") WHERE "state" IN ('queued','running');
ALTER TABLE "ReceiptAnalysisJob" ADD CONSTRAINT "ReceiptAnalysisJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptAnalysisJob" ADD CONSTRAINT "ReceiptAnalysisJob_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptAnalysisJob" ADD CONSTRAINT "ReceiptAnalysisJob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptAnalysisJob" ADD CONSTRAINT "ReceiptAnalysisJob_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ReceiptDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
