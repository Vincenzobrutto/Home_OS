-- Saves reviewed, unconfirmed choices separately from verified extraction proposals.
ALTER TABLE "ReceiptDraft" ADD COLUMN "review" JSONB;
ALTER TABLE "ReceiptDraft" ADD CONSTRAINT "ReceiptDraft_review_shape_check" CHECK (
  "review" IS NULL OR (jsonb_typeof("review")='object' AND "review" ? 'object' AND "review" ? 'expense')
);
