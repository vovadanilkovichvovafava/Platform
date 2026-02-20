import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyExternalAuth } from "@/lib/external-auth"
import { ACHIEVEMENTS } from "@/lib/achievements"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = verifyExternalAuth(request)
  if (authError) return authError

  try {
    const { id: userId } = await params

    // Get user data with progress, submissions, certificates
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        totalXP: true,
        currentStreak: true,
        createdAt: true,
        moduleProgress: {
          where: { status: "COMPLETED" },
          select: { id: true, moduleId: true },
        },
        submissions: {
          select: {
            id: true,
            status: true,
            moduleId: true,
          },
        },
        certificates: {
          select: {
            id: true,
            code: true,
            issuedAt: true,
            totalXP: true,
            level: true,
            trail: {
              select: {
                id: true,
                title: true,
                slug: true,
                color: true,
              },
            },
          },
          orderBy: { issuedAt: "desc" },
        },
        enrollments: {
          select: {
            trailId: true,
            createdAt: true,
            trail: {
              select: {
                id: true,
                title: true,
                slug: true,
                modules: { select: { id: true } },
              },
            },
          },
        },
        activityDays: {
          orderBy: { date: "desc" as const },
          take: 1,
          select: { date: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      )
    }

    // Get user achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
    })

    // Map achievements with definitions
    const allAchievements = Object.values(ACHIEVEMENTS).map((def) => {
      const userAch = userAchievements.find((ua: { achievementId: string }) => ua.achievementId === def.id)
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        color: def.color,
        rarity: def.rarity,
        earned: !!userAch,
        earnedAt: userAch?.earnedAt.toISOString() || null,
      }
    })

    const earnedAchievements = allAchievements.filter((a) => a.earned)

    const achievementStats = {
      earned: earnedAchievements.length,
      total: Object.keys(ACHIEVEMENTS).length,
      percentage: Math.round((earnedAchievements.length / Object.keys(ACHIEVEMENTS).length) * 100),
    }

    // Calculate submissions stats (same logic as dashboard)
    const approvedModuleIds = new Set(
      user.submissions
        .filter((s: { status: string; moduleId: string }) => s.status === "APPROVED")
        .map((s: { moduleId: string }) => s.moduleId)
    )

    const actualRevisionCount = user.submissions.filter(
      (s: { status: string; moduleId: string }) =>
        s.status === "REVISION" && !approvedModuleIds.has(s.moduleId)
    ).length

    const approvedCount = user.submissions.filter((s: { status: string }) => s.status === "APPROVED").length
    const pendingCount = user.submissions.filter((s: { status: string }) => s.status === "PENDING").length
    const failedCount = user.submissions.filter((s: { status: string }) => s.status === "FAILED").length

    const submissionStats = {
      approved: approvedCount,
      pending: pendingCount,
      revision: actualRevisionCount,
      failed: failedCount,
      total: approvedCount + pendingCount + actualRevisionCount + failedCount,
    }

    // Get leaderboard position
    const higherRanked = await prisma.user.count({
      where: {
        role: "STUDENT",
        totalXP: { gt: user.totalXP },
      },
    })
    const leaderboardRank = higherRanked + 1

    // Last activity
    const lastActivityDate = user.activityDays[0]?.date ?? null
    const daysSinceActive = lastActivityDate
      ? Math.floor((new Date().getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))

    // Per-trail progress
    type EnrollmentType = typeof user.enrollments[number]
    const trailProgress = user.enrollments.map((enrollment: EnrollmentType) => {
      const trail = enrollment.trail
      const moduleIds = trail.modules.map((m: { id: string }) => m.id)
      const totalModules = moduleIds.length
      const completedModules = user.moduleProgress.filter(
        (p: { moduleId: string }) => moduleIds.includes(p.moduleId)
      ).length

      return {
        trailId: trail.id,
        trailTitle: trail.title,
        trailSlug: trail.slug,
        enrolledAt: enrollment.createdAt.toISOString(),
        totalModules,
        completedModules,
        completionPercent: totalModules > 0
          ? Math.round((completedModules / totalModules) * 100)
          : 0,
      }
    })

    // Certificates serialized
    type CertificateType = typeof user.certificates[number]
    const certificates = user.certificates.map((cert: CertificateType) => ({
      id: cert.id,
      code: cert.code,
      issuedAt: cert.issuedAt.toISOString(),
      totalXP: cert.totalXP,
      level: cert.level,
      trail: {
        id: cert.trail.id,
        title: cert.trail.title,
        slug: cert.trail.slug,
        color: cert.trail.color,
      },
    }))

    return NextResponse.json({
      student: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        totalXP: user.totalXP,
        currentStreak: user.currentStreak,
        registeredAt: user.createdAt.toISOString(),
        lastActiveAt: lastActivityDate ? lastActivityDate.toISOString() : null,
        daysSinceActive,
        leaderboardRank,
        modulesCompleted: user.moduleProgress.length,
      },
      achievements: {
        stats: achievementStats,
        earned: earnedAchievements,
        all: allAchievements,
      },
      submissionStats,
      trailProgress,
      certificates,
    })
  } catch (error) {
    console.error("External student-achievements API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
