-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "purchased_at" DATE,
ADD COLUMN     "serial_number" TEXT,
ADD COLUMN     "supplier" TEXT;
