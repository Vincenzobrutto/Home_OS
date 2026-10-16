-- Dedicated receipt campaign; no prior campaign or original is reset or rewritten.
CREATE TABLE "ReceiptAiCampaign" (
  "id" TEXT PRIMARY KEY,
  "limitMicroUsd" INTEGER NOT NULL CHECK ("limitMicroUsd">0 AND "limitMicroUsd"<=10000000),
  "maxCalls" INTEGER NOT NULL CHECK ("maxCalls">0 AND "maxCalls"<=50),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "ReceiptAiAttempt" (
  "id" TEXT PRIMARY KEY,
  "jobId" TEXT NOT NULL UNIQUE REFERENCES "ReceiptAnalysisJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "campaignId" TEXT NOT NULL REFERENCES "ReceiptAiCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "model" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "inputMicroUsdPerToken" INTEGER NOT NULL CHECK ("inputMicroUsdPerToken">0),
  "outputMicroUsdPerToken" INTEGER NOT NULL CHECK ("outputMicroUsdPerToken">0),
  "reservedMicroUsd" INTEGER NOT NULL CHECK ("reservedMicroUsd">0),
  "actualMicroUsd" INTEGER CHECK ("actualMicroUsd">=0 AND "actualMicroUsd"<="reservedMicroUsd"),
  "state" TEXT NOT NULL DEFAULT 'reserved' CHECK ("state" IN ('reserved','sending','uncertain','settled','released')),
  "inputTokens" INTEGER CHECK ("inputTokens">=0),
  "outputTokens" INTEGER CHECK ("outputTokens">=0 AND "outputTokens"<=4096),
  "providerRequestId" TEXT,
  "output" JSONB,
  "sentAt" TIMESTAMP(3),
  "responseAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReceiptAiAttempt_billing_check" CHECK (
    ("state"='released' AND "actualMicroUsd"=0 AND "sentAt" IS NULL)
    OR ("state"='reserved' AND "actualMicroUsd" IS NULL AND "sentAt" IS NULL)
    OR ("state" IN ('sending','uncertain') AND "actualMicroUsd" IS NULL AND "sentAt" IS NOT NULL)
    OR ("state"='settled' AND "actualMicroUsd" IS NOT NULL AND "responseAt" IS NOT NULL AND "sentAt" IS NOT NULL)
  )
);
CREATE INDEX "ReceiptAiAttempt_campaignId_state_idx" ON "ReceiptAiAttempt"("campaignId","state");
ALTER TABLE "ReceiptAnalysisJob" DROP CONSTRAINT "ReceiptAnalysisJob_values_check";
ALTER TABLE "ReceiptAnalysisJob" ADD CONSTRAINT "ReceiptAnalysisJob_values_check" CHECK (
  "documentVersion">0 AND "version">0 AND "documentSha256" ~ '^[a-f0-9]{64}$'
  AND "digest" ~ '^[a-f0-9]{64}$' AND "key" ~ '^[A-Za-z0-9_-]{16,100}$'
  AND (("provider"='receipt_fixture_v1' AND NOT "consentToProviderTransfer") OR ("provider"='anthropic' AND "consentToProviderTransfer"))
  AND "state" IN ('queued','running','succeeded','failed','uncertain')
  AND ("state"<>'uncertain' OR "provider"='anthropic')
  AND (("state"='running' AND "leaseToken" IS NOT NULL AND "leaseUntil" IS NOT NULL AND "firstStartedAt" IS NOT NULL)
    OR ("state"<>'running' AND "leaseToken" IS NULL AND "leaseUntil" IS NULL))
  AND (("state"='succeeded' AND "draftId" IS NOT NULL) OR ("state"<>'succeeded' AND "draftId" IS NULL))
  AND (("state" IN ('failed','uncertain') AND "errorCode" IS NOT NULL) OR ("state" NOT IN ('failed','uncertain') AND "errorCode" IS NULL))
);
