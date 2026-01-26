import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
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

    return NextResponse.json({
      churnRisk: {
        high: churnRisk.high.slice(0, 20),
        highCount: churnRisk.high.length,
        medium: churnRisk.medium.slice(0, 20),
        mediumCount: churnRisk.medium.length,
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
    })
  } catch (error) {
    console.error("Advanced analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
