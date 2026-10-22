-- BL-03 storia della casa: eventi personali inseriti dall'utente e richieste idempotenti. Solo tabelle nuove.

-- CreateTable
CREATE TABLE "HomeHistoryEvent" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "day" INTEGER,
    "sortKey" TEXT NOT NULL,
    "documentIds" JSONB NOT NULL DEFAULT '[]',
    "state" TEXT NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeHistoryEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HomeHistoryEvent_state_check" CHECK ("state" IN ('active', 'removed')),
    CONSTRAINT "HomeHistoryEvent_date_check" CHECK ("year" BETWEEN 1800 AND 2200 AND ("month" IS NULL OR "month" BETWEEN 1 AND 12) AND ("day" IS NULL OR ("month" IS NOT NULL AND "day" BETWEEN 1 AND 31)))
);

-- CreateTable
CREATE TABLE "HomeHistoryRequest" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeHistoryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomeHistoryEvent_accountId_homeId_state_sortKey_id_idx" ON "HomeHistoryEvent"("accountId", "homeId", "state", "sortKey", "id");

-- CreateIndex
CREATE UNIQUE INDEX "HomeHistoryRequest_accountId_homeId_operation_target_key_key" ON "HomeHistoryRequest"("accountId", "homeId", "operation", "target", "key");

-- AddForeignKey
ALTER TABLE "HomeHistoryEvent" ADD CONSTRAINT "HomeHistoryEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeHistoryEvent" ADD CONSTRAINT "HomeHistoryEvent_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeHistoryRequest" ADD CONSTRAINT "HomeHistoryRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeHistoryRequest" ADD CONSTRAINT "HomeHistoryRequest_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
