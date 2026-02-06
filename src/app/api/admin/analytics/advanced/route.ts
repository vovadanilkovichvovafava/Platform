import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAnyAdmin, getAdminAllowedTrailIds } from "@/lib/admin-access"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const trailFilter = searchParams.get("trail") || "all"
  const periodFilter = searchParams.get("period") || "30" // days
  try {
    const session = await getServerSession(authOptions)

    if (!session || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get allowed trail IDs for CO_ADMIN (null means all trails for ADMIN)
    const allowedTrailIds = await getAdminAllowedTrailIds(session.user.id, session.user.role)

    // Validate that CO_ADMIN can only access their assigned trails
    if (trailFilter !== "all" && allowedTrailIds !== null) {
      if (!allowedTrailIds.includes(trailFilter)) {
        return NextResponse.json({ error: "Нет доступа к этому trail" }, { status: 403 })
      }
    }

    // Build trail filter for queries
    // For CO_ADMIN: use their allowed trails (intersection with trailFilter if specified)
    // For ADMIN: use trailFilter or all
    const getEffectiveTrailFilter = () => {
      if (allowedTrailIds === null) {
        // ADMIN - use trailFilter directly
        return trailFilter !== "all" ? { id: trailFilter } : {}
      }
      // CO_ADMIN - filter by allowed trails
      if (trailFilter !== "all") {
        return { id: trailFilter }
      }
      return { id: { in: allowedTrailIds } }
    }

    const effectiveTrailFilter = getEffectiveTrailFilter()

    // 1. Churn Risk Analysis
    // Students who haven't been active in 7+ days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Build student filter based on allowed trails
    // CO_ADMIN can only see students enrolled in their allowed trails
    const studentWhereClause = allowedTrailIds === null
      ? { role: "STUDENT" as const }
      : {
          role: "STUDENT" as const,
          enrollments: {
            some: {
              trailId: { in: allowedTrailIds },
            },
          },
        }

    // Get all students with their latest activity (filtered by allowed trails for CO_ADMIN)
    const students = await prisma.user.findMany({
      where: studentWhereClause,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        totalXP: true,
        activityDays: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
        _count: {
          select: {
            moduleProgress: { where: { status: "COMPLETED" } },
            submissions: true,
            enrollments: allowedTrailIds === null
              ? true
              : { where: { trailId: { in: allowedTrailIds } } },
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
    // Note: students._count.moduleProgress counts COMPLETED only (see query above)
    const completedModule = students.filter((s: StudentType) => s._count.moduleProgress > 0).length
    const submittedWork = students.filter((s: StudentType) => s._count.submissions > 0).length

    // Get students who STARTED at least one module (IN_PROGRESS or COMPLETED)
    // This requires a separate query since _count can only have one filter per relation
    // For CO_ADMIN: only count modules from allowed trails
    const moduleProgressFilter = allowedTrailIds === null
      ? { status: { in: ["IN_PROGRESS", "COMPLETED"] } }
      : {
          status: { in: ["IN_PROGRESS", "COMPLETED"] },
          module: { trailId: { in: allowedTrailIds } },
        }

    const studentsWithStartedModules = await prisma.user.findMany({
      where: {
        ...studentWhereClause,
        moduleProgress: {
          some: moduleProgressFilter,
        },
      },
      select: { id: true },
    })
    const startedModules = studentsWithStartedModules.length

    // Get certificates count (filtered by allowed trails for CO_ADMIN)
    const certificateHolders = await prisma.certificate.groupBy({
      by: ["userId"],
      where: allowedTrailIds === null ? {} : { trailId: { in: allowedTrailIds } },
      _count: true,
    })

    // Build funnel with monotonically decreasing counts
    // Each step should be <= previous step (funnel property)
    const rawFunnel = [
      { stage: "Зарегистрировались", count: totalStudents },
      { stage: "Записались на trail", count: enrolledStudents },
      { stage: "Начали модуль", count: startedModules },
      { stage: "Отправили работу", count: submittedWork },
      { stage: "Завершили модуль", count: completedModule },
      { stage: "Получили сертификат", count: certificateHolders.length },
    ]

    // Ensure funnel consistency: each step count <= previous step count
    // This handles edge cases where data might be inconsistent
    const funnel = rawFunnel.map((step, index) => {
      // First step: 100% only if there are students, otherwise 0%
      if (index === 0) {
        return { ...step, percent: totalStudents > 0 ? 100 : 0 }
      }
      // For subsequent steps, cap the count at previous step's count
      const prevCount = rawFunnel[index - 1].count
      const cappedCount = Math.min(step.count, prevCount)
      const percent = totalStudents > 0 ? Math.round((cappedCount / totalStudents) * 100) : 0
      return { stage: step.stage, count: cappedCount, percent }
    })

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

    // 4. Module difficulty analysis (filtered by allowed trails for CO_ADMIN)
    const moduleStats = await prisma.module.findMany({
      where: allowedTrailIds === null ? {} : { trailId: { in: allowedTrailIds } },
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        trail: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        _count: {
          select: {
            progress: { where: { status: "COMPLETED" } },
            submissions: true,
          },
        },
      },
    })

    // Get submissions with reviews for each module (removed invalid groupBy)

    // Calculate avg scores per module manually (filtered by allowed trails for CO_ADMIN)
    const submissions = await prisma.submission.findMany({
      where: {
        review: { isNot: null },
        ...(allowedTrailIds === null ? {} : { module: { trailId: { in: allowedTrailIds } } }),
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
        slug: m.slug,
        type: m.type,
        trailId: m.trail?.id || null,
        trailTitle: m.trail?.title || null,
        trailSlug: m.trail?.slug || null,
        completedCount: m._count.progress,
        submissionCount: m._count.submissions,
        avgScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
        difficulty: avgScore ? (avgScore < 6 ? "hard" : avgScore < 8 ? "medium" : "easy") : "unknown",
      }
    })

    // 5. Get list of trails for filter dropdown (filtered by allowed trails for CO_ADMIN)
    const trailsList = await prisma.trail.findMany({
      where: allowedTrailIds === null ? {} : { id: { in: allowedTrailIds } },
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
      where: effectiveTrailFilter,
      select: {
        id: true,
        title: true,
        slug: true,
        modules: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            slug: true,
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
    type ModuleProgressType = ModuleDropoffModule["progress"][number]

    const dropoffAnalysis = moduleDropoffData.map((trail: ModuleDropoffTrail) => {
      const totalEnrolled = trail._count.enrollments
      const moduleStats = trail.modules.map((module: ModuleDropoffModule, index: number) => {
        const completedCount = module._count.progress
        const startedCount = module.progress.filter((p: ModuleProgressType) => p.status !== "NOT_STARTED").length
        const inProgressCount = module.progress.filter((p: ModuleProgressType) => p.status === "IN_PROGRESS").length

        // Calculate avg completion time
        const completedWithTimes = module.progress.filter(
          (p: ModuleProgressType) => p.status === "COMPLETED" && p.startedAt && p.completedAt
        )
        const avgTimeMs = completedWithTimes.length > 0
          ? completedWithTimes.reduce((sum: number, p: ModuleProgressType) => {
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
          slug: module.slug,
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
    // Trail progress analysis (filtered by allowed trails for CO_ADMIN)
    const trails = await prisma.trail.findMany({
      where: effectiveTrailFilter,
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

    // Top performing students (filtered by allowed trails for CO_ADMIN)
    const topStudents = await prisma.user.findMany({
      where: studentWhereClause,
      select: {
        id: true,
        name: true,
        totalXP: true,
        _count: {
          select: {
            moduleProgress: allowedTrailIds === null
              ? { where: { status: "COMPLETED" } }
              : { where: { status: "COMPLETED", module: { trailId: { in: allowedTrailIds } } } },
            submissions: allowedTrailIds === null
              ? { where: { status: "APPROVED" } }
              : { where: { status: "APPROVED", module: { trailId: { in: allowedTrailIds } } } },
            certificates: allowedTrailIds === null ? true : { where: { trailId: { in: allowedTrailIds } } },
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
      modulesCompleted: s._count.moduleProgress,
      approvedWorks: s._count.submissions,
      certificates: s._count.certificates,
    }))

    // Score distribution (for filtered submissions based on trail and allowed trails for CO_ADMIN)
    const buildReviewWhereClause = () => {
      if (allowedTrailIds === null) {
        // ADMIN
        return trailFilter !== "all"
          ? { submission: { module: { trailId: trailFilter } } }
          : {}
      }
      // CO_ADMIN - always filter by allowed trails
      if (trailFilter !== "all") {
        return { submission: { module: { trailId: trailFilter } } }
      }
      return { submission: { module: { trailId: { in: allowedTrailIds } } } }
    }
    const reviewWhereClause = buildReviewWhereClause()

    const allReviews = await prisma.review.findMany({
      where: reviewWhereClause,
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
      filteredByTrail: trailFilter !== "all",
    }

    // 8. Students by trail with detailed progress (для коллапсеров)
    // Filtered by allowed trails for CO_ADMIN
    const trailStudentsData = await prisma.trail.findMany({
      where: effectiveTrailFilter,
      select: {
        id: true,
        title: true,
        slug: true,
        enrollments: {
          take: 50, // Limit to prevent large payloads
          orderBy: { createdAt: "desc" },
          select: {
            user: {
              select: {
                id: true,
                name: true,
                totalXP: true,
              },
            },
          },
        },
        modules: {
          select: { id: true },
        },
      },
    })

    type TrailStudentData = typeof trailStudentsData[number]
    type EnrollmentData = TrailStudentData["enrollments"][number]

    const studentsByTrail = await Promise.all(
      trailStudentsData.map(async (trail: TrailStudentData) => {
        const moduleIds = trail.modules.map((m: { id: string }) => m.id)

        const studentsWithProgress = await Promise.all(
          trail.enrollments.map(async (enrollment: EnrollmentData) => {
            const userId = enrollment.user.id

            // Get module progress for this student in this trail
            const progress = await prisma.moduleProgress.count({
              where: {
                userId,
                moduleId: { in: moduleIds },
                status: "COMPLETED",
              },
            })

            // Get submissions stats
            const submissionsStats = await prisma.submission.groupBy({
              by: ["status"],
              where: {
                userId,
                moduleId: { in: moduleIds },
              },
              _count: true,
            })

            // Get avg score for this student
            const studentReviews = await prisma.review.findMany({
              where: {
                submission: {
                  userId,
                  moduleId: { in: moduleIds },
                },
              },
              select: { score: true },
            })

            type StudentReviewType = { score: number }
            const avgScore = studentReviews.length > 0
              ? Math.round((studentReviews.reduce((a: number, r: StudentReviewType) => a + r.score, 0) / studentReviews.length) * 10) / 10
              : null

            type SubmissionStatType = { status: string; _count: number }
            const approved = submissionsStats.find((s: SubmissionStatType) => s.status === "APPROVED")?._count || 0
            const pending = submissionsStats.find((s: SubmissionStatType) => s.status === "PENDING")?._count || 0
            const revision = submissionsStats.find((s: SubmissionStatType) => s.status === "REVISION")?._count || 0

            return {
              id: userId,
              name: enrollment.user.name,
              totalXP: enrollment.user.totalXP,
              modulesCompleted: progress,
              totalModules: moduleIds.length,
              completionPercent: moduleIds.length > 0 ? Math.round((progress / moduleIds.length) * 100) : 0,
              submissions: {
                approved,
                pending,
                revision,
                total: approved + pending + revision,
              },
              avgScore,
            }
          })
        )

        return {
          trailId: trail.id,
          trailTitle: trail.title,
          trailSlug: trail.slug,
          students: studentsWithProgress.sort((a, b) => b.completionPercent - a.completionPercent),
        }
      })
    )

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
      // Students by trail with detailed progress
      studentsByTrail,
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
