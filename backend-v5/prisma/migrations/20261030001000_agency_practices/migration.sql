-- Agency scopes do not inherit Home membership or original document access.
CREATE TABLE "Agency" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "AgencyMember" (
 "id" TEXT NOT NULL PRIMARY KEY, "agencyId" TEXT NOT NULL REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "role" TEXT NOT NULL CHECK ("role" IN ('admin','agent','viewer')),
 "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "validUntil" TIMESTAMP(3), "revokedAt" TIMESTAMP(3),
 CHECK ("validUntil" IS NULL OR "validUntil">"validFrom")
);
CREATE UNIQUE INDEX "AgencyMember_agencyId_accountId_key" ON "AgencyMember"("agencyId","accountId");
CREATE TABLE "AgencyPractice" (
 "id" TEXT NOT NULL PRIMARY KEY, "agencyId" TEXT NOT NULL REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "label" TEXT NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision">0),
 "snapshotVersion" INTEGER NOT NULL DEFAULT 1 CHECK ("snapshotVersion"=1), "snapshot" JSONB NOT NULL CHECK (jsonb_typeof("snapshot")='object'),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AgencyPractice_agencyId_createdAt_id_idx" ON "AgencyPractice"("agencyId","createdAt","id");
CREATE TABLE "AgencyPracticeGrant" (
 "id" TEXT NOT NULL PRIMARY KEY, "practiceId" TEXT NOT NULL REFERENCES "AgencyPractice"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "access" TEXT NOT NULL CHECK ("access" IN ('read','edit')), "canExport" BOOLEAN NOT NULL DEFAULT false,
 "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "validUntil" TIMESTAMP(3), "revokedAt" TIMESTAMP(3),
 CHECK ("validUntil" IS NULL OR "validUntil">"validFrom")
);
CREATE UNIQUE INDEX "AgencyPracticeGrant_practiceId_accountId_key" ON "AgencyPracticeGrant"("practiceId","accountId");
CREATE TABLE "AgencyCreateRequest" (
 "id" TEXT NOT NULL PRIMARY KEY, "agencyId" TEXT NOT NULL REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "key" TEXT NOT NULL, "digest" TEXT NOT NULL, "practiceId" TEXT NOT NULL REFERENCES "AgencyPractice"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AgencyCreateRequest_agencyId_accountId_key_key" ON "AgencyCreateRequest"("agencyId","accountId","key");
