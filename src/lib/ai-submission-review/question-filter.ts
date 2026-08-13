/**
 * Post-processing quality filter for AI-generated questions.
 * Removes trivial, duplicate, and already-answered questions.
 * This is a safety net — the prompt should already filter most of these.
 */
import type { AiReviewQuestion } from "./types"

export interface FilterResult {
  accepted: AiReviewQuestion[]
  rejected: Array<{ question: string; reason: string }>
  rejectedReasons: string[]
  totalCandidates: number
}

/**
 * Normalize text for comparison: lowercase, collapse whitespace, remove punctuation.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Extract significant words (>3 chars) from text for overlap checking.
 */
export function extractKeywords(text: string): Set<string> {
  const normalized = normalizeText(text)
  return new Set(normalized.split(" ").filter((w) => w.length > 3))
}

/**
 * Check if a question is trivially answerable from existing text.
 * Uses keyword overlap heuristic: if >70% of question keywords
 * appear in the source text, the question is likely already answered.
 */
export function isLikelyAnsweredByText(
  question: string,
  sourceText: string
): boolean {
  if (!sourceText || sourceText.trim().length < 20) return false

  const qKeywords = extractKeywords(question)
  if (qKeywords.size < 3) return false // too short to meaningfully compare

  const sourceKeywords = extractKeywords(sourceText)
  let overlap = 0
  for (const word of qKeywords) {
    if (sourceKeywords.has(word)) overlap++
  }

  return overlap / qKeywords.size > 0.7
}

/**
 * Check if question is a trivial yes/no or definition question.
 */
export function isTrivialQuestion(question: string): boolean {
  const normalized = normalizeText(question)

  // Yes/no patterns (Russian)
  const yesNoPatterns = [
    /^(правда ли|верно ли|является ли|используешь ли|знаешь ли|есть ли|был ли|была ли|было ли|были ли)/,
    /^(ты использовал|ты применил|ты знаком|ты знаешь|ты слышал)/,
  ]
  for (const pattern of yesNoPatterns) {
    if (pattern.test(normalized)) return true
  }

  // Bare definition patterns: "Что такое X?"
  if (/^что такое\s/.test(normalized) && normalized.split(" ").length < 8) {
    return true
  }

  return false
}

/**
 * Check if a question is too similar to a previous question.
 */
export function isDuplicateOfPrevious(
  question: string,
  previousQuestions: string[]
): boolean {
  if (previousQuestions.length === 0) return false

  const qNorm = normalizeText(question)
  const qKeywords = extractKeywords(question)

  for (const prev of previousQuestions) {
    const prevNorm = normalizeText(prev)

    // Exact match after normalization
    if (qNorm === prevNorm) return true

    // High keyword overlap (>80%)
    const prevKeywords = extractKeywords(prev)
    if (qKeywords.size < 3 || prevKeywords.size < 3) continue

    let overlap = 0
    for (const word of qKeywords) {
      if (prevKeywords.has(word)) overlap++
    }
    if (overlap / Math.max(qKeywords.size, prevKeywords.size) > 0.8) {
      return true
    }
  }

  return false
}

/**
 * Post-processing filter: removes trivial, duplicate, and already-answered questions.
 */
export function filterQuestions(
  questions: AiReviewQuestion[],
  submissionText: string,
  moduleText: string,
  previousQuestions: string[]
): FilterResult {
  const accepted: AiReviewQuestion[] = []
  const rejected: Array<{ question: string; reason: string }> = []

  for (const q of questions) {
    // Skip empty questions
    if (!q.question || q.question.trim().length < 10) {
      rejected.push({ question: q.question, reason: "EMPTY_OR_TOO_SHORT" })
      continue
    }

    // Check for duplicates against previous questions
    if (isDuplicateOfPrevious(q.question, previousQuestions)) {
      rejected.push({ question: q.question, reason: "DUPLICATE_SURFACE" })
      continue
    }

    // Check for trivial yes/no or definition questions
    if (isTrivialQuestion(q.question)) {
      rejected.push({ question: q.question, reason: "TRIVIAL" })
      continue
    }

    // Check if answer is already in submission text
    if (isLikelyAnsweredByText(q.question, submissionText)) {
      rejected.push({ question: q.question, reason: "ALREADY_ANSWERED" })
      continue
    }

    // Check for duplicates within the current batch
    if (isDuplicateOfPrevious(q.question, accepted.map((a) => a.question))) {
      rejected.push({ question: q.question, reason: "DUPLICATE_WITHIN_BATCH" })
      continue
    }

    accepted.push(q)
  }

  // Collect unique rejection reasons for logging
  const rejectedReasons = [...new Set(rejected.map((r) => r.reason))]

  return {
    accepted,
    rejected,
    rejectedReasons,
    totalCandidates: questions.length,
  }
}
