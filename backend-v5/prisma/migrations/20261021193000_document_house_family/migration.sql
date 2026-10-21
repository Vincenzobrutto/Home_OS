-- User-selected family is independent of document type and resource links.
ALTER TABLE "DocumentOrganization" ADD COLUMN "houseFamily" TEXT;
ALTER TABLE "DocumentOrganization" ADD CONSTRAINT "DocumentOrganization_houseFamily_check"
CHECK ("houseFamily" IS NULL OR "houseFamily" IN ('plans','building','energy','contracts','other'));
