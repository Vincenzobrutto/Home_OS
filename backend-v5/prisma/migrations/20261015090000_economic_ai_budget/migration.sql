CREATE TABLE "EconomicAiCampaign" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "limitMicroUsd" INTEGER NOT NULL CHECK ("limitMicroUsd">0),
 "maxCalls" INTEGER NOT NULL CHECK ("maxCalls">0),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "EconomicAiAttempt" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "jobId" TEXT NOT NULL UNIQUE REFERENCES "EconomicAnalysisJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "campaignId" TEXT NOT NULL REFERENCES "EconomicAiCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "model" TEXT NOT NULL,
 "promptVersion" TEXT NOT NULL,
 "inputMicroUsdPerToken" INTEGER NOT NULL CHECK ("inputMicroUsdPerToken">0),
 "outputMicroUsdPerToken" INTEGER NOT NULL CHECK ("outputMicroUsdPerToken">0),
 "reservedMicroUsd" INTEGER NOT NULL CHECK ("reservedMicroUsd">0),
 "actualMicroUsd" INTEGER CHECK ("actualMicroUsd">=0),
 "state" TEXT NOT NULL DEFAULT 'reserved' CHECK ("state" IN ('reserved','sending','uncertain','settled','released')),
 "inputTokens" INTEGER,
 "outputTokens" INTEGER,
 "providerRequestId" TEXT,
 "response" JSONB,
 "sentAt" TIMESTAMP(3),
 "responseAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "EconomicAiAttempt_campaignId_state_idx" ON "EconomicAiAttempt"("campaignId","state");
