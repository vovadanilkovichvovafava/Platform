import { prisma } from "@/lib/prisma"
import { getAchievement } from "@/lib/achievements"

// Check and award achievements for a specific user (can be called server-side)
export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
  try {
    // Get user stats with extended data for new achievements
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalXP: true,
        telegramChatId: true,
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

    // Get completed PROJECT modules count
    const projectModulesCount = await prisma.moduleProgress.count({
      where: {
        userId,
        status: "COMPLETED",
        module: { type: "PROJECT" },
      },
    })

    // Get correct question attempts count
    const correctAnswers = await prisma.questionAttempt.count({
      where: {
        userId,
        isCorrect: true,
      },
    })

    // Get first-try correct answers count
    const firstTryCorrect = await prisma.questionAttempt.count({
      where: {
        userId,
        isCorrect: true,
        attempts: 1,
      },
    })

    // Check if user has achieved any level status
    const levelStatus = await prisma.taskProgress.findFirst({
      where: { userId },
      select: {
        juniorStatus: true,
        middleStatus: true,
        seniorStatus: true,
      },
    })

    // Existing achievements
    const existing = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    })
    const existingIds = new Set(existing.map((e) => e.achievementId))

    // Determine which achievements to award
    const toAward: string[] = []

    // === FIRST ACHIEVEMENTS (existing) ===
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

    // === MODULE MILESTONES (existing + new) ===
    if (user._count.moduleProgress >= 5 && !existingIds.has("MODULES_5")) {
      toAward.push("MODULES_5")
    }
    if (user._count.moduleProgress >= 10 && !existingIds.has("MODULES_10")) {
      toAward.push("MODULES_10")
    }
    if (user._count.moduleProgress >= 15 && !existingIds.has("MODULES_15")) {
      toAward.push("MODULES_15")
    }
    if (user._count.moduleProgress >= 20 && !existingIds.has("MODULES_20")) {
      toAward.push("MODULES_20")
    }
    if (user._count.moduleProgress >= 25 && !existingIds.has("MODULES_25")) {
      toAward.push("MODULES_25")
    }
    if (user._count.moduleProgress >= 50 && !existingIds.has("MODULES_50")) {
      toAward.push("MODULES_50")
    }
    if (user._count.moduleProgress >= 75 && !existingIds.has("MODULES_75")) {
      toAward.push("MODULES_75")
    }
    if (user._count.moduleProgress >= 100 && !existingIds.has("MODULES_100")) {
      toAward.push("MODULES_100")
    }
    if (user._count.moduleProgress >= 150 && !existingIds.has("MODULES_150")) {
      toAward.push("MODULES_150")
    }

    // === XP MILESTONES (existing + new) ===
    if (user.totalXP >= 100 && !existingIds.has("XP_100")) {
      toAward.push("XP_100")
    }
    if (user.totalXP >= 200 && !existingIds.has("XP_200")) {
      toAward.push("XP_200")
    }
    if (user.totalXP >= 250 && !existingIds.has("XP_250")) {
      toAward.push("XP_250")
    }
    if (user.totalXP >= 500 && !existingIds.has("XP_500")) {
      toAward.push("XP_500")
    }
    if (user.totalXP >= 750 && !existingIds.has("XP_750")) {
      toAward.push("XP_750")
    }
    if (user.totalXP >= 1000 && !existingIds.has("XP_1000")) {
      toAward.push("XP_1000")
    }
    if (user.totalXP >= 2000 && !existingIds.has("XP_2000")) {
      toAward.push("XP_2000")
    }
    if (user.totalXP >= 3000 && !existingIds.has("XP_3000")) {
      toAward.push("XP_3000")
    }
    if (user.totalXP >= 5000 && !existingIds.has("XP_5000")) {
      toAward.push("XP_5000")
    }
    if (user.totalXP >= 7500 && !existingIds.has("XP_7500")) {
      toAward.push("XP_7500")
    }
    if (user.totalXP >= 10000 && !existingIds.has("XP_10000")) {
      toAward.push("XP_10000")
    }
    if (user.totalXP >= 15000 && !existingIds.has("XP_15000")) {
      toAward.push("XP_15000")
    }

    // === PERFECT SCORES (existing + new) ===
    if (perfectScores >= 1 && !existingIds.has("PERFECT_10")) {
      toAward.push("PERFECT_10")
    }
    if (perfectScores >= 3 && !existingIds.has("PERFECT_3")) {
      toAward.push("PERFECT_3")
    }
    if (perfectScores >= 5 && !existingIds.has("PERFECT_5")) {
      toAward.push("PERFECT_5")
    }
    if (perfectScores >= 20 && !existingIds.has("PERFECT_20")) {
      toAward.push("PERFECT_20")
    }
    if (perfectScores >= 25 && !existingIds.has("PERFECT_25")) {
      toAward.push("PERFECT_25")
    }

    // === CERTIFICATES (existing + new) ===
    if (user._count.certificates >= 1 && !existingIds.has("FIRST_CERTIFICATE")) {
      toAward.push("FIRST_CERTIFICATE")
    }
    if (user._count.certificates >= 2 && !existingIds.has("CERTIFICATES_2")) {
      toAward.push("CERTIFICATES_2")
    }
    if (user._count.certificates >= 3 && !existingIds.has("CERTIFICATES_3")) {
      toAward.push("CERTIFICATES_3")
    }
    if (user._count.certificates >= 5 && !existingIds.has("CERTIFICATES_5")) {
      toAward.push("CERTIFICATES_5")
    }

    // === LEADERBOARD (existing + new) ===
    if (rank <= 10 && !existingIds.has("TOP_10")) {
      toAward.push("TOP_10")
    }
    if (rank <= 5 && !existingIds.has("TOP_5")) {
      toAward.push("TOP_5")
    }
    if (rank <= 3 && !existingIds.has("TOP_3")) {
      toAward.push("TOP_3")
    }
    if (rank === 1 && !existingIds.has("TOP_1")) {
      toAward.push("TOP_1")
    }

    // === TRAILS/ENROLLMENTS (new) ===
    if (user._count.enrollments >= 2 && !existingIds.has("TRAILS_2")) {
      toAward.push("TRAILS_2")
    }
    if (user._count.enrollments >= 3 && !existingIds.has("TRAILS_3")) {
      toAward.push("TRAILS_3")
    }
    if (user._count.enrollments >= 5 && !existingIds.has("TRAILS_5")) {
      toAward.push("TRAILS_5")
    }

    // === SUBMISSIONS (new) ===
    if (user._count.submissions >= 5 && !existingIds.has("SUBMISSIONS_5")) {
      toAward.push("SUBMISSIONS_5")
    }
    if (user._count.submissions >= 10 && !existingIds.has("SUBMISSIONS_10")) {
      toAward.push("SUBMISSIONS_10")
    }
    if (user._count.submissions >= 25 && !existingIds.has("SUBMISSIONS_25")) {
      toAward.push("SUBMISSIONS_25")
    }
    if (user._count.submissions >= 50 && !existingIds.has("SUBMISSIONS_50")) {
      toAward.push("SUBMISSIONS_50")
    }
    if (user._count.submissions >= 100 && !existingIds.has("SUBMISSIONS_100")) {
      toAward.push("SUBMISSIONS_100")
    }

    // === APPROVED WORKS (new) ===
    if (approvedCount >= 5 && !existingIds.has("APPROVED_5")) {
      toAward.push("APPROVED_5")
    }
    if (approvedCount >= 10 && !existingIds.has("APPROVED_10")) {
      toAward.push("APPROVED_10")
    }
    if (approvedCount >= 50 && !existingIds.has("APPROVED_50")) {
      toAward.push("APPROVED_50")
    }
    if (approvedCount >= 100 && !existingIds.has("APPROVED_100")) {
      toAward.push("APPROVED_100")
    }

    // === TELEGRAM (new) ===
    if (user.telegramChatId && !existingIds.has("TELEGRAM_CONNECTED")) {
      toAward.push("TELEGRAM_CONNECTED")
    }

    // === PROJECT MODULES (new) ===
    if (projectModulesCount >= 1 && !existingIds.has("PROJECT_FIRST")) {
      toAward.push("PROJECT_FIRST")
    }
    if (projectModulesCount >= 3 && !existingIds.has("PROJECTS_3")) {
      toAward.push("PROJECTS_3")
    }
    if (projectModulesCount >= 5 && !existingIds.has("PROJECTS_5")) {
      toAward.push("PROJECTS_5")
    }
    if (projectModulesCount >= 10 && !existingIds.has("PROJECTS_10")) {
      toAward.push("PROJECTS_10")
    }

    // === QUIZ/QUESTIONS (new) ===
    if (correctAnswers >= 50 && !existingIds.has("QUIZ_MASTER")) {
      toAward.push("QUIZ_MASTER")
    }
    if (correctAnswers >= 100 && !existingIds.has("QUIZ_CHAMPION")) {
      toAward.push("QUIZ_CHAMPION")
    }
    if (firstTryCorrect >= 10 && !existingIds.has("FIRST_TRY")) {
      toAward.push("FIRST_TRY")
    }

    // === LEVEL ACHIEVEMENTS (new) ===
    if (levelStatus) {
      if (levelStatus.juniorStatus === "PASSED" && !existingIds.has("LEVEL_JUNIOR")) {
        toAward.push("LEVEL_JUNIOR")
      }
      if (levelStatus.middleStatus === "PASSED" && !existingIds.has("LEVEL_MIDDLE")) {
        toAward.push("LEVEL_MIDDLE")
      }
      if (levelStatus.seniorStatus === "PASSED" && !existingIds.has("LEVEL_SENIOR")) {
        toAward.push("LEVEL_SENIOR")
      }
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

    return toAward
  } catch (error) {
    console.error("Check achievements error:", error)
    return []
  }
}

