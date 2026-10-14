CREATE TABLE "HomeRoom" (
 "id" TEXT PRIMARY KEY, "homeId" TEXT NOT NULL REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "name" TEXT NOT NULL,"type" TEXT NOT NULL,"note" TEXT,"state" TEXT NOT NULL DEFAULT 'active' CHECK ("state" IN ('active','archived')),
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "HomeRoom_homeId_state_createdAt_id_idx" ON "HomeRoom"("homeId","state","createdAt","id");
CREATE TABLE "HomeObject" (
 "id" TEXT PRIMARY KEY,"accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"homeId" TEXT NOT NULL REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "name" TEXT NOT NULL,"type" TEXT NOT NULL,"note" TEXT,"state" TEXT NOT NULL DEFAULT 'active' CHECK ("state" IN ('active','archived')),
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "HomeObject_accountId_homeId_state_createdAt_id_idx" ON "HomeObject"("accountId","homeId","state","createdAt","id");
CREATE TABLE "ObjectPosition" (
 "id" TEXT PRIMARY KEY,"accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"homeId" TEXT NOT NULL REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "objectId" TEXT UNIQUE REFERENCES "HomeObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"boilerId" TEXT UNIQUE REFERENCES "BoilerAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0),"roomIds" JSONB NOT NULL CHECK(jsonb_typeof("roomIds")='array' AND jsonb_array_length("roomIds")<=20),
 CHECK (("objectId" IS NOT NULL)::int + ("boilerId" IS NOT NULL)::int=1)
);
CREATE TABLE "ObjectResourceLink" (
 "id" TEXT PRIMARY KEY,"accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"homeId" TEXT NOT NULL REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "objectId" TEXT REFERENCES "HomeObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"boilerId" TEXT REFERENCES "BoilerAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "resourceType" TEXT NOT NULL,"resourceId" TEXT NOT NULL,
 "documentId" TEXT REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"activityId" TEXT REFERENCES "HomeActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"expenseId" TEXT REFERENCES "HomeExpense"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "state" TEXT NOT NULL DEFAULT 'active' CHECK("state" IN('active','removed')),"version" INTEGER NOT NULL DEFAULT 1 CHECK("version">0),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK (("objectId" IS NOT NULL)::int + ("boilerId" IS NOT NULL)::int=1),
 CHECK (("resourceType"='document' AND "documentId"="resourceId" AND "activityId" IS NULL AND "expenseId" IS NULL) OR ("resourceType"='activity' AND "activityId"="resourceId" AND "documentId" IS NULL AND "expenseId" IS NULL) OR ("resourceType"='expense' AND "expenseId"="resourceId" AND "documentId" IS NULL AND "activityId" IS NULL))
);
CREATE INDEX "ObjectResourceLink_accountId_homeId_resourceType_state_createdAt_id_idx" ON "ObjectResourceLink"("accountId","homeId","resourceType","state","createdAt","id");
CREATE UNIQUE INDEX "ObjectResourceLink_one_primary" ON "ObjectResourceLink"("accountId","homeId","resourceType","resourceId") WHERE "state"='active' AND "resourceType" IN('activity','expense');
CREATE UNIQUE INDEX "ObjectResourceLink_same_target" ON "ObjectResourceLink"("accountId","homeId","resourceType","resourceId",COALESCE("objectId","boilerId")) WHERE "state"='active';
CREATE TABLE "ObjectEvent" (
 "id" TEXT PRIMARY KEY,"accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"homeId" TEXT NOT NULL REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "targetKind" TEXT NOT NULL,"targetId" TEXT NOT NULL,"kind" TEXT NOT NULL,"at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"before" JSONB,"after" JSONB NOT NULL
);
CREATE INDEX "ObjectEvent_homeId_targetKind_targetId_at_id_idx" ON "ObjectEvent"("homeId","targetKind","targetId","at","id");
CREATE TABLE "ObjectRequest" (
 "id" TEXT PRIMARY KEY,"accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"homeId" TEXT NOT NULL REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "operation" TEXT NOT NULL,"target" TEXT NOT NULL,"key" TEXT NOT NULL,"digest" TEXT NOT NULL,"response" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("accountId","homeId","operation","target","key")
);
