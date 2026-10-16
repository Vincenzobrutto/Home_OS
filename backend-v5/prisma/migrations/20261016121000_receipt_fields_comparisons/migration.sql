-- CreateTable
CREATE TABLE "ReceiptObjectField" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "documentId" TEXT,
    "documentVersion" INTEGER,
    "documentSha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptObjectField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptComparison" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "targetVersion" INTEGER NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "proposed" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptComparison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceiptObjectField_accountId_homeId_objectId_idx" ON "ReceiptObjectField"("accountId", "homeId", "objectId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptObjectField_objectId_fieldKey_key" ON "ReceiptObjectField"("objectId", "fieldKey");

-- CreateIndex
CREATE INDEX "ReceiptComparison_accountId_homeId_state_createdAt_id_idx" ON "ReceiptComparison"("accountId", "homeId", "state", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptComparison_accountId_homeId_objectId_fieldKey_finger_key" ON "ReceiptComparison"("accountId", "homeId", "objectId", "fieldKey", "fingerprint");

-- AddForeignKey
ALTER TABLE "ReceiptObjectField" ADD CONSTRAINT "ReceiptObjectField_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptObjectField" ADD CONSTRAINT "ReceiptObjectField_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptObjectField" ADD CONSTRAINT "ReceiptObjectField_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "HomeObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptObjectField" ADD CONSTRAINT "ReceiptObjectField_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptComparison" ADD CONSTRAINT "ReceiptComparison_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptComparison" ADD CONSTRAINT "ReceiptComparison_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptComparison" ADD CONSTRAINT "ReceiptComparison_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ReceiptDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptComparison" ADD CONSTRAINT "ReceiptComparison_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "HomeObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReceiptObjectField" ADD CONSTRAINT "ReceiptObjectField_values_check" CHECK ("version">0 AND "fieldKey" IN ('name','brand','model') AND char_length(btrim("value")) BETWEEN 1 AND 120 AND ("fieldKey"<>'brand' OR char_length("value")<=80) AND jsonb_typeof("sources")='array' AND (("origin"='user_declared' AND "documentId" IS NULL AND "documentVersion" IS NULL AND "documentSha256" IS NULL AND "sources"='[]'::jsonb) OR ("origin"='extraction_confirmed' AND "documentId" IS NOT NULL AND "documentVersion">0 AND "documentSha256" ~ '^[a-f0-9]{64}$' AND jsonb_array_length("sources")>0)));
ALTER TABLE "ReceiptComparison" ADD CONSTRAINT "ReceiptComparison_values_check" CHECK ("version">0 AND "targetVersion">0 AND "fieldKey" IN ('brand','model') AND "state" IN ('open','resolved') AND "fingerprint" ~ '^[a-f0-9]{64}$' AND jsonb_typeof("proposed")='object');
