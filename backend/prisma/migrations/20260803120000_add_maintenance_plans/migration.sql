CREATE TYPE "MaintenanceRecurrenceUnit" AS ENUM ('NONE', 'DAY', 'MONTH', 'YEAR');

CREATE TABLE "maintenance_plans" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "recurrence_unit" "MaintenanceRecurrenceUnit" NOT NULL DEFAULT 'NONE',
    "recurrence_interval" INTEGER NOT NULL DEFAULT 1,
    "next_due_at" DATE NOT NULL,
    "reminder_days_before" INTEGER NOT NULL DEFAULT 30,
    "preferred_contact_id" TEXT,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "paused_at" TIMESTAMP(3),
    "completed_at" DATE,
    "last_completed_at" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "maintenance_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maintenance_occurrences" (
    "id" TEXT NOT NULL,
    "maintenance_plan_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "scheduled_for" DATE NOT NULL,
    "completed_at" DATE NOT NULL,
    "contact_id" TEXT,
    "document_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "maintenance_occurrences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "maintenance_plans_asset_id_next_due_at_idx" ON "maintenance_plans"("asset_id", "next_due_at");
CREATE INDEX "maintenance_occurrences_maintenance_plan_id_completed_at_idx" ON "maintenance_occurrences"("maintenance_plan_id", "completed_at");

ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_preferred_contact_id_fkey" FOREIGN KEY ("preferred_contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maintenance_occurrences" ADD CONSTRAINT "maintenance_occurrences_maintenance_plan_id_fkey" FOREIGN KEY ("maintenance_plan_id") REFERENCES "maintenance_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_occurrences" ADD CONSTRAINT "maintenance_occurrences_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_occurrences" ADD CONSTRAINT "maintenance_occurrences_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maintenance_occurrences" ADD CONSTRAINT "maintenance_occurrences_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
