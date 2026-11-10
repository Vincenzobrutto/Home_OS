CREATE TABLE "AgencyGiftAcceptanceReceipt" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "practiceId" TEXT NOT NULL,
 "invitationId" TEXT NOT NULL,
 "jobId" TEXT NOT NULL,
 "accountId" TEXT NOT NULL,
 "requestKey" TEXT NOT NULL,
 "commandDigest" TEXT NOT NULL,
 "sourceFingerprint" TEXT NOT NULL,
 "homeId" TEXT NOT NULL,
 "acceptedAt" TIMESTAMP(3) NOT NULL,
 "snapshot" JSONB NOT NULL
);
CREATE UNIQUE INDEX "AgencyGiftAcceptanceReceipt_practiceId_key" ON "AgencyGiftAcceptanceReceipt"("practiceId");
CREATE UNIQUE INDEX "AgencyGiftAcceptanceReceipt_invitationId_key" ON "AgencyGiftAcceptanceReceipt"("invitationId");
CREATE UNIQUE INDEX "AgencyGiftAcceptanceReceipt_jobId_key" ON "AgencyGiftAcceptanceReceipt"("jobId");
CREATE UNIQUE INDEX "AgencyGiftAcceptanceReceipt_accountId_invitationId_requestKey_key" ON "AgencyGiftAcceptanceReceipt"("accountId","invitationId","requestKey");
ALTER TABLE "AgencyGiftAcceptanceReceipt" ADD CONSTRAINT "AgencyGiftAcceptanceReceipt_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "AccountGiftBenefit" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "receiptId" TEXT NOT NULL,
 "accountId" TEXT NOT NULL,
 "offerId" TEXT NOT NULL,
 "offerVersion" INTEGER NOT NULL,
 "startsAt" TIMESTAMP(3) NOT NULL,
 "endsAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AccountGiftBenefit_offer_check" CHECK ("offerId"='dimora-full-access-v1' AND "offerVersion"=1 AND "endsAt">"startsAt")
);
CREATE UNIQUE INDEX "AccountGiftBenefit_receiptId_key" ON "AccountGiftBenefit"("receiptId");
CREATE INDEX "AccountGiftBenefit_accountId_startsAt_endsAt_idx" ON "AccountGiftBenefit"("accountId","startsAt","endsAt");
ALTER TABLE "AccountGiftBenefit" ADD CONSTRAINT "AccountGiftBenefit_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountGiftBenefit" ADD CONSTRAINT "AccountGiftBenefit_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "AgencyGiftAcceptanceReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;