-- Contracts are already accepted by Document Intake. Align its persistence constraint.
-- No document, file, organization or reference is rewritten.
ALTER TABLE "DocumentOrganization" DROP CONSTRAINT "DocumentOrganization_collections_check";
ALTER TABLE "DocumentOrganization" ADD CONSTRAINT "DocumentOrganization_collections_check"
 CHECK (cardinality(collections) BETWEEN 1 AND 8 AND collections <@ ARRAY['contracts','energy','building','technical','condominium','purchases','utilities','unclassified']::text[]);
