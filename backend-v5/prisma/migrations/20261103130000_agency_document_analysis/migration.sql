CREATE TABLE "AgencyDocumentAiBudget" (
 "id" TEXT PRIMARY KEY, "agencyId" TEXT NOT NULL, "purpose" TEXT NOT NULL DEFAULT 'DOCUMENT_EXTRACT',
 "configDigest" TEXT NOT NULL, "currency" TEXT NOT NULL, "capMicros" BIGINT NOT NULL,
 "committedMicros" BIGINT NOT NULL DEFAULT 0, "spentMicros" BIGINT NOT NULL DEFAULT 0,
 "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AgencyDocumentAiBudget_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "AgencyDocumentAiBudget_values" CHECK ("purpose"='DOCUMENT_EXTRACT' AND "currency" ~ '^[A-Z]{3}$' AND "capMicros">=0 AND "spentMicros">=0 AND "committedMicros">="spentMicros")
);
CREATE INDEX "AgencyDocumentAiBudget_agencyId_configDigest_expiresAt_idx" ON "AgencyDocumentAiBudget"("agencyId","configDigest","expiresAt");
CREATE TABLE "AgencyDocumentAnalysisOffer" (
 "id" TEXT PRIMARY KEY, "accountId" TEXT NOT NULL, "practiceId" TEXT NOT NULL, "agencyId" TEXT NOT NULL,
 "snapshot" JSONB NOT NULL, "digest" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AgencyDocumentAnalysisOffer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "AgencyDocumentAnalysisOffer_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "AgencyPractice"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AgencyDocumentAnalysisOffer_accountId_practiceId_expiresAt_idx" ON "AgencyDocumentAnalysisOffer"("accountId","practiceId","expiresAt");
CREATE TABLE "AgencyDocumentAnalysisJob" (
 "id" TEXT PRIMARY KEY, "accountId" TEXT NOT NULL, "practiceId" TEXT NOT NULL, "agencyId" TEXT NOT NULL,
 "offerId" TEXT NOT NULL, "budgetId" TEXT NOT NULL, "requestKey" TEXT NOT NULL, "commandDigest" TEXT NOT NULL,
 "proof" JSONB NOT NULL, "configuration" JSONB NOT NULL, "consentReceipt" TEXT NOT NULL, "approvedAt" TIMESTAMP(3) NOT NULL,
 "activeProofKey" TEXT, "state" TEXT NOT NULL DEFAULT 'queued', "version" INTEGER NOT NULL DEFAULT 1,
 "leaseEpoch" INTEGER NOT NULL DEFAULT 0, "leaseTokenHash" TEXT, "leaseUntil" TIMESTAMP(3), "countedInputTokens" INTEGER,
 "recordId" TEXT, "capMicros" BIGINT NOT NULL, "committedMicros" BIGINT NOT NULL, "spentMicros" BIGINT NOT NULL DEFAULT 0,
 "currency" TEXT NOT NULL, "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AgencyDocumentAnalysisJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "AgencyDocumentAnalysisJob_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "AgencyPractice"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "AgencyDocumentAnalysisJob_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "AgencyDocumentAnalysisOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "AgencyDocumentAnalysisJob_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "AgencyDocumentAiBudget"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "AgencyDocumentAnalysisJob_values" CHECK ("version">0 AND "leaseEpoch">=0 AND "capMicros">=0 AND "spentMicros">=0 AND "committedMicros">="spentMicros" AND "state" IN ('queued','leased_before_dispatch','dispatched','completed_with_proposals','completed_unusable','discarded_source_changed','denied_after_revocation','uncertain_no_retry','failed_before_dispatch'))
);
CREATE UNIQUE INDEX "AgencyDocumentAnalysisJob_offerId_key" ON "AgencyDocumentAnalysisJob"("offerId");
CREATE UNIQUE INDEX "AgencyDocumentAnalysisJob_consentReceipt_key" ON "AgencyDocumentAnalysisJob"("consentReceipt");
CREATE UNIQUE INDEX "AgencyDocumentAnalysisJob_activeProofKey_key" ON "AgencyDocumentAnalysisJob"("activeProofKey");
CREATE UNIQUE INDEX "AgencyDocumentAnalysisJob_accountId_practiceId_requestKey_key" ON "AgencyDocumentAnalysisJob"("accountId","practiceId","requestKey");
CREATE INDEX "AgencyDocumentAnalysisJob_state_leaseUntil_createdAt_idx" ON "AgencyDocumentAnalysisJob"("state","leaseUntil","createdAt");
CREATE INDEX "AgencyDocumentAnalysisJob_practiceId_accountId_createdAt_idx" ON "AgencyDocumentAnalysisJob"("practiceId","accountId","createdAt");
CREATE TABLE "AgencyDocumentAnalysisDispatch" (
 "id" TEXT PRIMARY KEY, "jobId" TEXT NOT NULL, "phase" TEXT NOT NULL, "epoch" INTEGER NOT NULL, "capabilityHash" TEXT NOT NULL,
 "payloadDigest" TEXT NOT NULL, "state" TEXT NOT NULL DEFAULT 'dispatched', "providerRequestId" TEXT, "receiptIdentity" TEXT,
 "inputTokens" INTEGER, "outputTokens" INTEGER, "countedInputTokens" INTEGER, "costMicros" BIGINT,
 "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "settledAt" TIMESTAMP(3),
 CONSTRAINT "AgencyDocumentAnalysisDispatch_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AgencyDocumentAnalysisJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "AgencyDocumentAnalysisDispatch_values" CHECK ("phase" IN ('count','generate') AND "state" IN ('dispatched','settled','uncertain') AND "epoch">0)
);
CREATE UNIQUE INDEX "AgencyDocumentAnalysisDispatch_jobId_phase_key" ON "AgencyDocumentAnalysisDispatch"("jobId","phase");
CREATE UNIQUE INDEX "AgencyDocumentAnalysisDispatch_receiptIdentity_key" ON "AgencyDocumentAnalysisDispatch"("receiptIdentity");
