-- BL-01: prossimo promemoria proposto dopo il completamento. Additiva: un'attività può avere al più un successivo.
ALTER TABLE "HomeActivity" ADD COLUMN "previousActivityId" TEXT;
CREATE UNIQUE INDEX "HomeActivity_previousActivityId_key" ON "HomeActivity"("previousActivityId");
ALTER TABLE "HomeActivity" ADD CONSTRAINT "HomeActivity_previousActivityId_fkey" FOREIGN KEY ("previousActivityId") REFERENCES "HomeActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HomeActivity" ADD CONSTRAINT "HomeActivity_previous_not_self" CHECK ("previousActivityId" IS NULL OR "previousActivityId" <> "id");
