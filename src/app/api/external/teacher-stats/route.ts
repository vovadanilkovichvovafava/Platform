import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyExternalAuth } from "@/lib/external-auth"

export async function GET(request: Request) {
  const authError = verifyExternalAuth(request)
  if (authError) return authError

  try {
    // Get overall stats (full access - no trail restrictions for external API)
    const totalStudents = await prisma.user.count({
      where: { role: "STUDENT" },
    })

    const totalSubmissions = await prisma.submission.count()

    const submissionsByStatus = await prisma.submission.groupBy({
      by: ["status"],
      _count: true,
    })

    type StatusGroupType = { status: string; _count: number }
    const pendingCount = submissionsByStatus.find((s: StatusGroupType) => s.status === "PENDING")?._count || 0
    const approvedCount = submissionsByStatus.find((s: StatusGroupType) => s.status === "APPROVED")?._count || 0
    const revisionCount = submissionsByStatus.find((s: StatusGroupType) => s.status === "REVISION")?._count || 0

    // Get submissions by trail for per-trail stats
    const trailsWithSubmissions = await prisma.trail.findMany({
      select: {
        id: true,
        title: true,
        color: true,
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { order: "asc" },
    })

    // Get submission counts by trail and status
    type TrailWithSubmissions = typeof trailsWithSubmissions[number]
    const trailSubmissionStats = await Promise.all(
      trailsWithSubmissions.map(async (trail: TrailWithSubmissions) => {
        const trailSubmissions = await prisma.submission.groupBy({
          by: ["status"],
          where: { module: { trailId: trail.id } },
          _count: true,
        })

        const trailApproved = trailSubmissions.find((s: StatusGroupType) => s.status === "APPROVED")?._count || 0
        const trailPending = trailSubmissions.find((s: StatusGroupType) => s.status === "PENDING")?._count || 0
        const trailRevision = trailSubmissions.find((s: StatusGroupType) => s.status === "REVISION")?._count || 0
        const trailTotal = trailApproved + trailPending + trailRevision

        if (trailTotal === 0) return null

        return {
          trailId: trail.id,
          trailTitle: trail.title,
          color: trail.color,
          total: trailTotal,
          approved: trailApproved,
          pending: trailPending,
          revision: trailRevision,
        }
      })
    )

    const trailStats = trailSubmissionStats.filter(Boolean)

    // Get top students by XP
    const topStudents = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        totalXP: { gt: 0 },
      },
      orderBy: { totalXP: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        totalXP: true,
        _count: {
          select: { submissions: true },
        },
      },
    })

    type TopStudentType = typeof topStudents[number]
    const topStudentsData = topStudents.map((s: TopStudentType) => ({
      id: s.id,
      name: s.name,
      totalXP: s.totalXP,
      submissionsCount: s._count.submissions,
    }))

    // Get recent activity (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const recentSubmissions = await prisma.submission.count({
      where: { createdAt: { gte: weekAgo } },
    })

    const recentReviews = await prisma.review.count({
      where: { createdAt: { gte: weekAgo } },
    })

    // Module completion stats
    const completedModules = await prisma.moduleProgress.count({
      where: { status: "COMPLETED" },
    })

    const approvalRate = totalSubmissions > 0
      ? Math.round((approvedCount / totalSubmissions) * 100)
      : 0

    // Get trails with detailed stats for drill-down
    const trailsWithDetails = await prisma.trail.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        color: true,
        modules: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            type: true,
            points: true,
            submissions: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                status: true,
                createdAt: true,
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
            progress: {
              where: { status: "COMPLETED" },
              select: { id: true },
            },
          },
        },
      },
    })

    type TrailDetailType = typeof trailsWithDetails[number]
    type ModuleDetailType = TrailDetailType["modules"][number]
    type SubDetailType = ModuleDetailType["submissions"][number]

    const trailsDrilldown = trailsWithDetails.map((trail: TrailDetailType) => {
      const modulesWithStats = trail.modules.map((module: ModuleDetailType) => ({
        id: module.id,
        title: module.title,
        type: module.type,
        points: module.points,
        submissions: module.submissions.map((sub: SubDetailType) => ({
          id: sub.id,
          status: sub.status,
          createdAt: sub.createdAt.toISOString(),
          user: sub.user,
        })),
        completedCount: module.progress.length,
        avgScore: null as number | null,
      }))

      const allSubmissions = modulesWithStats.flatMap((m: { submissions: Array<{ status: string }> }) => m.submissions)

      return {
        id: trail.id,
        title: trail.title,
        color: trail.color,
        modules: modulesWithStats,
        totalSubmissions: allSubmissions.length,
        pendingCount: allSubmissions.filter((s: { status: string }) => s.status === "PENDING").length,
        approvedCount: allSubmissions.filter((s: { status: string }) => s.status === "APPROVED").length,
      }
    })

    return NextResponse.json({
      overview: {
        totalStudents,
        totalSubmissions,
        approvalRate,
        completedModules,
        submissionsByStatus: {
          pending: pendingCount,
          approved: approvedCount,
          revision: revisionCount,
        },
      },
      recentActivity: {
        periodDays: 7,
        newSubmissions: recentSubmissions,
        reviewsCompleted: recentReviews,
      },
      trailStats,
      topStudents: topStudentsData,
      trailsDrilldown,
    })
  } catch (error) {
    console.error("External teacher-stats API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
