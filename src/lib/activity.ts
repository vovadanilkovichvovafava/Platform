import { prisma } from "@/lib/prisma"

/**
 * Record user activity for today.
 * Creates a new record if first activity today, or increments actions count.
 */
export async function recordActivity(userId: string): Promise<void> {
  if (!userId) return

  try {
    // Get today's date at midnight UTC
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    await prisma.userActivity.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        actions: { increment: 1 },
      },
      create: {
        userId,
        date: today,
        actions: 1,
      },
    })
  } catch (error) {
    // Don't fail the main operation if activity tracking fails
    console.error("Failed to record activity:", error)
  }
}

/**
 * Get count of active days for a user
 */
export async function getActiveDaysCount(userId: string): Promise<number> {
  const count = await prisma.userActivity.count({
    where: { userId },
  })
  return count
}

/**
 * Get active days with dates for a user
 */
export async function getActiveDays(userId: string): Promise<Date[]> {
  const activities = await prisma.userActivity.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: "desc" },
  })
  return activities.map(a => a.date)
}
