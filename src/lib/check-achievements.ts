import { prisma } from "@/lib/prisma"
import { getAchievement } from "@/lib/achievements"

// Check and award achievements for a specific user (can be called server-side)
export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
  try {
    // Get user stats
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalXP: true,
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

    if (!user) return []

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
    const existingIds = new Set(existing.map((e) => e.achievementId))

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
          link: "/dashboard",
        }
      })

      await prisma.notification.createMany({ data: notifications })
    }

    return toAward
  } catch (error) {
    console.error("Check achievements error:", error)
    return []
  }
}
