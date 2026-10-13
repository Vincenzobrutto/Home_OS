CREATE TYPE "ExpenseState" AS ENUM ('active', 'archived');
CREATE TABLE "HomeExpense" (
 "id" TEXT PRIMARY KEY, "accountId" TEXT NOT NULL, "homeId" TEXT NOT NULL, "documentId" TEXT, "assetId" TEXT,
 "title" TEXT NOT NULL, "amountCents" INTEGER NOT NULL CHECK ("amountCents" BETWEEN 1 AND 999999999), "spentOn" TEXT NOT NULL,
 "note" TEXT, "state" "ExpenseState" NOT NULL DEFAULT 'active', "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "archivedAt" TIMESTAMP(3),
 FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("assetId") REFERENCES "BoilerAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "HomeExpense_accountId_homeId_state_spentOn_createdAt_id_idx" ON "HomeExpense"("accountId","homeId","state","spentOn","createdAt","id");
CREATE INDEX "HomeExpense_accountId_homeId_documentId_idx" ON "HomeExpense"("accountId","homeId","documentId");
CREATE INDEX "HomeExpense_accountId_homeId_assetId_idx" ON "HomeExpense"("accountId","homeId","assetId");
CREATE TABLE "ExpenseHistory" (
 "id" TEXT PRIMARY KEY, "expenseId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "kind" TEXT NOT NULL, "note" TEXT, "before" JSONB, "after" JSONB NOT NULL,
 FOREIGN KEY ("expenseId") REFERENCES "HomeExpense"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ExpenseHistory_expenseId_at_id_idx" ON "ExpenseHistory"("expenseId","at","id");
CREATE TABLE "ExpenseRequest" (
 "id" TEXT PRIMARY KEY, "accountId" TEXT NOT NULL, "homeId" TEXT NOT NULL, "operation" TEXT NOT NULL, "target" TEXT NOT NULL,
 "key" TEXT NOT NULL, "digest" TEXT NOT NULL, "response" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ExpenseRequest_accountId_homeId_operation_target_key_key" ON "ExpenseRequest"("accountId","homeId","operation","target","key");
