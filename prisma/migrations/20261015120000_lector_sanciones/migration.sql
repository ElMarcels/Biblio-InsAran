-- AlterTable
ALTER TABLE "Reader" ADD COLUMN     "suspendedUntil" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- CreateIndex
CREATE INDEX "Reader_suspendedUntil_idx" ON "Reader"("suspendedUntil");
