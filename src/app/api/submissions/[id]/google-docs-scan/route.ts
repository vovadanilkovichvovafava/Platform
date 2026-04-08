/**
 * API route for Google Docs Scanner.
 * GET  — fetch current scan data for a submission.
 * POST — trigger initial scan or re-scan.
 *
 * Access: privileged users (TEACHER, CO_ADMIN, ADMIN) with trail access.
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrivileged, privilegedHasTrailAccess } from "@/lib/admin-access"
import { FEATURE_FLAGS } from "@/lib/feature-flags"
import { getGoogleDocsScanDTO, runGoogleDocsScan } from "@/lib/google-docs-scanner"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/submissions/[id]/google-docs-scan
 * Returns the current scan data for a submission (for polling).
 */
export async function GET(request: Request, ctx: RouteContext) {
  try {
    if (!FEATURE_FLAGS.GOOGLE_DOCS_SCAN_ENABLED) {
      return NextResponse.json(
        { error: "Сканирование Google Docs отключено" },
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

    const dto = await getGoogleDocsScanDTO(submissionId)

    return NextResponse.json({ scan: dto })
  } catch (error) {
    console.error("[GoogleDocsScan API] GET error:", error)
    return NextResponse.json(
      { error: "Внутренняя ошибка" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/submissions/[id]/google-docs-scan
 * Trigger initial scan or re-scan for a submission.
 */
export async function POST(request: Request, ctx: RouteContext) {
  try {
    if (!FEATURE_FLAGS.GOOGLE_DOCS_SCAN_ENABLED) {
      return NextResponse.json(
        { error: "Сканирование Google Docs отключено" },
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

    // Check if re-scan is requested
    let rescan = false
    try {
      const body = await request.json()
      rescan = body.rescan === true
    } catch {
      // No body or invalid JSON — default to initial scan
    }

    // Run scan asynchronously — respond immediately
    runGoogleDocsScan(submissionId, { rescan }).catch((err) => {
      console.error(
        "[GoogleDocsScan API] Background scan failed:",
        err instanceof Error ? err.message : err
      )
    })

    return NextResponse.json({ status: "started", submissionId })
  } catch (error) {
    console.error("[GoogleDocsScan API] POST error:", error)
    return NextResponse.json(
      { error: "Внутренняя ошибка" },
      { status: 500 }
    )
  }
}
