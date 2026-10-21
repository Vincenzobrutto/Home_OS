-- Expand the allowed vocabulary only. Existing choices, sources and links are untouched.
ALTER TABLE "DocumentOrganization" DROP CONSTRAINT "DocumentOrganization_houseFamily_check";
ALTER TABLE "DocumentOrganization" ADD CONSTRAINT "DocumentOrganization_houseFamily_check"
CHECK ("houseFamily" IS NULL OR "houseFamily" IN ('plans','building','energy','contracts','other','property','condo','utilities','works','tax','insurance','warranty','safety','unclassified'));
