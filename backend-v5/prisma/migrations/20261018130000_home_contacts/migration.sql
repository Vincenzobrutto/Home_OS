CREATE TABLE "HomeContact" (
 "id" TEXT PRIMARY KEY, "accountId" TEXT NOT NULL, "homeId" TEXT NOT NULL,
 "name" TEXT NOT NULL, "profession" TEXT, "kind" TEXT NOT NULL DEFAULT 'person',
 "phone" TEXT, "email" TEXT, "fiscalId" TEXT, "note" TEXT,
 "state" TEXT NOT NULL DEFAULT 'active', "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "HomeContact_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "HomeContact_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "HomeContact_accountId_homeId_state_createdAt_id_idx" ON "HomeContact"("accountId","homeId","state","createdAt","id");
CREATE TABLE "ContactResourceLink" (
 "id" TEXT PRIMARY KEY, "contactId" TEXT NOT NULL, "resourceKind" TEXT NOT NULL, "resourceId" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ContactResourceLink_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "HomeContact"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ContactResourceLink_contactId_resourceKind_resourceId_key" ON "ContactResourceLink"("contactId","resourceKind","resourceId");
CREATE INDEX "ContactResourceLink_resourceKind_resourceId_idx" ON "ContactResourceLink"("resourceKind","resourceId");
CREATE TABLE "ContactRequest" (
 "id" TEXT PRIMARY KEY, "accountId" TEXT NOT NULL, "homeId" TEXT NOT NULL, "operation" TEXT NOT NULL,
 "target" TEXT NOT NULL, "key" TEXT NOT NULL, "fingerprint" TEXT NOT NULL, "contactId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ContactRequest_accountId_homeId_operation_target_key_key" ON "ContactRequest"("accountId","homeId","operation","target","key");
