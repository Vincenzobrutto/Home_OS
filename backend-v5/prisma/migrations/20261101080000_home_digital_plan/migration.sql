CREATE TABLE "HomeDigitalPlan" (
"id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "homeId" TEXT NOT NULL, "documentId" TEXT NOT NULL,
"documentVersion" INTEGER NOT NULL, "documentSha256" TEXT NOT NULL,
"version" INTEGER NOT NULL DEFAULT 1, "geometryRevision" INTEGER NOT NULL DEFAULT 1,
"received" JSONB NOT NULL, "layout" JSONB NOT NULL, "roomBindings" JSONB NOT NULL, "pins" JSONB NOT NULL DEFAULT '[]',
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "HomeDigitalPlan_pkey" PRIMARY KEY ("id"),
CONSTRAINT "HomeDigitalPlan_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
CONSTRAINT "HomeDigitalPlan_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "HomeDigitalPlan_documentId_key" ON "HomeDigitalPlan"("documentId");
CREATE INDEX "HomeDigitalPlan_accountId_homeId_idx" ON "HomeDigitalPlan"("accountId","homeId");
