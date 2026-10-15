-- AlterTable
ALTER TABLE "HomeExpense" ADD COLUMN     "analysisDraftId" TEXT,
ADD COLUMN     "economicProvenance" JSONB;

-- CreateTable
CREATE TABLE "EconomicAnalysisJob" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersion" INTEGER NOT NULL,
    "documentSha256" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "consentToProviderTransfer" BOOLEAN NOT NULL DEFAULT false,
    "state" TEXT NOT NULL DEFAULT 'queued',
    "version" INTEGER NOT NULL DEFAULT 1,
    "errorCode" TEXT,
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "firstStartedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EconomicAnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomicDraft" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersion" INTEGER NOT NULL,
    "documentSha256" TEXT NOT NULL,
    "documentKind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "version" INTEGER NOT NULL DEFAULT 1,
    "proposedFields" JSONB NOT NULL,
    "amountCandidates" JSONB NOT NULL,
    "amountSelectionRequired" BOOLEAN NOT NULL,
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EconomicDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EconomicAnalysisJob_state_leaseUntil_createdAt_id_idx" ON "EconomicAnalysisJob"("state", "leaseUntil", "createdAt", "id");

-- CreateIndex
CREATE INDEX "EconomicAnalysisJob_accountId_homeId_createdAt_id_idx" ON "EconomicAnalysisJob"("accountId", "homeId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "EconomicDraft_jobId_key" ON "EconomicDraft"("jobId");

-- CreateIndex
CREATE INDEX "EconomicDraft_accountId_homeId_state_createdAt_id_idx" ON "EconomicDraft"("accountId", "homeId", "state", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "HomeExpense" ADD CONSTRAINT "HomeExpense_analysisDraftId_fkey" FOREIGN KEY ("analysisDraftId") REFERENCES "EconomicDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicAnalysisJob" ADD CONSTRAINT "EconomicAnalysisJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicAnalysisJob" ADD CONSTRAINT "EconomicAnalysisJob_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicAnalysisJob" ADD CONSTRAINT "EconomicAnalysisJob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicDraft" ADD CONSTRAINT "EconomicDraft_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "EconomicAnalysisJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicDraft" ADD CONSTRAINT "EconomicDraft_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicDraft" ADD CONSTRAINT "EconomicDraft_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicDraft" ADD CONSTRAINT "EconomicDraft_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicDraft" ADD CONSTRAINT "EconomicDraft_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "HomeExpense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
