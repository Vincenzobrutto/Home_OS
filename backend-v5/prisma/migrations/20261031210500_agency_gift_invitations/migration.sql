CREATE TABLE "AgencyGiftInvitation" (
 "id" TEXT NOT NULL,
 "agencyId" TEXT NOT NULL,
 "practiceId" TEXT NOT NULL,
 "issuerAccountId" TEXT NOT NULL,
 "creationKey" TEXT NOT NULL,
 "creationDigest" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL,
 "version" INTEGER NOT NULL,
 "state" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "claimedAccountId" TEXT,
 "snapshot" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AgencyGiftInvitation_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AgencyGiftInvitation_version_check" CHECK ("version">0),
 CONSTRAINT "AgencyGiftInvitation_state_check" CHECK ("state" IN ('invited','claimed','revoked')),
 CONSTRAINT "AgencyGiftInvitation_claim_check" CHECK (("state"='invited' AND "claimedAccountId" IS NULL) OR ("state"='claimed' AND "claimedAccountId" IS NOT NULL) OR "state"='revoked')
);
CREATE UNIQUE INDEX "AgencyGiftInvitation_tokenHash_key" ON "AgencyGiftInvitation"("tokenHash");
CREATE UNIQUE INDEX "AgencyGiftInvitation_practiceId_issuerAccountId_creationKey_key" ON "AgencyGiftInvitation"("practiceId","issuerAccountId","creationKey");
CREATE INDEX "AgencyGiftInvitation_agencyId_practiceId_state_idx" ON "AgencyGiftInvitation"("agencyId","practiceId","state");
CREATE INDEX "AgencyGiftInvitation_expiresAt_id_idx" ON "AgencyGiftInvitation"("expiresAt","id");
ALTER TABLE "AgencyGiftInvitation" ADD CONSTRAINT "AgencyGiftInvitation_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgencyGiftInvitation" ADD CONSTRAINT "AgencyGiftInvitation_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "AgencyPractice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgencyGiftInvitation" ADD CONSTRAINT "AgencyGiftInvitation_issuerAccountId_fkey" FOREIGN KEY ("issuerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgencyGiftInvitation" ADD CONSTRAINT "AgencyGiftInvitation_claimedAccountId_fkey" FOREIGN KEY ("claimedAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
