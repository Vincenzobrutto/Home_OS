-- Explicit personal house membership is independent of object links.
-- Existing classifications and links retain their current meaning.
ALTER TABLE "DocumentOrganization" ADD COLUMN "houseDocument" BOOLEAN NOT NULL DEFAULT false;
