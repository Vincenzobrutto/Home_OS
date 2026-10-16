ALTER TABLE "Account" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3), ADD COLUMN "requiresEmailVerification" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "AuthChallenge" (
  "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "purpose" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL, "emailFingerprint" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3),
  "deliveryState" TEXT NOT NULL DEFAULT 'queued', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthChallenge_purpose_check" CHECK ("purpose" IN ('reset_password','verify_email')),
  CONSTRAINT "AuthChallenge_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AuthChallenge_tokenHash_key" ON "AuthChallenge"("tokenHash");
CREATE INDEX "AuthChallenge_accountId_purpose_expiresAt_idx" ON "AuthChallenge"("accountId","purpose","expiresAt");
CREATE INDEX "AuthChallenge_expiresAt_idx" ON "AuthChallenge"("expiresAt");
CREATE TABLE "AuthThrottle" ("key" TEXT NOT NULL,"count" INTEGER NOT NULL,"expiresAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "AuthThrottle_pkey" PRIMARY KEY ("key"));
CREATE INDEX "AuthThrottle_expiresAt_idx" ON "AuthThrottle"("expiresAt");
