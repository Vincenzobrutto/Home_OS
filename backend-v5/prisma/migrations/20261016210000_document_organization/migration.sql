ALTER TABLE "DocumentIntakeItem" ADD COLUMN "selection" JSONB, ADD COLUMN "organizationVersion" INTEGER;
CREATE TABLE "DocumentOrganization" (
 "id" TEXT PRIMARY KEY, "accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
 "homeId" TEXT NOT NULL REFERENCES "Home"("id") ON DELETE RESTRICT,
 "documentId" TEXT NOT NULL REFERENCES "Document"("id") ON DELETE RESTRICT,
 "documentVersion" INTEGER NOT NULL CHECK ("documentVersion">0), "documentSha256" TEXT NOT NULL CHECK ("documentSha256" ~ '^[a-f0-9]{64}$'),
 "version" INTEGER NOT NULL DEFAULT 1 CHECK (version>0), "title" TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
 "parts" JSONB NOT NULL CHECK (jsonb_typeof(parts)='array' AND jsonb_array_length(parts) BETWEEN 1 AND 12),
 "collections" TEXT[] NOT NULL CHECK (cardinality(collections) BETWEEN 1 AND 7 AND collections <@ ARRAY['energy','building','technical','condominium','purchases','utilities','unclassified']::text[]),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "DocumentOrganization_accountId_homeId_documentId_key" ON "DocumentOrganization"("accountId","homeId","documentId");
CREATE INDEX "DocumentOrganization_accountId_homeId_idx" ON "DocumentOrganization"("accountId","homeId");
CREATE TABLE "DocumentIntakeRequest" (
 "id" TEXT PRIMARY KEY, "batchId" TEXT NOT NULL REFERENCES "DocumentIntakeBatch"("id") ON DELETE RESTRICT,
 "operation" TEXT NOT NULL, "key" TEXT NOT NULL, "digest" TEXT NOT NULL, "body" JSONB NOT NULL, "results" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "DocumentIntakeRequest_batchId_operation_key_key" ON "DocumentIntakeRequest"("batchId","operation","key");
