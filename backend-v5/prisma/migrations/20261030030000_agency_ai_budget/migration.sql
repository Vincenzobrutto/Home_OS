CREATE TABLE "AgencyAiBudget" (
 "id" TEXT PRIMARY KEY, "agencyId" TEXT NOT NULL REFERENCES "Agency"("id") ON DELETE RESTRICT,
 "capMicros" BIGINT NOT NULL CHECK ("capMicros">0 AND "capMicros"<=1000000000),
 "committedMicros" BIGINT NOT NULL DEFAULT 0, "spentMicros" BIGINT NOT NULL DEFAULT 0,
 "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3),
 CHECK ("spentMicros">=0 AND "committedMicros">="spentMicros")
);
CREATE FUNCTION "agency_budget_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW."agencyId",NEW."capMicros",NEW."expiresAt") IS DISTINCT FROM ROW(OLD."agencyId",OLD."capMicros",OLD."expiresAt") OR NEW."spentMicros"<OLD."spentMicros" OR (OLD."revokedAt" IS NOT NULL AND NEW."revokedAt" IS DISTINCT FROM OLD."revokedAt") THEN RAISE EXCEPTION 'agency_budget_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "agency_budget_immutable" BEFORE UPDATE ON "AgencyAiBudget" FOR EACH ROW EXECUTE FUNCTION "agency_budget_immutable"();
CREATE TABLE "AgencyPlanAuthorization" (
 "id" TEXT PRIMARY KEY, "budgetId" TEXT NOT NULL REFERENCES "AgencyAiBudget"("id") ON DELETE RESTRICT,
 "practiceId" TEXT NOT NULL REFERENCES "AgencyPractice"("id") ON DELETE RESTRICT,
 "accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
 "approvalReceipt" TEXT NOT NULL UNIQUE, "proof" JSONB NOT NULL,
 "capMicros" BIGINT NOT NULL CHECK ("capMicros">0 AND "capMicros"<=2000000),
 "committedMicros" BIGINT NOT NULL DEFAULT 0, "spentMicros" BIGINT NOT NULL DEFAULT 0,
 "priceVersion" TEXT NOT NULL, "model" TEXT NOT NULL,
 "inputMicrosPerMillion" INTEGER NOT NULL CHECK ("inputMicrosPerMillion">=0 AND "inputMicrosPerMillion"<=1000000000),
 "outputMicrosPerMillion" INTEGER NOT NULL CHECK ("outputMicrosPerMillion">=0 AND "outputMicrosPerMillion"<=1000000000),
 "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "runId" TEXT UNIQUE,
 "state" TEXT NOT NULL DEFAULT 'issued' CHECK ("state" IN ('issued','bound','closed')),
 CHECK ("spentMicros">=0 AND "committedMicros">="spentMicros"),
 CHECK (("state"='issued' AND "runId" IS NULL AND "committedMicros"=0 AND "spentMicros"=0) OR ("state"<>'issued' AND "runId" IS NOT NULL))
);
CREATE FUNCTION "agency_authorization_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW."budgetId",NEW."practiceId",NEW."accountId",NEW."approvalReceipt",NEW."proof",NEW."capMicros",NEW."priceVersion",NEW."model",NEW."inputMicrosPerMillion",NEW."outputMicrosPerMillion",NEW."expiresAt") IS DISTINCT FROM ROW(OLD."budgetId",OLD."practiceId",OLD."accountId",OLD."approvalReceipt",OLD."proof",OLD."capMicros",OLD."priceVersion",OLD."model",OLD."inputMicrosPerMillion",OLD."outputMicrosPerMillion",OLD."expiresAt") OR NEW."spentMicros"<OLD."spentMicros" OR (OLD."runId" IS NOT NULL AND NEW."runId" IS DISTINCT FROM OLD."runId") OR (OLD."revokedAt" IS NOT NULL AND NEW."revokedAt" IS DISTINCT FROM OLD."revokedAt") OR (OLD."state"='closed' AND NEW."state"<>'closed') OR (OLD."state"='bound' AND NEW."state"='issued') THEN RAISE EXCEPTION 'agency_authorization_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "agency_authorization_immutable" BEFORE UPDATE ON "AgencyPlanAuthorization" FOR EACH ROW EXECUTE FUNCTION "agency_authorization_immutable"();
