import { prisma } from "@/lib/prisma"

// --- Shared activity constants ---
export const INACTIVE_DAYS = 10
export const NEWCOMER_DAYS = 14
export const CHURN_HIGH_DAYS = 14
export const CHURN_MEDIUM_DAYS = 10

// --- Shared activity computation ---

interface ActivitySources {
  activityDays?: Array<{ date: Date | string }>
  submissions?: Array<{ createdAt: Date | string }>
  enrollments?: Array<{ createdAt: Date | string }>
  moduleProgress?: Array<{ updatedAt: Date | string }>
}

/**
 * Compute the most recent activity date across all interaction sources.
 * Handles both pre-sorted (take:1, orderBy desc) and full arrays.
 */
export function getLastActiveDate(sources: ActivitySources): Date | null {
  const timestamps: number[] = []

  if (sources.activityDays) {
    for (const d of sources.activityDays) {
      timestamps.push(new Date(d.date).getTime())
    }
  }
  if (sources.submissions) {
    for (const s of sources.submissions) {
      timestamps.push(new Date(s.createdAt).getTime())
    }
  }
  if (sources.enrollments) {
    for (const e of sources.enrollments) {
      timestamps.push(new Date(e.createdAt).getTime())
    }
  }
  if (sources.moduleProgress) {
    for (const mp of sources.moduleProgress) {
      timestamps.push(new Date(mp.updatedAt).getTime())
    }
  }

  if (timestamps.length === 0) return null
  return new Date(Math.max(...timestamps))
}

/**
 * Compute days since last activity. Falls back to fallbackDate if lastActive is null.
 */
export function getDaysSinceActive(lastActive: Date | null, fallbackDate: Date | string): number {
  const ref = lastActive ?? new Date(fallbackDate)
  return Math.floor((new Date().getTime() - ref.getTime()) / (1000 * 60 * 60 * 24))
}

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
