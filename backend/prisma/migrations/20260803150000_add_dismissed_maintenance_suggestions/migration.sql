CREATE TABLE "dismissed_maintenance_suggestions" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "guideline_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dismissed_maintenance_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dismissed_maintenance_suggestions_asset_id_guideline_code_key" ON "dismissed_maintenance_suggestions"("asset_id", "guideline_code");

ALTER TABLE "dismissed_maintenance_suggestions" ADD CONSTRAINT "dismissed_maintenance_suggestions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
