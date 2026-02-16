-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "trailStatus" TEXT NOT NULL DEFAULT 'LEARNING';

-- CreateIndex
CREATE INDEX "Enrollment_trailId_trailStatus_idx" ON "Enrollment"("trailId", "trailStatus");