// Extended achievement check for time-based achievements
// Call this from module completion handler with completion time
export async function checkTimeBasedAchievements(
  userId: string,
  completedAt: Date
): Promise<string[]> {
  try {
    const existing = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    })
    const existingIds = new Set(existing.map((e) => e.achievementId))

    const toAward: string[] = []
    const hour = completedAt.getHours()

    // Night Owl: completed after 23:00
    if (hour >= 23 && !existingIds.has("NIGHT_OWL")) {
      toAward.push("NIGHT_OWL")
    }

    // Early Bird: completed before 7:00
    if (hour < 7 && !existingIds.has("EARLY_BIRD")) {
      toAward.push("EARLY_BIRD")
    }

    if (toAward.length > 0) {
      await prisma.userAchievement.createMany({
        data: toAward.map((achievementId) => ({
          userId,
          achievementId,
        })),
        skipDuplicates: true,
      })

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

    return toAward
  } catch (error) {
    console.error("Check time-based achievements error:", error)
    return []
  }
}

// Check comeback achievement (called when user returns after inactivity)
export async function checkComebackAchievement(userId: string): Promise<string[]> {
  try {
    const existing = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    })
    const existingIds = new Set(existing.map((e) => e.achievementId))

    if (existingIds.has("COMEBACK")) return []

    // Get last activity date
    const lastActivity = await prisma.userActivity.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
      skip: 1, // Skip today's activity
    })

    if (!lastActivity) return []

    const daysSinceLastActivity = Math.floor(
      (Date.now() - lastActivity.date.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceLastActivity >= 7) {
      await prisma.userAchievement.create({
        data: { userId, achievementId: "COMEBACK" },
      })

      const def = getAchievement("COMEBACK")
      await prisma.notification.create({
        data: {
          userId,
          type: "ACHIEVEMENT_EARNED",
          title: `Достижение: ${def?.name || "COMEBACK"}`,
          message: def?.description || "Вы получили новое достижение!",
          link: "/profile",
        },
      })

      return ["COMEBACK"]
    }

    return []
  } catch (error) {
    console.error("Check comeback achievement error:", error)
    return []
  }
}

