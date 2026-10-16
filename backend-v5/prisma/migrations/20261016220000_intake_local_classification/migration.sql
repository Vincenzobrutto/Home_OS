ALTER TABLE "DocumentIntakeItem" ADD COLUMN "proposal" JSONB;
CREATE TABLE "DocumentIntakeAnalysis" (
 "id" TEXT PRIMARY KEY, "itemId" TEXT NOT NULL REFERENCES "DocumentIntakeItem"("id") ON DELETE RESTRICT,
 "key" TEXT NOT NULL, "digest" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','succeeded','failed')),
 "leaseToken" TEXT, "leaseUntil" TIMESTAMP(3), "error" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ((state='running' AND "leaseToken" IS NOT NULL AND "leaseUntil" IS NOT NULL) OR (state<>'running' AND "leaseToken" IS NULL AND "leaseUntil" IS NULL))
);
CREATE UNIQUE INDEX "DocumentIntakeAnalysis_itemId_key_key" ON "DocumentIntakeAnalysis"("itemId","key");
CREATE UNIQUE INDEX "DocumentIntakeAnalysis_active_item" ON "DocumentIntakeAnalysis"("itemId") WHERE state IN ('queued','running');
CREATE INDEX "DocumentIntakeAnalysis_state_leaseUntil_createdAt_idx" ON "DocumentIntakeAnalysis"(state,"leaseUntil","createdAt");
