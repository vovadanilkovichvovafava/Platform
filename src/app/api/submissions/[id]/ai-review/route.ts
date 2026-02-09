/**
 * API route for AI Submission Review.
 * GET  — fetch current AI review status/data for a submission.
 * POST — trigger or retry AI review for a submission.
 *
 * Access: privileged users (TEACHER, CO_ADMIN, ADMIN) with trail access.
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrivileged, privilegedHasTrailAccess } from "@/lib/admin-access"
import { FEATURE_FLAGS } from "@/lib/feature-flags"
import {
  getAiReviewDTO,
  runAiSubmissionReview,
  isAiReviewAvailable,
} from "@/lib/ai-submission-review"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/submissions/[id]/ai-review
 * Returns the current AI review for a submission (for polling).
 */
export async function GET(request: Request, ctx: RouteContext) {
  try {
    if (!FEATURE_FLAGS.AI_SUBMISSION_REVIEW_ENABLED) {
      return NextResponse.json(
        { error: "AI-анализ отключён" },
        { status: 404 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { id: submissionId } = await ctx.params

    // Verify submission exists and user has trail access
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { module: { select: { trailId: true } } },
    })

    if (!submission) {
      return NextResponse.json(
        { error: "Работа не найдена" },
        { status: 404 }
      )
    }

    const hasAccess = await privilegedHasTrailAccess(
      session.user.id,
      session.user.role,
      submission.module.trailId
    )
    if (!hasAccess) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 })
    }

    const dto = await getAiReviewDTO(submissionId)

    return NextResponse.json({ review: dto })
  } catch (error) {
    console.error("[AI-Review API] GET error:", error)
    return NextResponse.json(
      { error: "Внутренняя ошибка" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/submissions/[id]/ai-review
 * Trigger or retry AI review for a submission.
 */
export async function POST(request: Request, ctx: RouteContext) {
  try {
    if (!FEATURE_FLAGS.AI_SUBMISSION_REVIEW_ENABLED) {
      return NextResponse.json(
        { error: "AI-анализ отключён" },
        { status: 404 }
      )
    }

    if (!isAiReviewAvailable()) {
      return NextResponse.json(
        { error: "AI-сервис не настроен" },
        { status: 503 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { id: submissionId } = await ctx.params

    // Verify submission exists and user has trail access
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { module: { select: { trailId: true } } },
    })

    if (!submission) {
      return NextResponse.json(
        { error: "Работа не найдена" },
        { status: 404 }
      )
    }

    const hasAccess = await privilegedHasTrailAccess(
      session.user.id,
      session.user.role,
      submission.module.trailId
    )
    if (!hasAccess) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 })
    }

    // Check if force re-run is requested
    let force = false
    try {
      const body = await request.json()
      force = body.force === true
    } catch {
      // No body or invalid JSON — default to non-force
    }

    // Run AI review asynchronously — respond immediately
    runAiSubmissionReview(submissionId, { force }).catch((err) => {
      console.error(
        "[AI-Review API] Background review failed:",
        err instanceof Error ? err.message : err
      )
    })

    return NextResponse.json({ status: "started", submissionId })
  } catch (error) {
    console.error("[AI-Review API] POST error:", error)
    return NextResponse.json(
      { error: "Внутренняя ошибка" },
      { status: 500 }
    )
  }
}
