-- Add time tracking fields to Submission for practice module metrics
-- Both fields are nullable with defaults, fully backward-compatible

-- editCount: tracks how many times the student edited after initial submission
ALTER TABLE "Submission" ADD COLUMN "editCount" INTEGER NOT NULL DEFAULT 0;

-- lastEditedAt: timestamp of last student edit (distinct from system updatedAt)
ALTER TABLE "Submission" ADD COLUMN "lastEditedAt" TIMESTAMP(3);
