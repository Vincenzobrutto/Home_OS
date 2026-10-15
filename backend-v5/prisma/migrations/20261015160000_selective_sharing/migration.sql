CREATE TABLE "SharePreview" (
 "id" TEXT PRIMARY KEY, "senderId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
 "homeId" TEXT NOT NULL REFERENCES "Home"("id") ON DELETE RESTRICT,
 "recipientKind" TEXT NOT NULL CHECK ("recipientKind" IN ('member','external')), "recipientId" TEXT,
 "manifest" JSONB NOT NULL, "fingerprint" TEXT NOT NULL, "validUntil" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "consumedBy" TEXT UNIQUE,
 CHECK (("recipientKind"='member' AND "recipientId" IS NOT NULL) OR ("recipientKind"='external' AND "recipientId" IS NULL))
);
CREATE INDEX "SharePreview_senderId_homeId_createdAt_idx" ON "SharePreview"("senderId","homeId","createdAt");
CREATE TABLE "ShareRecord" (
 "id" TEXT PRIMARY KEY, "senderId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
 "homeId" TEXT NOT NULL REFERENCES "Home"("id") ON DELETE RESTRICT,
 "recipientKind" TEXT NOT NULL CHECK ("recipientKind" IN ('member','external')),
 "recipientId" TEXT REFERENCES "Account"("id") ON DELETE RESTRICT,
 "state" TEXT NOT NULL CHECK ("state" IN ('awaiting_pairing','awaiting_confirmation','pending','accepted','declined','revoked')),
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0), "manifest" JSONB NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL, "codeHash" TEXT UNIQUE, "codeExpiresAt" TIMESTAMP(3), "claimId" TEXT UNIQUE,
 "claimAccountId" TEXT REFERENCES "Account"("id") ON DELETE RESTRICT, "comparisonCode" TEXT,
 "claimExpiresAt" TIMESTAMP(3), "pairConfirmedAt" TIMESTAMP(3), "acceptedAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK (("state" IN ('pending','accepted','declined') AND "recipientId" IS NOT NULL) OR "state" IN ('awaiting_pairing','awaiting_confirmation','revoked')),
 CHECK ("state"<>'awaiting_confirmation' OR ("claimAccountId" IS NOT NULL AND "claimId" IS NOT NULL AND "comparisonCode" IS NOT NULL AND "claimExpiresAt" IS NOT NULL))
);
CREATE INDEX "ShareRecord_senderId_homeId_createdAt_id_idx" ON "ShareRecord"("senderId","homeId","createdAt","id");
CREATE INDEX "ShareRecord_recipientId_createdAt_id_idx" ON "ShareRecord"("recipientId","createdAt","id");
CREATE INDEX "ShareRecord_claimAccountId_createdAt_id_idx" ON "ShareRecord"("claimAccountId","createdAt","id");
CREATE TABLE "ShareRequest" (
 "id" TEXT PRIMARY KEY, "accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
 "key" TEXT NOT NULL, "digest" TEXT NOT NULL, "resourceKind" TEXT NOT NULL, "resourceId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("accountId","key")
);
CREATE TABLE "ShareEvent" (
 "id" TEXT PRIMARY KEY, "shareId" TEXT NOT NULL REFERENCES "ShareRecord"("id") ON DELETE RESTRICT,
 "actorId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
 "kind" TEXT NOT NULL, "version" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ShareEvent_shareId_createdAt_idx" ON "ShareEvent"("shareId","createdAt");
CREATE TABLE "ShareThrottle" ("key" TEXT PRIMARY KEY,"windowStart" TIMESTAMP(3) NOT NULL,"attempts" INTEGER NOT NULL CHECK("attempts">0));
CREATE INDEX "ShareThrottle_windowStart_idx" ON "ShareThrottle"("windowStart");
