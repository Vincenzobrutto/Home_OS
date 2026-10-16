-- Additive batch foundation, isolated module; existing documents/storage are untouched.
CREATE TABLE "DocumentIntakeBatch" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "homeId" TEXT NOT NULL REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "key" TEXT NOT NULL CHECK ("key" ~ '^[A-Za-z0-9_-]{16,100}$'),
  "digest" TEXT NOT NULL CHECK ("digest" ~ '^[a-f0-9]{64}$'),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0),
  "state" TEXT NOT NULL DEFAULT 'open' CHECK ("state" IN ('open','completed')),
  "totalBytes" INTEGER NOT NULL CHECK ("totalBytes">0 AND "totalBytes"<=209715200),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "DocumentIntakeBatch_accountId_homeId_key_key" ON "DocumentIntakeBatch"("accountId","homeId","key");
CREATE INDEX "DocumentIntakeBatch_accountId_homeId_createdAt_id_idx" ON "DocumentIntakeBatch"("accountId","homeId","createdAt","id");
CREATE TABLE "DocumentIntakeItem" (
  "id" TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL REFERENCES "DocumentIntakeBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "clientItemId" TEXT NOT NULL,
  "ordinal" INTEGER NOT NULL CHECK ("ordinal">=0 AND "ordinal"<20),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0),
  "filename" TEXT NOT NULL CHECK (char_length("filename") BETWEEN 1 AND 120),
  "byteSize" INTEGER NOT NULL CHECK ("byteSize">0 AND "byteSize"<=20971520),
  "mimeType" TEXT NOT NULL CHECK ("mimeType" IN ('application/pdf','image/jpeg','image/png')),
  "uploadState" TEXT NOT NULL DEFAULT 'pending' CHECK ("uploadState" IN ('pending','uploading','stored','duplicate','failed')),
  "analysisState" TEXT NOT NULL DEFAULT 'not_started' CHECK ("analysisState" IN ('not_started','queued','running','ready','needs_choice','unreadable','unsupported','failed','uncertain')),
  "reviewState" TEXT NOT NULL DEFAULT 'unreviewed' CHECK ("reviewState" IN ('unreviewed','saved','deferred','confirmed')),
  "documentId" TEXT REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "documentVersion" INTEGER CHECK ("documentVersion">0),
  "documentSha256" TEXT CHECK ("documentSha256" ~ '^[a-f0-9]{64}$'),
  "pageCount" INTEGER CHECK ("pageCount">0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentIntakeItem_source_check" CHECK (
    ("documentId" IS NULL AND "documentVersion" IS NULL AND "documentSha256" IS NULL AND "uploadState" NOT IN ('stored','duplicate'))
    OR ("documentId" IS NOT NULL AND "documentVersion" IS NOT NULL AND "documentSha256" IS NOT NULL AND "uploadState" IN ('stored','duplicate'))
  )
);
CREATE UNIQUE INDEX "DocumentIntakeItem_batchId_clientItemId_key" ON "DocumentIntakeItem"("batchId","clientItemId");
CREATE UNIQUE INDEX "DocumentIntakeItem_batchId_ordinal_key" ON "DocumentIntakeItem"("batchId","ordinal");
