-- Additive only. No inference or rewrite of existing service periods.
ALTER TABLE "HomeExpense" ADD COLUMN "invoiceMonth" TEXT;
ALTER TABLE "HomeExpense" ADD CONSTRAINT "HomeExpense_invoiceMonth_check"
  CHECK ("invoiceMonth" IS NULL OR
    ("invoiceMonth" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND left("invoiceMonth",4) <> '0000'));
