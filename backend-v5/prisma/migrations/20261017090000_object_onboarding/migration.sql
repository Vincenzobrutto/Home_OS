-- AlterTable
ALTER TABLE "HomeObject" ADD COLUMN     "profile" JSONB;

-- CreateTable
CREATE TABLE "ObjectOnboardingDraft" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersion" INTEGER NOT NULL,
    "documentSha256" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "version" INTEGER NOT NULL DEFAULT 1,
    "output" JSONB NOT NULL,
    "review" JSONB,
    "decisions" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectOnboardingDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectOnboardingJob" (
    "key" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "firstStartedAt" TIMESTAMP(3),
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersion" INTEGER NOT NULL,
    "documentSha256" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "consentToProviderTransfer" BOOLEAN NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'queued',
    "version" INTEGER NOT NULL DEFAULT 1,
    "draftId" TEXT,
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectOnboardingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectOnboardingRequest" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectOnboardingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectOnboardingBinding" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersion" INTEGER NOT NULL,
    "documentSha256" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "unitIndex" INTEGER NOT NULL,
    "objectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectOnboardingBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectOnboardingCampaign" (
    "id" TEXT NOT NULL,
    "limitMicroUsd" INTEGER NOT NULL,
    "maxCalls" INTEGER NOT NULL,

    CONSTRAINT "ObjectOnboardingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectOnboardingComparison" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersion" INTEGER NOT NULL,
    "documentSha256" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "proposed" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectOnboardingComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectOnboardingAttempt" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'reserved',
    "reservedMicroUsd" INTEGER NOT NULL,
    "actualMicroUsd" INTEGER,
    "inputMicroUsdPerToken" INTEGER NOT NULL,
    "outputMicroUsdPerToken" INTEGER NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "providerRequestId" TEXT,
    "output" JSONB,
    "sentAt" TIMESTAMP(3),
    "responseAt" TIMESTAMP(3),

    CONSTRAINT "ObjectOnboardingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ObjectOnboardingDraft_accountId_homeId_documentId_documentV_idx" ON "ObjectOnboardingDraft"("accountId", "homeId", "documentId", "documentVersion", "documentSha256");

-- CreateIndex
CREATE INDEX "ObjectOnboardingDraft_accountId_homeId_state_updatedAt_id_idx" ON "ObjectOnboardingDraft"("accountId", "homeId", "state", "updatedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectOnboardingJob_draftId_key" ON "ObjectOnboardingJob"("draftId");

-- CreateIndex
CREATE INDEX "ObjectOnboardingJob_state_createdAt_id_idx" ON "ObjectOnboardingJob"("state", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ObjectOnboardingJob_accountId_homeId_documentId_documentVer_idx" ON "ObjectOnboardingJob"("accountId", "homeId", "documentId", "documentVersion", "documentSha256");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectOnboardingJob_accountId_homeId_key_key" ON "ObjectOnboardingJob"("accountId", "homeId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectOnboardingRequest_accountId_homeId_operation_target_k_key" ON "ObjectOnboardingRequest"("accountId", "homeId", "operation", "target", "key");

-- CreateIndex
CREATE INDEX "ObjectOnboardingBinding_accountId_homeId_objectId_idx" ON "ObjectOnboardingBinding"("accountId", "homeId", "objectId");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectOnboardingBinding_accountId_homeId_fingerprint_unitIn_key" ON "ObjectOnboardingBinding"("accountId", "homeId", "fingerprint", "unitIndex");

-- CreateIndex
CREATE INDEX "ObjectOnboardingComparison_accountId_homeId_state_objectId_idx" ON "ObjectOnboardingComparison"("accountId", "homeId", "state", "objectId");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectOnboardingComparison_accountId_homeId_objectId_fieldK_key" ON "ObjectOnboardingComparison"("accountId", "homeId", "objectId", "fieldKey", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectOnboardingAttempt_jobId_key" ON "ObjectOnboardingAttempt"("jobId");

-- AddForeignKey
ALTER TABLE "ObjectOnboardingDraft" ADD CONSTRAINT "ObjectOnboardingDraft_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingDraft" ADD CONSTRAINT "ObjectOnboardingDraft_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingDraft" ADD CONSTRAINT "ObjectOnboardingDraft_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingJob" ADD CONSTRAINT "ObjectOnboardingJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingJob" ADD CONSTRAINT "ObjectOnboardingJob_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingJob" ADD CONSTRAINT "ObjectOnboardingJob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingJob" ADD CONSTRAINT "ObjectOnboardingJob_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ObjectOnboardingDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingRequest" ADD CONSTRAINT "ObjectOnboardingRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingRequest" ADD CONSTRAINT "ObjectOnboardingRequest_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingBinding" ADD CONSTRAINT "ObjectOnboardingBinding_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingBinding" ADD CONSTRAINT "ObjectOnboardingBinding_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingBinding" ADD CONSTRAINT "ObjectOnboardingBinding_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingBinding" ADD CONSTRAINT "ObjectOnboardingBinding_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "HomeObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingComparison" ADD CONSTRAINT "ObjectOnboardingComparison_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingComparison" ADD CONSTRAINT "ObjectOnboardingComparison_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingComparison" ADD CONSTRAINT "ObjectOnboardingComparison_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "HomeObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingComparison" ADD CONSTRAINT "ObjectOnboardingComparison_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ObjectOnboardingDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingComparison" ADD CONSTRAINT "ObjectOnboardingComparison_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingAttempt" ADD CONSTRAINT "ObjectOnboardingAttempt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ObjectOnboardingJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectOnboardingAttempt" ADD CONSTRAINT "ObjectOnboardingAttempt_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ObjectOnboardingCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
