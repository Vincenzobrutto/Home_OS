-- CreateTable
CREATE TABLE "ReceiptDraft" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersion" INTEGER NOT NULL,
    "documentSha256" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "version" INTEGER NOT NULL DEFAULT 1,
    "fields" JSONB NOT NULL DEFAULT '{}',
    "total" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptRequest" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceiptDraft_accountId_homeId_state_createdAt_id_idx" ON "ReceiptDraft"("accountId", "homeId", "state", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ReceiptDraft_accountId_homeId_documentId_documentVersion_do_idx" ON "ReceiptDraft"("accountId", "homeId", "documentId", "documentVersion", "documentSha256");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptRequest_accountId_homeId_operation_target_key_key" ON "ReceiptRequest"("accountId", "homeId", "operation", "target", "key");

-- AddForeignKey
ALTER TABLE "ReceiptDraft" ADD CONSTRAINT "ReceiptDraft_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptDraft" ADD CONSTRAINT "ReceiptDraft_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptDraft" ADD CONSTRAINT "ReceiptDraft_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptRequest" ADD CONSTRAINT "ReceiptRequest_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ReceiptDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptRequest" ADD CONSTRAINT "ReceiptRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptRequest" ADD CONSTRAINT "ReceiptRequest_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReceiptDraft" ADD CONSTRAINT "ReceiptDraft_values_check" CHECK ("version">0 AND "documentVersion">0 AND "documentSha256" ~ '^[a-f0-9]{64}$' AND "mode" IN ('manual','extraction') AND "state" IN ('open','parked','confirmed','partially_resolved') AND jsonb_typeof("fields")='object');
