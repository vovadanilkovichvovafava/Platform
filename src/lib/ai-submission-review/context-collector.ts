/**
 * Collects submission context from multiple sources using Promise.allSettled.
 * Isolated module — does not affect other AI features.
 */
import { prisma } from "@/lib/prisma"
import type { SubmissionContext, SourceCoverageResult } from "./types"

const MAX_CONTENT_LENGTH = 50000 // chars — keep context within token limits

/** Truncate text to a max length, appending a note if truncated */
function truncate(text: string | null | undefined, maxLen: number): string | null {
  if (!text) return null
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + "\n\n[...текст сокращён до " + maxLen + " символов]"
}

/**
 * Gather all context needed for AI analysis.
 * Uses Promise.allSettled so one failure doesn't block others.
 */
export async function collectSubmissionContext(
  submissionId: string
): Promise<{ context: SubmissionContext; coverage: SourceCoverageResult }> {
  const notes: string[] = []

  // Fetch submission with module and trail in one query
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      comment: true,
      fileUrl: true,
      githubUrl: true,
      deployUrl: true,
      module: {
        select: {
          title: true,
          description: true,
          type: true,
          content: true,
          requirements: true,
          trail: {
            select: {
              title: true,
              description: true,
            },
          },
        },
      },
    },
  })

  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`)
  }

  const mod = submission.module
  const trail = mod.trail

  // Fetch previous questions from existing review (for deduplication on re-runs)
  let previousQuestions: string[] = []
  try {
    const existingReview = await prisma.aiSubmissionReview.findUnique({
      where: { submissionId },
      select: { questions: true },
    })
    if (existingReview?.questions) {
      const parsed = JSON.parse(existingReview.questions)
      if (Array.isArray(parsed)) {
        previousQuestions = parsed
          .map((q: Record<string, unknown>) => String(q.question ?? ""))
          .filter((q: string) => q.length > 0)
      }
    }
  } catch {
    // Silently ignore — previous questions are optional context
  }

  // Determine what was successfully gathered
  const submissionTextUsed = !!submission.comment && submission.comment.trim().length > 0
  const fileUrlUsed = !!submission.fileUrl
  const moduleUsed = !!(mod.content || mod.requirements || mod.description)
  const trailUsed = !!(trail.title && trail.description)

  if (!submissionTextUsed) notes.push("Студент не оставил текстовый комментарий")
  if (!fileUrlUsed && !submission.githubUrl && !submission.deployUrl) {
    notes.push("Нет ссылок на файл, GitHub или деплой")
  }
  if (!mod.content) notes.push("Контент модуля пуст")

  const context: SubmissionContext = {
    submissionText: truncate(submission.comment, MAX_CONTENT_LENGTH),
    fileUrl: submission.fileUrl,
    githubUrl: submission.githubUrl,
    deployUrl: submission.deployUrl,
    moduleTitle: mod.title,
    moduleDescription: mod.description,
    moduleType: mod.type,
    moduleContent: truncate(mod.content, MAX_CONTENT_LENGTH),
    moduleRequirements: truncate(mod.requirements, MAX_CONTENT_LENGTH),
    trailTitle: trail.title,
    trailDescription: truncate(trail.description, 5000) ?? trail.description,
    previousQuestions,
  }

  const coverage: SourceCoverageResult = {
    submissionTextUsed,
    fileUrlUsed,
    moduleUsed,
    trailUsed,
    notes: notes.join("; ") || "Все основные источники доступны",
  }

  return { context, coverage }
}
