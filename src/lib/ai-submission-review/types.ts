/**
 * Types for AI Submission Review feature.
 * Isolated module — does not affect other AI features.
 */

/** Status of AI analysis process */
export type AiReviewStatus = "pending" | "processing" | "completed" | "failed"

/** Question type taxonomy */
export type QuestionType = "knowledge" | "application" | "reflection" | "verification"

/** Difficulty level */
export type QuestionDifficulty = "easy" | "medium" | "hard"

/** Source that the question is based on */
export type QuestionSource = "submission" | "file" | "module" | "trail"

/** Strict JSON format expected from AI */
export interface AiReviewAnalysis {
  shortVerdict: string
  strengths: string[]
  weaknesses: string[]
  gaps: string[]
  riskFlags: string[]
  confidence: number
}

export interface AiReviewQuestion {
  question: string
  type: QuestionType
  difficulty: QuestionDifficulty
  rationale: string
  source: QuestionSource
}

export interface AiReviewCoverage {
  submissionTextUsed: boolean
  fileUsed: boolean
  moduleUsed: boolean
  trailUsed: boolean
  notes: string
}

export interface AiReviewResult {
  analysis: AiReviewAnalysis
  questions: AiReviewQuestion[]
  coverage: AiReviewCoverage
}

/** Context gathered from various sources before AI call */
export interface SubmissionContext {
  /** Student's comment / answer text */
  submissionText: string | null
  /** URL to file/github/deploy */
  fileUrl: string | null
  githubUrl: string | null
  deployUrl: string | null
  /** Module context */
  moduleTitle: string
  moduleDescription: string
  moduleType: string
  moduleContent: string | null
  moduleRequirements: string | null
  /** Trail context */
  trailTitle: string
  trailDescription: string
}

/** What sources were successfully gathered */
export interface SourceCoverageResult {
  submissionTextUsed: boolean
  fileUrlUsed: boolean
  moduleUsed: boolean
  trailUsed: boolean
  notes: string
}

/** DTO for AI review data passed to client components (serialization-safe) */
export interface AiReviewDTO {
  id: string
  submissionId: string
  status: AiReviewStatus
  analysis: AiReviewAnalysis | null
  questions: AiReviewQuestion[] | null
  coverage: AiReviewCoverage | null
  errorMessage: string | null
  startedAt: string | null
  finishedAt: string | null
}
