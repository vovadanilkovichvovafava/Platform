-- CreateTable
CREATE TABLE "GoogleDocsScan" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "initialScanData" TEXT,
    "rescanData" TEXT,
    "rescanStatus" TEXT,
    "errorMessage" TEXT,
    "rescanError" TEXT,
    "scannedAt" TIMESTAMP(3),
    "rescannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleDocsScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleDocsScan_submissionId_key" ON "GoogleDocsScan"("submissionId");

-- CreateIndex
CREATE INDEX "GoogleDocsScan_submissionId_idx" ON "GoogleDocsScan"("submissionId");

-- CreateIndex
CREATE INDEX "GoogleDocsScan_status_idx" ON "GoogleDocsScan"("status");

-- AddForeignKey
ALTER TABLE "GoogleDocsScan" ADD CONSTRAINT "GoogleDocsScan_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
