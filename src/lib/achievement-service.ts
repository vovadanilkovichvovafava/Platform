import { getAchievement } from "@/lib/achievements"
import {
  checkAndAwardAchievements,
  checkTimeBasedAchievements,
  checkSpeedAchievements,
  checkComebackAchievement,
  checkPersistentAchievement,
} from "@/lib/check-achievements"

export interface AwardedAchievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: string
}

/**
 * Unified achievement award service.
 * Runs all relevant achievement checks for a given event and returns
 * the list of newly awarded achievements with their definitions.
 *
 * Events:
 *  - MODULE_COMPLETED: after a module is marked completed
 *  - SUBMISSION_CREATED: after a student submits work
 *  - REVIEW_RECEIVED: after a teacher reviews (checks student achievements)
 *  - ACTIVITY_RECORDED: generic activity (comeback, etc.)
 */
export async function processAchievementEvent(
  event: "MODULE_COMPLETED" | "SUBMISSION_CREATED" | "REVIEW_RECEIVED" | "ACTIVITY_RECORDED",
  userId: string,
  context?: { completedAt?: Date }
): Promise<AwardedAchievement[]> {
  try {
    const allAwarded: string[] = []

    // Always run the main bulk check
    const bulkAwarded = await checkAndAwardAchievements(userId)
    allAwarded.push(...bulkAwarded)

    // Event-specific checks
    if (event === "MODULE_COMPLETED") {
      const completedAt = context?.completedAt || new Date()

      const timeAwarded = await checkTimeBasedAchievements(userId, completedAt)
      allAwarded.push(...timeAwarded)

      const speedAwarded = await checkSpeedAchievements(userId)
      allAwarded.push(...speedAwarded)

      const comebackAwarded = await checkComebackAchievement(userId)
      allAwarded.push(...comebackAwarded)
    }

    if (event === "SUBMISSION_CREATED") {
      const persistentAwarded = await checkPersistentAchievement(userId)
      allAwarded.push(...persistentAwarded)
    }

    if (event === "REVIEW_RECEIVED") {
      // After review: check comeback (user is active) and speed
      const comebackAwarded = await checkComebackAchievement(userId)
      allAwarded.push(...comebackAwarded)

      const speedAwarded = await checkSpeedAchievements(userId)
      allAwarded.push(...speedAwarded)
    }

    if (event === "ACTIVITY_RECORDED") {
      const comebackAwarded = await checkComebackAchievement(userId)
      allAwarded.push(...comebackAwarded)
    }

    // Deduplicate (in case multiple check functions award the same thing)
    const uniqueAwarded = [...new Set(allAwarded)]

    // Map to full achievement definitions
    const results: AwardedAchievement[] = []
    for (const id of uniqueAwarded) {
      const def = getAchievement(id)
      if (def) {
        results.push({
          id: def.id,
          name: def.name,
          description: def.description,
          icon: def.icon,
          rarity: def.rarity,
        })
      }
    }
    return results
  } catch (error) {
    console.error("processAchievementEvent error:", error)
    return []
  }
}
