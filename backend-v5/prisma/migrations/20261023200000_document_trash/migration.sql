-- Cestino lotto 1: documenti nel cestino 30 giorni, segnaposto senza contenuto dopo l'eliminazione definitiva.
-- Additiva: nessun documento esistente cambia stato (trashedAt nullo).
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "lifecycleVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "purgeAfter" TIMESTAMP(3),
ADD COLUMN     "purgedAt" TIMESTAMP(3),
ADD COLUMN     "trashedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TrashRequest" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrashRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletionRecord" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "resourceKind" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "storageKey" TEXT,
    "fileRemovedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrashRequest_accountId_homeId_operation_target_key_key" ON "TrashRequest"("accountId", "homeId", "operation", "target", "key");

-- CreateIndex
CREATE INDEX "DeletionRecord_fileRemovedAt_deletedAt_idx" ON "DeletionRecord"("fileRemovedAt", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeletionRecord_resourceKind_resourceId_key" ON "DeletionRecord"("resourceKind", "resourceId");

-- CreateIndex
CREATE INDEX "Document_homeId_uploaderId_trashedAt_idx" ON "Document"("homeId", "uploaderId", "trashedAt");

-- CreateIndex
CREATE INDEX "Document_purgeAfter_idx" ON "Document"("purgeAfter");

-- AddForeignKey
ALTER TABLE "TrashRequest" ADD CONSTRAINT "TrashRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrashRequest" ADD CONSTRAINT "TrashRequest_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletionRecord" ADD CONSTRAINT "DeletionRecord_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Coerenza del ciclo di vita: scadenza solo nel cestino, eliminazione definitiva solo da cestino.
ALTER TABLE "Document" ADD CONSTRAINT "Document_trash_lifecycle" CHECK (("trashedAt" IS NULL) = ("purgeAfter" IS NULL) AND ("purgedAt" IS NULL OR "trashedAt" IS NOT NULL));
