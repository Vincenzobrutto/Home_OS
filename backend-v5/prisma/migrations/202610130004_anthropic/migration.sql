-- AlterTable
ALTER TABLE "AnalysisJob" ADD COLUMN     "consentToProviderTransfer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'test_fixture_v1';

-- AlterTable
ALTER TABLE "FieldProposal" ADD COLUMN     "model" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'test_fixture_v1';

-- AlterTable
ALTER TABLE "AssetHistory" ADD COLUMN     "model" TEXT,
ADD COLUMN     "provider" TEXT;

-- CreateTable
CREATE TABLE "AiCampaign" (
    "id" TEXT NOT NULL,
    "limitMicroUsd" INTEGER NOT NULL,
    "maxCalls" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAttempt" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "inputMicroUsdPerToken" INTEGER NOT NULL,
    "outputMicroUsdPerToken" INTEGER NOT NULL,
    "reservedMicroUsd" INTEGER NOT NULL,
    "actualMicroUsd" INTEGER,
    "state" TEXT NOT NULL DEFAULT 'reserved',
    "sentAt" TIMESTAMP(3),
    "response" JSONB,
    "responseAt" TIMESTAMP(3),
    "providerRequestId" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiAttempt_jobId_key" ON "AiAttempt"("jobId");

-- CreateIndex
CREATE INDEX "AiAttempt_campaignId_state_idx" ON "AiAttempt"("campaignId", "state");

-- AddForeignKey
ALTER TABLE "AiAttempt" ADD CONSTRAINT "AiAttempt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AnalysisJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAttempt" ADD CONSTRAINT "AiAttempt_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AiCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
