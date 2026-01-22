import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ACHIEVEMENTS, getAchievement } from "@/lib/achievements"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's earned achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: session.user.id },
      orderBy: { earnedAt: "desc" },
    })

    // Map to full achievement data
    const earned = userAchievements
      .map((ua: { achievementId: string; earnedAt: Date }) => {
        const def = getAchievement(ua.achievementId)
        if (!def) return null
        return {
          ...def,
          earnedAt: ua.earnedAt.toISOString(),
        }
      })
      .filter(Boolean)

    // Get all possible achievements with locked status
    const allAchievements = Object.values(ACHIEVEMENTS).map((def) => {
      const userAch = userAchievements.find((ua: { achievementId: string }) => ua.achievementId === def.id)
      return {
        ...def,
        earned: !!userAch,
        earnedAt: userAch?.earnedAt.toISOString() || null,
      }
    })

    return NextResponse.json({
      earned,
      all: allAchievements,
      count: earned.length,
      total: Object.keys(ACHIEVEMENTS).length,
    })
  } catch (error) {
    console.error("Achievements error:", error)
    return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 })
  }
}

// Check and award achievements (called after user actions)
export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get user stats
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalXP: true,
        currentStreak: true,
        _count: {
          select: {
            moduleProgress: { where: { status: "COMPLETED" } },
            submissions: true,
            certificates: true,
            enrollments: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get approved submissions count
    const approvedCount = await prisma.submission.count({
      where: { userId, status: "APPROVED" },
    })

    // Get perfect scores count
    const perfectScores = await prisma.review.count({
      where: {
        submission: { userId },
        score: 10,
      },
    })

    // Check leaderboard position
    const higherRanked = await prisma.user.count({
      where: {
        role: "STUDENT",
        totalXP: { gt: user.totalXP },
      },
    })
    const rank = higherRanked + 1

    // Existing achievements
    const existing = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    })
    const existingIds = new Set(existing.map((e: { achievementId: string }) => e.achievementId))

    // Determine which achievements to award
    const toAward: string[] = []

    // First achievements
    if (user._count.enrollments >= 1 && !existingIds.has("FIRST_TRAIL")) {
      toAward.push("FIRST_TRAIL")
    }
    if (user._count.moduleProgress >= 1 && !existingIds.has("FIRST_MODULE")) {
      toAward.push("FIRST_MODULE")
    }
    if (user._count.submissions >= 1 && !existingIds.has("FIRST_SUBMISSION")) {
      toAward.push("FIRST_SUBMISSION")
    }
    if (approvedCount >= 1 && !existingIds.has("FIRST_APPROVED")) {
      toAward.push("FIRST_APPROVED")
    }

    // Module milestones
    if (user._count.moduleProgress >= 5 && !existingIds.has("MODULES_5")) {
      toAward.push("MODULES_5")
    }
    if (user._count.moduleProgress >= 10 && !existingIds.has("MODULES_10")) {
      toAward.push("MODULES_10")
    }
    if (user._count.moduleProgress >= 25 && !existingIds.has("MODULES_25")) {
      toAward.push("MODULES_25")
    }

    // XP milestones
    if (user.totalXP >= 100 && !existingIds.has("XP_100")) {
      toAward.push("XP_100")
    }
    if (user.totalXP >= 500 && !existingIds.has("XP_500")) {
      toAward.push("XP_500")
    }
    if (user.totalXP >= 1000 && !existingIds.has("XP_1000")) {
      toAward.push("XP_1000")
    }
    if (user.totalXP >= 5000 && !existingIds.has("XP_5000")) {
      toAward.push("XP_5000")
    }

    // Streak achievements
    if (user.currentStreak >= 3 && !existingIds.has("STREAK_3")) {
      toAward.push("STREAK_3")
    }
    if (user.currentStreak >= 7 && !existingIds.has("STREAK_7")) {
      toAward.push("STREAK_7")
    }
    if (user.currentStreak >= 30 && !existingIds.has("STREAK_30")) {
      toAward.push("STREAK_30")
    }

    // Perfect scores
    if (perfectScores >= 1 && !existingIds.has("PERFECT_10")) {
      toAward.push("PERFECT_10")
    }

    // Certificate
    if (user._count.certificates >= 1 && !existingIds.has("FIRST_CERTIFICATE")) {
      toAward.push("FIRST_CERTIFICATE")
    }

    // Leaderboard
    if (rank <= 10 && !existingIds.has("TOP_10")) {
      toAward.push("TOP_10")
    }
    if (rank <= 3 && !existingIds.has("TOP_3")) {
      toAward.push("TOP_3")
    }

    // Award new achievements
    if (toAward.length > 0) {
      await prisma.userAchievement.createMany({
        data: toAward.map((achievementId) => ({
          userId,
          achievementId,
        })),
        skipDuplicates: true,
      })

      // Create notifications for new achievements
      const notifications = toAward.map((achievementId) => {
        const def = getAchievement(achievementId)
        return {
          userId,
          type: "ACHIEVEMENT_EARNED",
          title: `Достижение: ${def?.name || achievementId}`,
          message: def?.description || "Вы получили новое достижение!",
          link: "/profile",
        }
      })

      await prisma.notification.createMany({ data: notifications })
    }

    return NextResponse.json({
      awarded: toAward,
      count: toAward.length,
    })
  } catch (error) {
    console.error("Award achievements error:", error)
    return NextResponse.json({ error: "Failed to award achievements" }, { status: 500 })
  }
}