// Check persistent achievement (called after failed submission)
export async function checkPersistentAchievement(userId: string): Promise<string[]> {
  try {
    const existing = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    })
    const existingIds = new Set(existing.map((e) => e.achievementId))

    if (existingIds.has("PERSISTENT")) return []

    // Count recent failed/revision submissions followed by new attempts
    const failedSubmissions = await prisma.submission.count({
      where: {
        userId,
        status: { in: ["FAILED", "REVISION"] },
      },
    })

    // If user has 3+ failed/revision and still submitting, award PERSISTENT
    if (failedSubmissions >= 3) {
      await prisma.userAchievement.create({
        data: { userId, achievementId: "PERSISTENT" },
      })

      const def = getAchievement("PERSISTENT")
      await prisma.notification.create({
        data: {
          userId,
          type: "ACHIEVEMENT_EARNED",
          title: `Достижение: ${def?.name || "PERSISTENT"}`,
          message: def?.description || "Вы получили новое достижение!",
          link: "/profile",
        },
      })

      return ["PERSISTENT"]
    }

    return []
  } catch (error) {
    console.error("Check persistent achievement error:", error)
    return []
  }
}

// Check speed achievements (modules per week/month)
export async function checkSpeedAchievements(userId: string): Promise<string[]> {
  try {
    const existing = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    })
    const existingIds = new Set(existing.map((e) => e.achievementId))

    const toAward: string[] = []

    // Check SPEED_WEEK: 5 modules in last 7 days
    if (!existingIds.has("SPEED_WEEK")) {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const weekModules = await prisma.moduleProgress.count({
        where: {
          userId,
          status: "COMPLETED",
          completedAt: { gte: weekAgo },
        },
      })

      if (weekModules >= 5) {
        toAward.push("SPEED_WEEK")
      }
    }

    // Check SPEED_MARATHON: 10 modules in last 30 days
    if (!existingIds.has("SPEED_MARATHON")) {
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)

      const monthModules = await prisma.moduleProgress.count({
        where: {
          userId,
          status: "COMPLETED",
          completedAt: { gte: monthAgo },
        },
      })

      if (monthModules >= 10) {
        toAward.push("SPEED_MARATHON")
      }
    }

    if (toAward.length > 0) {
      await prisma.userAchievement.createMany({
        data: toAward.map((achievementId) => ({
          userId,
          achievementId,
        })),
        skipDuplicates: true,
      })

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

    return toAward
  } catch (error) {
    console.error("Check speed achievements error:", error)
    return []
  }
}
