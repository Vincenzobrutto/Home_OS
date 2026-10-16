ALTER TABLE "DocumentIntakeItem"
  ADD COLUMN "uploadKey" TEXT,
  ADD COLUMN "uploadDigest" TEXT,
  ADD COLUMN "uploadLeaseToken" TEXT,
  ADD COLUMN "uploadLeaseUntil" TIMESTAMP(3),
  ADD COLUMN "uploadError" TEXT;
ALTER TABLE "DocumentIntakeItem" ADD CONSTRAINT "DocumentIntakeItem_upload_request_check" CHECK (
  ("uploadKey" IS NULL AND "uploadDigest" IS NULL)
  OR ("uploadKey" IS NOT NULL AND "uploadDigest" IS NOT NULL AND "uploadKey" ~ '^[A-Za-z0-9_-]{16,100}$' AND "uploadDigest" ~ '^[a-f0-9]{64}$')
);
ALTER TABLE "DocumentIntakeItem" ADD CONSTRAINT "DocumentIntakeItem_upload_lease_check" CHECK (
  ("uploadState"='uploading' AND "uploadLeaseToken" IS NOT NULL AND "uploadLeaseUntil" IS NOT NULL AND "uploadKey" IS NOT NULL AND "uploadError" IS NULL)
  OR ("uploadState"<>'uploading' AND "uploadLeaseToken" IS NULL AND "uploadLeaseUntil" IS NULL)
);
CREATE INDEX "DocumentIntakeItem_uploadState_uploadLeaseUntil_idx" ON "DocumentIntakeItem"("uploadState","uploadLeaseUntil");
