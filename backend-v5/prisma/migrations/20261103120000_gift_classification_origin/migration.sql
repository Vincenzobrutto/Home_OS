ALTER TABLE "DocumentOrganization" ADD COLUMN "classificationOrigin" TEXT NOT NULL DEFAULT 'user_declared';
ALTER TABLE "DocumentOrganization" ADD CONSTRAINT "DocumentOrganization_classificationOrigin_check" CHECK ("classificationOrigin" IN ('user_declared', 'agency_gift'));
