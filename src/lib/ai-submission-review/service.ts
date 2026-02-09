/**
 * AI Submission Review Service — orchestrates the full review pipeline.
 * Isolated module — does not affect student AI profile or AI trail import.
 *
 * Pipeline:
 * 1. Create/find AiSubmissionReview record (idempotent)
 * 2. Collect context from submission + module + trail
 * 3. Call Claude API with structured prompt
 * 4. Parse and validate JSON response
 * 5. Save result to DB
 */
import { prisma } from "@/lib/prisma"
import { collectSubmissionContext } from "./context-collector"
import { buildUserPrompt, getSystemPrompt } from "./prompt-builder"
import type { AiReviewResult, AiReviewDTO } from "./types"

// AI API configuration — reuses same env vars as other AI features
const AI_API_ENDPOINT =
  process.env.AI_API_ENDPOINT || "https://api.anthropic.com/v1/messages"
const AI_API_KEY = process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY
const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-4-5-20241022"
const ANTHROPIC_VERSION = "2023-06-01"

const LOG_PREFIX = "[AI-SubmissionReview]"

/**
 * Check if AI review service is available (API key configured).
 */
export function isAiReviewAvailable(): boolean {
  return !!AI_API_KEY
}

/**
 * Run AI review for a submission. Idempotent — will not create duplicates.
 * Returns the review record ID.
 *
 * This is the main entry point, called asynchronously after submission creation.
 */
export async function runAiSubmissionReview(
  submissionId: string,
  options?: { force?: boolean }
): Promise<string> {
  const startTime = Date.now()
  const force = options?.force ?? false

  // Step 1: Idempotent upsert — create or find existing record
  let review = await prisma.aiSubmissionReview.findUnique({
    where: { submissionId },
  })

  if (review && review.status === "completed" && !force) {
    console.log(`${LOG_PREFIX} Review already completed for ${submissionId}`)
    return review.id
  }

  if (review && review.status === "processing") {
    // Another process is already working — skip to prevent race condition
    console.log(`${LOG_PREFIX} Review already processing for ${submissionId}`)
    return review.id
  }

  if (!review) {
    review = await prisma.aiSubmissionReview.create({
      data: {
        submissionId,
        status: "processing",
        startedAt: new Date(),
      },
    })
  } else {
    // Reset completed (force) or failed review for retry
    review = await prisma.aiSubmissionReview.update({
      where: { id: review.id },
      data: {
        status: "processing",
        startedAt: new Date(),
        errorMessage: null,
        analysisSummary: null,
        questions: null,
        sourceCoverage: null,
        finishedAt: null,
      },
    })
  }

  try {
    // Step 2: Collect context
    const collectStart = Date.now()
    const { context, coverage } = await collectSubmissionContext(submissionId)
    console.log(
      `${LOG_PREFIX} Context collected in ${Date.now() - collectStart}ms`
    )

    // Step 3: Build prompt and call AI
    const aiCallStart = Date.now()
    const userPrompt = buildUserPrompt(context)
    const result = await callAiApi(userPrompt)
    console.log(
      `${LOG_PREFIX} AI call completed in ${Date.now() - aiCallStart}ms`
    )

    // Step 4: Parse response
    const parseStart = Date.now()
    const parsed = parseAiResponse(result)
    console.log(
      `${LOG_PREFIX} Response parsed in ${Date.now() - parseStart}ms`
    )

    // Step 5: Save to DB
    const saveStart = Date.now()
    await prisma.aiSubmissionReview.update({
      where: { id: review.id },
      data: {
        status: "completed",
        analysisSummary: JSON.stringify(parsed.analysis),
        questions: JSON.stringify(parsed.questions),
        sourceCoverage: JSON.stringify({
          ...parsed.coverage,
          // Merge our actual coverage with AI's self-reported coverage
          notes: `${coverage.notes}. AI: ${parsed.coverage.notes}`,
        }),
        finishedAt: new Date(),
      },
    })
    console.log(
      `${LOG_PREFIX} Saved in ${Date.now() - saveStart}ms. Total: ${Date.now() - startTime}ms`
    )

    return review.id
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error"
    console.error(`${LOG_PREFIX} Error for ${submissionId}:`, errorMsg)

    // Mark as failed — can be retried later
    await prisma.aiSubmissionReview
      .update({
        where: { id: review.id },
        data: {
          status: "failed",
          errorMessage: errorMsg.slice(0, 500),
          finishedAt: new Date(),
        },
      })
      .catch((dbErr) => {
        console.error(`${LOG_PREFIX} Failed to update status:`, dbErr)
      })

    throw error
  }
}

/**
 * Call Claude API with the submission review prompt.
 * No timeout — we always wait for the full AI response (cluster delivery).
 */
