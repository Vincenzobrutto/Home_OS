CREATE TABLE "AgencyGiftAcceptanceJob" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "practiceId" TEXT NOT NULL,
 "invitationId" TEXT NOT NULL,
 "accountId" TEXT NOT NULL,
 "requestKey" TEXT NOT NULL,
 "commandDigest" TEXT NOT NULL,
 "invitationVersion" INTEGER NOT NULL,
 "invitationSeal" TEXT NOT NULL,
 "sourceFingerprint" TEXT NOT NULL,
 "homeId" TEXT NOT NULL,
 "homeInput" JSONB,
 "manifest" JSONB,
 "preparationDigest" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'queued',
 "version" INTEGER NOT NULL DEFAULT 1,
 "leaseEpoch" INTEGER NOT NULL DEFAULT 0,
 "leaseTokenHash" TEXT,
 "leaseUntil" TIMESTAMP(3),
 "attempts" INTEGER NOT NULL DEFAULT 0,
 "lastError" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AgencyGiftAcceptanceJob_version_check" CHECK ("version">0 AND "invitationVersion">0 AND "leaseEpoch">=0 AND "attempts">=0),
 CONSTRAINT "AgencyGiftAcceptanceJob_state_check" CHECK ("state" IN ('queued','staging','ready','retryable','blocked_review','accepted','cancelled','failed_final')),
 CONSTRAINT "AgencyGiftAcceptanceJob_lease_check" CHECK (("leaseTokenHash" IS NULL)=("leaseUntil" IS NULL)),
 CONSTRAINT "AgencyGiftAcceptanceJob_payload_check" CHECK ("state" IN ('accepted','cancelled','failed_final') OR ("homeInput" IS NOT NULL AND "manifest" IS NOT NULL))
);
CREATE UNIQUE INDEX "AgencyGiftAcceptanceJob_accountId_invitationId_requestKey_key" ON "AgencyGiftAcceptanceJob"("accountId","invitationId","requestKey");
-- A practice is reserved until the job is explicitly terminal. Accepted always remains reserved.
CREATE UNIQUE INDEX "AgencyGiftAcceptanceJob_live_practice_key" ON "AgencyGiftAcceptanceJob"("practiceId") WHERE "state" IN ('queued','staging','ready','retryable','blocked_review','accepted');
CREATE INDEX "AgencyGiftAcceptanceJob_practiceId_state_idx" ON "AgencyGiftAcceptanceJob"("practiceId","state");
CREATE INDEX "AgencyGiftAcceptanceJob_state_leaseUntil_id_idx" ON "AgencyGiftAcceptanceJob"("state","leaseUntil","id");
ALTER TABLE "AgencyGiftAcceptanceJob" ADD CONSTRAINT "AgencyGiftAcceptanceJob_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "AgencyPractice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgencyGiftAcceptanceJob" ADD CONSTRAINT "AgencyGiftAcceptanceJob_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "AgencyGiftInvitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgencyGiftAcceptanceJob" ADD CONSTRAINT "AgencyGiftAcceptanceJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "AgencyGiftAcceptanceItem" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "jobId" TEXT NOT NULL,
 "ordinal" INTEGER NOT NULL,
 "sourceId" TEXT NOT NULL,
 "sourceVersion" INTEGER NOT NULL,
 "sourceSha256" TEXT NOT NULL,
 "documentId" TEXT NOT NULL,
 "documentVersionId" TEXT NOT NULL,
 "storedFileId" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'pending',
 "storageKey" TEXT,
 "control" JSONB,
 "admittedEpoch" INTEGER,
 CONSTRAINT "AgencyGiftAcceptanceItem_ordinal_check" CHECK ("ordinal">=0 AND "sourceVersion">0),
 CONSTRAINT "AgencyGiftAcceptanceItem_state_check" CHECK ("state" IN ('pending','admitted','published','abandoned')),
 CONSTRAINT "AgencyGiftAcceptanceItem_admission_check" CHECK ("state"<>'admitted' OR ("storageKey" IS NOT NULL AND "control" IS NOT NULL AND "admittedEpoch" IS NOT NULL AND "admittedEpoch">0))
);
CREATE UNIQUE INDEX "AgencyGiftAcceptanceItem_jobId_ordinal_key" ON "AgencyGiftAcceptanceItem"("jobId","ordinal");
CREATE UNIQUE INDEX "AgencyGiftAcceptanceItem_jobId_sourceId_key" ON "AgencyGiftAcceptanceItem"("jobId","sourceId");
CREATE UNIQUE INDEX "AgencyGiftAcceptanceItem_documentId_key" ON "AgencyGiftAcceptanceItem"("documentId");
CREATE UNIQUE INDEX "AgencyGiftAcceptanceItem_documentVersionId_key" ON "AgencyGiftAcceptanceItem"("documentVersionId");
CREATE UNIQUE INDEX "AgencyGiftAcceptanceItem_storedFileId_key" ON "AgencyGiftAcceptanceItem"("storedFileId");
CREATE UNIQUE INDEX "AgencyGiftAcceptanceItem_storageKey_key" ON "AgencyGiftAcceptanceItem"("storageKey");
ALTER TABLE "AgencyGiftAcceptanceItem" ADD CONSTRAINT "AgencyGiftAcceptanceItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AgencyGiftAcceptanceJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;