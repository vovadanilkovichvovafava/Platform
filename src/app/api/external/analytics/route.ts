import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyExternalAuth } from "@/lib/external-auth"

export async function GET(request: NextRequest) {
  const authError = verifyExternalAuth(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const trailFilter = searchParams.get("trail") || "all"
  const periodFilter = searchParams.get("period") || "30"

  try {
    // Build trail filter for queries (external API has full access)
    const effectiveTrailFilter = trailFilter !== "all" ? { id: trailFilter } : {}
    const moduleTrailFilter = trailFilter !== "all" ? { trailId: trailFilter } : {}

    // 1. Churn Risk Analysis
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const studentWhereClause = trailFilter !== "all"
      ? { role: "STUDENT" as const, enrollments: { some: { trailId: trailFilter } } }
      : { role: "STUDENT" as const }

    const students = await prisma.user.findMany({
      where: studentWhereClause,
      select: {
        id: true,
        name: true,
        email: true,
        telegramUsername: true,
        createdAt: true,
        totalXP: true,
        activityDays: {
          orderBy: { date: "desc" as const },
          take: 1,
          select: { date: true },
        },
        _count: {
          select: {
            moduleProgress: trailFilter !== "all"
              ? { where: { status: "COMPLETED", module: { trailId: trailFilter } } }
              : { where: { status: "COMPLETED" } },
            submissions: trailFilter !== "all"
              ? { where: { module: { trailId: trailFilter } } }
              : true,
            enrollments: trailFilter !== "all"
              ? { where: { trailId: trailFilter } }
              : true,
          },
        },
      },
    })

    const churnRisk = {
      high: [] as Array<{ id: string; name: string; email: string; telegramUsername: string | null; lastActive: string | null; daysSinceActive: number; modulesCompleted: number; xp: number }>,
      medium: [] as Array<{ id: string; name: string; email: string; telegramUsername: string | null; lastActive: string | null; daysSinceActive: number; modulesCompleted: number; xp: number }>,
      low: [] as Array<{ id: string; name: string; email: string; telegramUsername: string | null; lastActive: string | null; daysSinceActive: number; modulesCompleted: number; xp: number }>,
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
        telegramUsername: student.telegramUsername,
        lastActive: lastActivityDate ? lastActivityDate.toISOString() : null,
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
    const completedModule = students.filter((s: StudentType) => s._count.moduleProgress > 0).length
    const submittedWork = students.filter((s: StudentType) => s._count.submissions > 0).length

    const moduleProgressFilter = trailFilter !== "all"
      ? { status: { in: ["IN_PROGRESS", "COMPLETED"] }, module: { trailId: trailFilter } }
      : { status: { in: ["IN_PROGRESS", "COMPLETED"] } }

    const studentsWithStartedModules = await prisma.user.findMany({
      where: {
        ...studentWhereClause,
        moduleProgress: { some: moduleProgressFilter },
      },
      select: { id: true },
    })
    const startedModules = studentsWithStartedModules.length

    const certificateFilter = trailFilter !== "all" ? { trailId: trailFilter } : {}
    const certificateHolders = await prisma.certificate.groupBy({
      by: ["userId"],
      where: certificateFilter,
      _count: true,
    })

    const rawFunnel = [
      { stage: "Зарегистрировались", count: totalStudents },
      { stage: "Записались на trail", count: enrolledStudents },
      { stage: "Начали модуль", count: startedModules },
      { stage: "Отправили работу", count: submittedWork },
      { stage: "Завершили модуль", count: completedModule },
      { stage: "Получили сертификат", count: certificateHolders.length },
    ]

    const funnel = rawFunnel.map((step, index) => {
      if (index === 0) {
        return { ...step, percent: totalStudents > 0 ? 100 : 0 }
      }
      const prevCount = rawFunnel[index - 1].count
      const cappedCount = Math.min(step.count, prevCount)
      const percent = totalStudents > 0 ? Math.round((cappedCount / totalStudents) * 100) : 0
      return { stage: step.stage, count: cappedCount, percent }
    })

    // 3. Engagement trends (last 30 days)
    const activityTrend = await prisma.userActivity.groupBy({
      by: ["date"],
      where: { date: { gte: thirtyDaysAgo } },
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
      where: moduleTrailFilter,
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        trail: {
          select: { id: true, title: true, slug: true },
        },
        _count: {
          select: {
            progress: { where: { status: "COMPLETED" } },
            submissions: true,
          },
        },
      },
    })

    const submissions = await prisma.submission.findMany({
      where: {
        review: { isNot: null },
        module: moduleTrailFilter,
      },
      select: {
        moduleId: true,
        review: { select: { score: true } },
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

    // 5. Trail list for filters
    const trailsList = await prisma.trail.findMany({
      select: { id: true, title: true, slug: true },
      orderBy: { title: "asc" },
    })

    // 6. Module Drop-off Analysis
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
              select: { progress: { where: { status: "COMPLETED" } } },
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
        _count: { select: { enrollments: true } },
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
          isBottleneck: dropRate > 30,
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

    // 7. Trail Progress Statistics
    const trails = await prisma.trail.findMany({
      where: effectiveTrailFilter,
      select: {
        id: true,
        title: true,
        slug: true,
        modules: { select: { id: true } },
        _count: { select: { enrollments: true, certificates: true } },
      },
    })

    type TrailType = typeof trails[number]
    type TrailModuleType = { id: string }
    const trailProgress = await Promise.all(
      trails.map(async (trail: TrailType) => {
        const moduleIds = trail.modules.map((m: TrailModuleType) => m.id)
        const totalModules = moduleIds.length

        const completedProgress = await prisma.moduleProgress.count({
          where: { moduleId: { in: moduleIds }, status: "COMPLETED" },
        })

        const trailSubmissions = await prisma.submission.count({
          where: { moduleId: { in: moduleIds } },
        })

        const approvedSubmissions = await prisma.submission.count({
          where: { moduleId: { in: moduleIds }, status: "APPROVED" },
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
      where: studentWhereClause,
      select: {
        id: true,
        name: true,
        totalXP: true,
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
      modulesCompleted: s._count.moduleProgress,
      approvedWorks: s._count.submissions,
      certificates: s._count.certificates,
    }))

    // Score distribution
    const reviewWhereClause = trailFilter !== "all"
      ? { submission: { module: { trailId: trailFilter } } }
      : {}

    const allReviews = await prisma.review.findMany({
      where: reviewWhereClause,
      select: { score: true },
    })

    type ReviewType = { score: number }
    const scoreDistribution = {
      excellent: allReviews.filter((r: ReviewType) => r.score >= 9).length,
      good: allReviews.filter((r: ReviewType) => r.score >= 7 && r.score < 9).length,
      average: allReviews.filter((r: ReviewType) => r.score >= 5 && r.score < 7).length,
      poor: allReviews.filter((r: ReviewType) => r.score < 5).length,
      total: allReviews.length,
      avgScore: allReviews.length > 0
        ? Math.round((allReviews.reduce((a: number, r: ReviewType) => a + r.score, 0) / allReviews.length) * 10) / 10
        : null,
      filteredByTrail: trailFilter !== "all",
    }

    // 8. Students by trail with detailed progress
    const trailStudentsData = await prisma.trail.findMany({
      where: effectiveTrailFilter,
      select: {
        id: true,
        title: true,
        slug: true,
        enrollments: {
          take: 50,
          orderBy: { createdAt: "desc" as const },
          select: {
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                totalXP: true,
                telegramUsername: true,
              },
            },
          },
        },
        modules: {
          orderBy: { order: "asc" },
          select: { id: true, title: true, order: true, type: true },
        },
      },
    })

    type TrailStudentData = typeof trailStudentsData[number]
    type EnrollmentData = TrailStudentData["enrollments"][number]

    const studentsByTrail = await Promise.all(
      trailStudentsData.map(async (trail: TrailStudentData) => {
        const moduleIds = trail.modules.map((m: { id: string }) => m.id)
        const trailModules = trail.modules as Array<{ id: string; title: string; order: number; type: string }>

        const studentIds = trail.enrollments.map((e: EnrollmentData) => e.user.id)
        const trailStatusRecords = studentIds.length > 0
          ? await prisma.studentTrailStatus.findMany({
              where: { trailId: trail.id, studentId: { in: studentIds } },
              select: { studentId: true, status: true },
            })
          : []
        const trailStatusMap = new Map<string, string>()
        for (const r of trailStatusRecords) {
          trailStatusMap.set(r.studentId, r.status)
        }

        const studentsWithProgress = await Promise.all(
          trail.enrollments.map(async (enrollment: EnrollmentData) => {
            const userId = enrollment.user.id

            const moduleProgressRecords = await prisma.moduleProgress.findMany({
              where: { userId, moduleId: { in: moduleIds } },
              select: {
                moduleId: true,
                status: true,
                startedAt: true,
                completedAt: true,
              },
            })

            const studentSubmissions = await prisma.submission.findMany({
              where: { userId, moduleId: { in: moduleIds } },
              select: {
                id: true,
                moduleId: true,
                status: true,
                review: { select: { id: true } },
              },
              orderBy: { createdAt: "desc" },
            })

            const moduleDetails = trailModules.map(mod => {
              const progress = moduleProgressRecords.find(
                (p: { moduleId: string }) => p.moduleId === mod.id
              )
              const approvedSub = studentSubmissions.find(
                (s: { moduleId: string; status: string }) => s.moduleId === mod.id && s.status === "APPROVED"
              )
              const latestSub = approvedSub || studentSubmissions.find(
                (s: { moduleId: string }) => s.moduleId === mod.id
              )

              return {
                id: mod.id,
                title: mod.title,
                order: mod.order,
                type: mod.type,
                status: progress?.status || "NOT_STARTED",
                submissionId: latestSub?.id || null,
              }
            })

            const completedCount = moduleProgressRecords.filter(
              (p: { status: string }) => p.status === "COMPLETED"
            ).length

            const startDates = moduleProgressRecords
              .filter((p: { startedAt: Date | null }) => p.startedAt !== null)
              .map((p: { startedAt: Date | null }) => new Date(p.startedAt!).getTime())
            const dateStart = startDates.length > 0
              ? new Date(Math.min(...startDates)).toISOString()
              : null

            const allCompleted = moduleIds.length > 0 && completedCount === moduleIds.length
            let dateEnd: string | null = null
            if (allCompleted) {
              const endDates = moduleProgressRecords
                .filter((p: { completedAt: Date | null }) => p.completedAt !== null)
                .map((p: { completedAt: Date | null }) => new Date(p.completedAt!).getTime())
              dateEnd = endDates.length > 0
                ? new Date(Math.max(...endDates)).toISOString()
                : null
            }

            const submissionsStats = await prisma.submission.groupBy({
              by: ["status"],
              where: { userId, moduleId: { in: moduleIds } },
              _count: true,
            })

            const studentReviews = await prisma.review.findMany({
              where: { submission: { userId, moduleId: { in: moduleIds } } },
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
              telegramUsername: enrollment.user.telegramUsername,
              totalXP: enrollment.user.totalXP,
              modulesCompleted: completedCount,
              totalModules: moduleIds.length,
              completionPercent: moduleIds.length > 0 ? Math.round((completedCount / moduleIds.length) * 100) : 0,
              submissions: { approved, pending, revision, total: approved + pending + revision },
              avgScore,
              dateStart,
              dateEnd,
              modules: moduleDetails,
              trailStatus: trailStatusMap.get(userId) || "LEARNING",
            }
          })
        )

        return {
          trailId: trail.id,
          trailTitle: trail.title,
          trailSlug: trail.slug,
          students: studentsWithProgress.sort((a: { completionPercent: number }, b: { completionPercent: number }) => b.completionPercent - a.completionPercent),
        }
      })
    )

    return NextResponse.json({
      churnRisk: {
        high: churnRisk.high,
        highCount: churnRisk.high.length,
        medium: churnRisk.medium,
        mediumCount: churnRisk.medium.length,
        low: churnRisk.low,
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
      trailProgress,
      topStudents: topStudentsData,
      scoreDistribution,
      dropoffAnalysis,
      studentsByTrail,
      filters: {
        trails: trailsList,
        currentTrail: trailFilter,
        currentPeriod: periodFilter,
      },
    })
  } catch (error) {
    console.error("External analytics API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
