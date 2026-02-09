-- CreateTable
CREATE TABLE "AiSubmissionReview" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "analysisSummary" TEXT,
    "questions" TEXT,
    "sourceCoverage" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSubmissionReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiSubmissionReview_submissionId_key" ON "AiSubmissionReview"("submissionId");

-- CreateIndex
CREATE INDEX "AiSubmissionReview_submissionId_idx" ON "AiSubmissionReview"("submissionId");

-- CreateIndex
CREATE INDEX "AiSubmissionReview_status_idx" ON "AiSubmissionReview"("status");

-- AddForeignKey
ALTER TABLE "AiSubmissionReview" ADD CONSTRAINT "AiSubmissionReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