async function callAiApi(userPrompt: string): Promise<string> {
  if (!AI_API_KEY) {
    throw new Error("AI API key not configured")
  }

  const response = await fetch(AI_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": AI_API_KEY,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 4000,
      system: getSystemPrompt(),
      messages: [{ role: "user", content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `AI API error ${response.status}: ${errorText.slice(0, 200)}`
    )
  }

  const data = await response.json()
  const text = data.content?.[0]?.text

  if (!text) {
    throw new Error("Empty response from AI")
  }

  return text
}

/**
 * Parse AI response as JSON. Retry once with stricter prompt if parsing fails.
 */
function parseAiResponse(rawText: string): AiReviewResult {
  // Try to extract JSON from the response (AI might wrap it in markdown code blocks)
  let jsonStr = rawText.trim()

  // Strip markdown code fences if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  try {
    const parsed = JSON.parse(jsonStr)
    return validateAiResult(parsed)
  } catch {
    // Try to find JSON object in the text
    const objStart = rawText.indexOf("{")
    const objEnd = rawText.lastIndexOf("}")
    if (objStart !== -1 && objEnd > objStart) {
      try {
        const extracted = rawText.slice(objStart, objEnd + 1)
        const parsed = JSON.parse(extracted)
        return validateAiResult(parsed)
      } catch {
        throw new Error(
          `Failed to parse AI response as JSON. Raw: ${rawText.slice(0, 200)}`
        )
      }
    }
    throw new Error(
      `AI response is not valid JSON. Raw: ${rawText.slice(0, 200)}`
    )
  }
}

/**
 * Validate the parsed AI result has the expected structure.
 * Fills in defaults for missing fields rather than failing.
 */
function validateAiResult(data: Record<string, unknown>): AiReviewResult {
  const analysis = (data.analysis ?? {}) as Record<string, unknown>
  const questions = Array.isArray(data.questions) ? data.questions : []
  const coverage = (data.coverage ?? {}) as Record<string, unknown>

  return {
    analysis: {
      shortVerdict: String(analysis.shortVerdict ?? "Анализ выполнен"),
      strengths: ensureStringArray(analysis.strengths),
      weaknesses: ensureStringArray(analysis.weaknesses),
      gaps: ensureStringArray(analysis.gaps),
      riskFlags: ensureStringArray(analysis.riskFlags),
      confidence: clamp(Number(analysis.confidence) || 50, 0, 100),
    },
    questions: questions.slice(0, 10).map((q: Record<string, unknown>) => ({
      question: String(q.question ?? ""),
      type: validateEnum(
        String(q.type),
        ["knowledge", "application", "reflection", "verification"],
        "knowledge"
      ),
      difficulty: validateEnum(
        String(q.difficulty),
        ["easy", "medium", "hard"],
        "medium"
      ),
      rationale: String(q.rationale ?? ""),
      source: validateEnum(
        String(q.source),
        ["submission", "file", "module", "trail"],
        "module"
      ),
    })),
    coverage: {
      submissionTextUsed: Boolean(coverage.submissionTextUsed),
      fileUsed: Boolean(coverage.fileUsed),
      moduleUsed: Boolean(coverage.moduleUsed),
      trailUsed: Boolean(coverage.trailUsed),
      notes: String(coverage.notes ?? ""),
    },
  }
}

function ensureStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return []
  return val.filter((item) => typeof item === "string").slice(0, 10)
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function validateEnum<T extends string>(
  value: string,
  allowed: T[],
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/**
 * Get AI review data for a submission as a serialization-safe DTO.
 * Returns null if no review exists.
 */
export async function getAiReviewDTO(
  submissionId: string
): Promise<AiReviewDTO | null> {
  const review = await prisma.aiSubmissionReview.findUnique({
    where: { submissionId },
    select: {
      id: true,
      submissionId: true,
      status: true,
      analysisSummary: true,
      questions: true,
      sourceCoverage: true,
      errorMessage: true,
      startedAt: true,
      finishedAt: true,
    },
  })

  if (!review) return null

  return {
    id: review.id,
    submissionId: review.submissionId,
    status: review.status as AiReviewDTO["status"],
    analysis: safeJsonParse(review.analysisSummary),
    questions: safeJsonParse(review.questions),
    coverage: safeJsonParse(review.sourceCoverage),
    errorMessage: review.errorMessage,
    startedAt: review.startedAt?.toISOString() ?? null,
    finishedAt: review.finishedAt?.toISOString() ?? null,
  }
}

function safeJsonParse<T>(str: string | null): T | null {
  if (!str) return null
  try {
    return JSON.parse(str) as T
  } catch {
    return null
  }
}
