-- CreateTable
CREATE TABLE "BoilerAsset" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "confirmed" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoilerAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisJob" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "assetId" TEXT,
    "parentJobId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'queued',
    "documents" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstStartedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "outcome" TEXT,
    "openReviewCount" INTEGER,
    "error" JSONB,

    CONSTRAINT "AnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldProposal" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "candidates" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "resolvedRevision" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetHistory" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "confirmationId" TEXT,
    "note" TEXT,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRequest" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoilerAsset_accountId_homeId_createdAt_id_idx" ON "BoilerAsset"("accountId", "homeId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "AnalysisJob_state_leaseUntil_idx" ON "AnalysisJob"("state", "leaseUntil");

-- CreateIndex
CREATE INDEX "AnalysisJob_accountId_homeId_createdAt_id_idx" ON "AnalysisJob"("accountId", "homeId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "FieldProposal_assetId_state_createdAt_id_idx" ON "FieldProposal"("assetId", "state", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "FieldProposal_jobId_fieldKey_key" ON "FieldProposal"("jobId", "fieldKey");

-- CreateIndex
CREATE INDEX "AssetHistory_assetId_createdAt_id_idx" ON "AssetHistory"("assetId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequest_accountId_homeId_operation_target_key_key" ON "ReviewRequest"("accountId", "homeId", "operation", "target", "key");

-- AddForeignKey
ALTER TABLE "BoilerAsset" ADD CONSTRAINT "BoilerAsset_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoilerAsset" ADD CONSTRAINT "BoilerAsset_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisJob" ADD CONSTRAINT "AnalysisJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisJob" ADD CONSTRAINT "AnalysisJob_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisJob" ADD CONSTRAINT "AnalysisJob_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "BoilerAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProposal" ADD CONSTRAINT "FieldProposal_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "BoilerAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProposal" ADD CONSTRAINT "FieldProposal_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AnalysisJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetHistory" ADD CONSTRAINT "AssetHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "BoilerAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

