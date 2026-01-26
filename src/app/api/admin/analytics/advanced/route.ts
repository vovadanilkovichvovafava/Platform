import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const trailFilter = searchParams.get("trail") || "all"
  const periodFilter = searchParams.get("period") || "30" // days
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Churn Risk Analysis
    // Students who haven't been active in 7+ days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get all students with their latest activity
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        totalXP: true,
        currentStreak: true,
        activityDays: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
        _count: {
          select: {
            moduleProgress: { where: { status: "COMPLETED" } },
            submissions: true,
            enrollments: true,
          },
        },
      },
    })

    const churnRisk = {
      high: [] as Array<{ id: string; name: string; email: string; lastActive: string | null; daysSinceActive: number }>,
      medium: [] as Array<{ id: string; name: string; email: string; lastActive: string | null; daysSinceActive: number }>,
      low: [] as Array<{ id: string; name: string; email: string; lastActive: string | null; daysSinceActive: number }>,
    }

    const now = new Date()
    for (const student of students) {
      const lastActivityDate = student.activityDays[0]?.date
      const daysSinceActive = lastActivityDate
        ? Math.floor((now.getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((now.getTime() - new Date(student.createdAt).getTime()) / (1000 * 60 * 60 * 24))

      const entry = {
        id: student.id,
        name: student.name,
        email: student.email,
        lastActive: lastActivityDate?.toISOString() || null,
        daysSinceActive,
        modulesCompleted: student._count.moduleProgress,
        xp: student.totalXP,
      }

      if (daysSinceActive >= 14) {
        churnRisk.high.push(entry)
      } else if (daysSinceActive >= 7) {
        churnRisk.medium.push(entry)
      } else {
        churnRisk.low.push(entry)
      }
    }

    // 2. Funnel Analysis
    type StudentType = typeof students[number]
    const totalStudents = students.length
    const enrolledStudents = students.filter((s: StudentType) => s._count.enrollments > 0).length
    const startedModules = students.filter((s: StudentType) => s._count.moduleProgress > 0).length
    const submittedWork = students.filter((s: StudentType) => s._count.submissions > 0).length
    const completedModule = students.filter((s: StudentType) => s._count.moduleProgress > 0).length

    // Get certificates count
    const certificateHolders = await prisma.certificate.groupBy({
      by: ["userId"],
      _count: true,
    })

    const funnel = [
      { stage: "Зарегистрировались", count: totalStudents, percent: 100 },
      { stage: "Записались на trail", count: enrolledStudents, percent: Math.round((enrolledStudents / totalStudents) * 100) || 0 },
      { stage: "Начали модуль", count: startedModules, percent: Math.round((startedModules / totalStudents) * 100) || 0 },
      { stage: "Отправили работу", count: submittedWork, percent: Math.round((submittedWork / totalStudents) * 100) || 0 },
      { stage: "Завершили модуль", count: completedModule, percent: Math.round((completedModule / totalStudents) * 100) || 0 },
      { stage: "Получили сертификат", count: certificateHolders.length, percent: Math.round((certificateHolders.length / totalStudents) * 100) || 0 },
    ]

    // 3. Engagement trends (last 30 days)
    const activityTrend = await prisma.userActivity.groupBy({
      by: ["date"],
      where: {
        date: { gte: thirtyDaysAgo },
      },
      _count: { userId: true },
      _sum: { actions: true },
      orderBy: { date: "asc" },
    })

    type ActivityTrendType = typeof activityTrend[number]
    const trends = activityTrend.map((day: ActivityTrendType) => ({
      date: day.date.toISOString().split("T")[0],
      activeUsers: day._count.userId,
      totalActions: day._sum.actions || 0,
    }))

    // 4. Module difficulty analysis
    const moduleStats = await prisma.module.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        _count: {
          select: {
            progress: { where: { status: "COMPLETED" } },
            submissions: true,
          },
        },
      },
    })

    // Get submissions with reviews for each module (removed invalid groupBy)

    // Calculate avg scores per module manually
    const submissions = await prisma.submission.findMany({
      where: {
        review: { isNot: null },
      },
      select: {
        moduleId: true,
        review: {
          select: { score: true },
        },
      },
    })

    const moduleScoreMap = new Map<string, number[]>()
    for (const sub of submissions) {
      if (sub.review) {
        const scores = moduleScoreMap.get(sub.moduleId) || []
        scores.push(sub.review.score)
        moduleScoreMap.set(sub.moduleId, scores)
      }
    }

    type ModuleStatsType = typeof moduleStats[number]
    const difficultyAnalysis = moduleStats.map((m: ModuleStatsType) => {
      const scores = moduleScoreMap.get(m.id) || []
      const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null

      return {
        id: m.id,
        title: m.title,
        type: m.type,
        completedCount: m._count.progress,
        submissionCount: m._count.submissions,
        avgScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
        difficulty: avgScore ? (avgScore < 6 ? "hard" : avgScore < 8 ? "medium" : "easy") : "unknown",
      }
    })

    // 5. Get list of trails for filter dropdown
    const trailsList = await prisma.trail.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
      },
      orderBy: { title: "asc" },
    })

    // 6. Module Drop-off Analysis (по каждому trail)
    // Shows where students stop progressing
    const periodDays = parseInt(periodFilter) || 30
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - periodDays)

    const moduleDropoffData = await prisma.trail.findMany({
      where: trailFilter !== "all" ? { id: trailFilter } : {},
      select: {
        id: true,
        title: true,
        slug: true,
        modules: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            type: true,
            _count: {
              select: {
                progress: { where: { status: "COMPLETED" } },
              },
            },
            progress: {
              select: {
                status: true,
                startedAt: true,
                completedAt: true,
              },
            },
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    })

    type ModuleDropoffTrail = typeof moduleDropoffData[number]
    type ModuleDropoffModule = ModuleDropoffTrail["modules"][number]

    const dropoffAnalysis = moduleDropoffData.map((trail: ModuleDropoffTrail) => {
      const totalEnrolled = trail._count.enrollments
      const moduleStats = trail.modules.map((module: ModuleDropoffModule, index: number) => {
        const completedCount = module._count.progress
        const startedCount = module.progress.filter(p => p.status !== "NOT_STARTED").length
        const inProgressCount = module.progress.filter(p => p.status === "IN_PROGRESS").length

        // Calculate avg completion time
        const completedWithTimes = module.progress.filter(
          p => p.status === "COMPLETED" && p.startedAt && p.completedAt
        )
        const avgTimeMs = completedWithTimes.length > 0
          ? completedWithTimes.reduce((sum, p) => {
              const start = new Date(p.startedAt!).getTime()
              const end = new Date(p.completedAt!).getTime()
              return sum + (end - start)
            }, 0) / completedWithTimes.length
          : 0
        const avgTimeDays = Math.round(avgTimeMs / (1000 * 60 * 60 * 24) * 10) / 10

        // Drop rate from previous module
        const prevModule = index > 0 ? trail.modules[index - 1] : null
        const prevCompleted = prevModule ? prevModule._count.progress : totalEnrolled
        const dropRate = prevCompleted > 0
          ? Math.round(((prevCompleted - completedCount) / prevCompleted) * 100)
          : 0

        return {
          id: module.id,
          title: module.title,
          order: module.order,
          type: module.type,
          totalEnrolled,
          startedCount,
          inProgressCount,
          completedCount,
          completionRate: totalEnrolled > 0 ? Math.round((completedCount / totalEnrolled) * 100) : 0,
          dropRate: Math.max(0, dropRate),
          avgTimeDays,
          isBottleneck: dropRate > 30, // Mark as bottleneck if >30% drop
        }
      })

      return {
        trailId: trail.id,
        trailTitle: trail.title,
        trailSlug: trail.slug,
        totalEnrolled,
        modules: moduleStats,
      }
    })

    // 7. Student Progress Statistics (для графиков развития)
    // Trail progress analysis
    const trails = await prisma.trail.findMany({
      where: trailFilter !== "all" ? { id: trailFilter } : {},
      select: {
        id: true,
        title: true,
        slug: true,
        modules: {
          select: { id: true },
        },
        _count: {
          select: {
            enrollments: true,
            certificates: true,
          },
        },
      },
    })

    type TrailType = typeof trails[number]
    type TrailModuleType = { id: string }
    const trailProgress = await Promise.all(
      trails.map(async (trail: TrailType) => {
        const moduleIds = trail.modules.map((m: TrailModuleType) => m.id)
        const totalModules = moduleIds.length

        // Get completed modules count for this trail
        const completedProgress = await prisma.moduleProgress.count({
          where: {
            moduleId: { in: moduleIds },
            status: "COMPLETED",
          },
        })

        // Get submissions for this trail
        const trailSubmissions = await prisma.submission.count({
          where: {
            moduleId: { in: moduleIds },
          },
        })

        // Get approved submissions
        const approvedSubmissions = await prisma.submission.count({
          where: {
            moduleId: { in: moduleIds },
            status: "APPROVED",
          },
        })

        return {
          id: trail.id,
          title: trail.title,
          slug: trail.slug,
          enrollments: trail._count.enrollments,
          certificates: trail._count.certificates,
          totalModules,
          completedModules: completedProgress,
          submissionsCount: trailSubmissions,
          approvedSubmissions,
          completionRate: trail._count.enrollments > 0 && totalModules > 0
            ? Math.round((completedProgress / (trail._count.enrollments * totalModules)) * 100)
            : 0,
          approvalRate: trailSubmissions > 0
            ? Math.round((approvedSubmissions / trailSubmissions) * 100)
            : 0,
        }
      })
    )

    // Top performing students
    const topStudents = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        totalXP: true,
        currentStreak: true,
        _count: {
          select: {
            moduleProgress: { where: { status: "COMPLETED" } },
            submissions: { where: { status: "APPROVED" } },
            certificates: true,
          },
        },
      },
      orderBy: { totalXP: "desc" },
      take: 10,
    })

    type TopStudentType = typeof topStudents[number]
    const topStudentsData = topStudents.map((s: TopStudentType) => ({
      id: s.id,
      name: s.name,
      totalXP: s.totalXP,
      currentStreak: s.currentStreak,
      modulesCompleted: s._count.moduleProgress,
      approvedWorks: s._count.submissions,
      certificates: s._count.certificates,
    }))

    // Score distribution (for all reviewed submissions)
    const allReviews = await prisma.review.findMany({
      select: { score: true },
    })

    type ReviewType = { score: number }
    const scoreDistribution = {
      excellent: allReviews.filter((r: ReviewType) => r.score >= 9).length,  // 9-10
      good: allReviews.filter((r: ReviewType) => r.score >= 7 && r.score < 9).length, // 7-8
      average: allReviews.filter((r: ReviewType) => r.score >= 5 && r.score < 7).length, // 5-6
      poor: allReviews.filter((r: ReviewType) => r.score < 5).length, // 0-4
      total: allReviews.length,
      avgScore: allReviews.length > 0
        ? Math.round((allReviews.reduce((a: number, r: ReviewType) => a + r.score, 0) / allReviews.length) * 10) / 10
        : null,
    }

    return NextResponse.json({
      churnRisk: {
        high: churnRisk.high.slice(0, 20),
        highCount: churnRisk.high.length,
        medium: churnRisk.medium.slice(0, 20),
        mediumCount: churnRisk.medium.length,
        low: churnRisk.low.slice(0, 30),
        lowCount: churnRisk.low.length,
      },
      funnel,
      trends,
      difficultyAnalysis: difficultyAnalysis.sort((a: { avgScore: number | null }, b: { avgScore: number | null }) => (a.avgScore || 10) - (b.avgScore || 10)),
      summary: {
        totalStudents,
        atRiskStudents: churnRisk.high.length + churnRisk.medium.length,
        conversionRate: totalStudents > 0 ? Math.round((completedModule / totalStudents) * 100) : 0,
        avgDailyActiveUsers: trends.length > 0 ? Math.round(trends.reduce((a: number, b: { activeUsers: number }) => a + b.activeUsers, 0) / trends.length) : 0,
      },
      // New: Student progress analytics
      trailProgress,
      topStudents: topStudentsData,
      scoreDistribution,
      // Module drop-off analysis
      dropoffAnalysis,
      // Filters data
      filters: {
        trails: trailsList,
        currentTrail: trailFilter,
        currentPeriod: periodFilter,
      },
    })
  } catch (error) {
    console.error("Advanced analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
