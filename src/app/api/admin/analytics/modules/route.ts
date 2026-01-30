import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAnyAdmin, isAdmin, getAdminTrailFilter } from "@/lib/admin-access"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Build where clause based on admin access
    let whereClause = {}
    if (!isAdmin(session.user.role)) {
      const trailFilter = await getAdminTrailFilter(session.user.id, session.user.role)
      if (trailFilter) {
        whereClause = { trail: trailFilter }
      }
    }

    // Get modules with their progress and reviews (filtered by admin access)
    const modules = await prisma.module.findMany({
      where: whereClause,
      orderBy: [
        { trail: { order: "asc" } },
        { order: "asc" },
      ],
      include: {
        trail: {
          select: { id: true, title: true },
        },
        progress: {
          where: { status: "COMPLETED" },
        },
        submissions: {
          include: {
            review: {
              select: { score: true },
            },
          },
        },
        _count: {
          select: {
            progress: true,
            submissions: true,
          },
        },
      },
    })

    // Calculate analytics for each module
    type ModuleType = typeof modules[number]
    type SubmissionType = ModuleType["submissions"][number]
    const analytics = modules.map((module: ModuleType) => {
      const completedCount = module.progress.length
      const totalSubmissions = module.submissions.length
      const reviewedSubmissions = module.submissions.filter((s: SubmissionType) => s.review)
      const approvedSubmissions = module.submissions.filter((s: SubmissionType) => s.status === "APPROVED")

      // Calculate average score
      const scores = reviewedSubmissions
        .map((s: SubmissionType) => s.review?.score)
        .filter((s: number | undefined | null): s is number => s !== null && s !== undefined)
      const avgScore = scores.length > 0
        ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10
        : null

      // Calculate completion rate (students who completed vs students who started)
      const startedCount = module._count.progress
      const completionRate = startedCount > 0
        ? Math.round((completedCount / startedCount) * 100)
        : 0

      // Calculate approval rate
      const approvalRate = totalSubmissions > 0
        ? Math.round((approvedSubmissions.length / totalSubmissions) * 100)
        : null

      return {
        id: module.id,
        title: module.title,
        type: module.type,
        trailId: module.trail.id,
        trailTitle: module.trail.title,
        points: module.points,
        completedCount,
        startedCount,
        completionRate,
        totalSubmissions,
        avgScore,
        approvalRate,
      }
    })

    // Summary statistics
    type AnalyticsItemType = typeof analytics[number]
    const summary = {
      totalModules: modules.length,
      totalCompletions: analytics.reduce((a: number, m: AnalyticsItemType) => a + m.completedCount, 0),
      avgCompletionRate: Math.round(
        analytics.reduce((a: number, m: AnalyticsItemType) => a + m.completionRate, 0) / (analytics.length || 1)
      ),
      avgScore: (() => {
        const scores = analytics.filter((m: AnalyticsItemType) => m.avgScore !== null).map((m: AnalyticsItemType) => m.avgScore!)
        return scores.length > 0
          ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10
          : null
      })(),
    }

    return NextResponse.json({ analytics, summary })
  } catch (error) {
    console.error("Error fetching module analytics:", error)
    return NextResponse.json({ error: "Ошибка загрузки аналитики" }, { status: 500 })
  }
}
