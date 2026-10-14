-- AlterTable
ALTER TABLE "HomeExpense" ADD COLUMN     "amountOrigin" TEXT NOT NULL DEFAULT 'user_declared',
ADD COLUMN     "category" TEXT,
ADD COLUMN     "competenceFrom" TEXT,
ADD COLUMN     "competenceTo" TEXT,
ADD COLUMN     "documentDate" TEXT,
ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "dueOn" TEXT,
ADD COLUMN     "supplier" TEXT,
ADD COLUMN     "workId" TEXT;

ALTER TABLE "HomeExpense" ADD CONSTRAINT "HomeExpense_category_check" CHECK ("category" IS NULL OR "category" IN ('electricity','gas','water','internet_services','condominium_ordinary','condominium_extraordinary','insurance','taxes','maintenance','repairs_works','purchase_replacement','financing','other'));
ALTER TABLE "HomeExpense" ADD CONSTRAINT "HomeExpense_amountOrigin_check" CHECK ("amountOrigin" IN ('user_declared','extraction_confirmed'));
ALTER TABLE "HomeExpense" ADD CONSTRAINT "HomeExpense_competence_check" CHECK (("competenceFrom" IS NULL AND "competenceTo" IS NULL) OR ("competenceFrom" IS NOT NULL AND "competenceTo" IS NOT NULL AND "competenceFrom" <= "competenceTo"));

-- CreateTable
CREATE TABLE "EconomicWork" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "activityId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "EconomicWork_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EconomicWork" ADD CONSTRAINT "EconomicWork_state_check" CHECK (state IN ('active','archived'));
ALTER TABLE "EconomicWork" ADD CONSTRAINT "EconomicWork_version_check" CHECK (version >= 1);

-- CreateTable
CREATE TABLE "EconomicWorkHistory" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "before" JSONB,
    "after" JSONB NOT NULL,

    CONSTRAINT "EconomicWorkHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomicRequest" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EconomicRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EconomicWork_accountId_homeId_state_createdAt_id_idx" ON "EconomicWork"("accountId", "homeId", "state", "createdAt", "id");

-- CreateIndex
CREATE INDEX "EconomicWorkHistory_workId_at_id_idx" ON "EconomicWorkHistory"("workId", "at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "EconomicRequest_accountId_homeId_operation_target_key_key" ON "EconomicRequest"("accountId", "homeId", "operation", "target", "key");

-- CreateIndex
CREATE INDEX "HomeExpense_accountId_homeId_category_state_spentOn_idx" ON "HomeExpense"("accountId", "homeId", "category", "state", "spentOn");

-- CreateIndex
CREATE INDEX "HomeExpense_accountId_homeId_workId_idx" ON "HomeExpense"("accountId", "homeId", "workId");

-- AddForeignKey
ALTER TABLE "HomeExpense" ADD CONSTRAINT "HomeExpense_workId_fkey" FOREIGN KEY ("workId") REFERENCES "EconomicWork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicWork" ADD CONSTRAINT "EconomicWork_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "HomeActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicWork" ADD CONSTRAINT "EconomicWork_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicWork" ADD CONSTRAINT "EconomicWork_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicWorkHistory" ADD CONSTRAINT "EconomicWorkHistory_workId_fkey" FOREIGN KEY ("workId") REFERENCES "EconomicWork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicWorkHistory" ADD CONSTRAINT "EconomicWorkHistory_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicRequest" ADD CONSTRAINT "EconomicRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicRequest" ADD CONSTRAINT "EconomicRequest_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
