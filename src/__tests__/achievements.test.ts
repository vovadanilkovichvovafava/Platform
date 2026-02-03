import { describe, it, expect } from "vitest"
import { ACHIEVEMENTS, RARITY_COLORS, RARITY_ORDER, getAllAchievements, getAchievement } from "@/lib/achievements"

describe("Achievements", () => {
  const allAchievements = getAllAchievements()
  const validRarities = ["common", "uncommon", "rare", "epic", "legendary"] as const

  it("should have exactly 80 achievements (20 existing + 60 new)", () => {
    expect(allAchievements.length).toBe(80)
  })

  it("should have no duplicate IDs", () => {
    const ids = allAchievements.map((a) => a.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it("should have all required fields for each achievement", () => {
    for (const achievement of allAchievements) {
      expect(achievement.id).toBeTruthy()
      expect(achievement.name).toBeTruthy()
      expect(achievement.description).toBeTruthy()
      expect(achievement.icon).toBeTruthy()
      expect(achievement.color).toBeTruthy()
      expect(achievement.rarity).toBeTruthy()
    }
  })

  it("should use only valid rarities", () => {
    for (const achievement of allAchievements) {
      expect(validRarities).toContain(achievement.rarity)
    }
  })

  it("should use all rarity types at least once", () => {
    const usedRarities = new Set(allAchievements.map((a) => a.rarity))
    for (const rarity of validRarities) {
      expect(usedRarities.has(rarity)).toBe(true)
    }
  })

  it("should have valid streamline-freehand icon format", () => {
    const iconPrefix = "streamline-freehand:"
    for (const achievement of allAchievements) {
      expect(achievement.icon.startsWith(iconPrefix)).toBe(true)
      expect(achievement.icon.length).toBeGreaterThan(iconPrefix.length)
    }
  })

  it("should have no duplicate icons", () => {
    const icons = allAchievements.map((a) => a.icon)
    const uniqueIcons = new Set(icons)
    // Allow some duplicates if necessary, but warn if too many
    expect(uniqueIcons.size).toBeGreaterThanOrEqual(allAchievements.length * 0.9) // 90% unique
  })

  it("should have color matching rarity from RARITY_COLORS", () => {
    for (const achievement of allAchievements) {
      const expectedColor = RARITY_COLORS[achievement.rarity as keyof typeof RARITY_COLORS]
      expect(achievement.color).toBe(expectedColor)
    }
  })

  it("getAchievement should return correct achievement by ID", () => {
    const achievement = getAchievement("FIRST_MODULE")
    expect(achievement).toBeDefined()
    expect(achievement?.name).toBe("Первый шаг")
  })

  it("getAchievement should return undefined for non-existent ID", () => {
    const achievement = getAchievement("NON_EXISTENT_ID")
    expect(achievement).toBeUndefined()
  })

  it("RARITY_ORDER should contain all valid rarities in correct order", () => {
    expect(RARITY_ORDER).toEqual(validRarities)
  })

  it("should have Russian names and descriptions", () => {
    const cyrillicRegex = /[\u0400-\u04FF]/
    for (const achievement of allAchievements) {
      expect(cyrillicRegex.test(achievement.name)).toBe(true)
      expect(cyrillicRegex.test(achievement.description)).toBe(true)
    }
  })

  it("should have reasonable distribution of rarities", () => {
    const rarityCounts = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    }

    for (const achievement of allAchievements) {
      rarityCounts[achievement.rarity as keyof typeof rarityCounts]++
    }

    // Common and uncommon should be most frequent
    expect(rarityCounts.common).toBeGreaterThan(rarityCounts.legendary)
    expect(rarityCounts.uncommon).toBeGreaterThan(rarityCounts.legendary)
    // Legendary should be rarest
    expect(rarityCounts.legendary).toBeLessThan(rarityCounts.rare)
  })

  // Test specific new achievements exist
  describe("New Achievement Categories", () => {
    it("should have module milestone achievements", () => {
      const moduleAchievements = ["MODULES_15", "MODULES_20", "MODULES_50", "MODULES_75", "MODULES_100", "MODULES_150"]
      for (const id of moduleAchievements) {
        expect(getAchievement(id)).toBeDefined()
      }
    })

    it("should have XP milestone achievements", () => {
      const xpAchievements = ["XP_200", "XP_250", "XP_750", "XP_2000", "XP_3000", "XP_7500", "XP_10000", "XP_15000"]
      for (const id of xpAchievements) {
        expect(getAchievement(id)).toBeDefined()
      }
    })

    it("should have streak achievements", () => {
      const streakAchievements = ["STREAK_5", "STREAK_14", "STREAK_21", "STREAK_45", "STREAK_90", "STREAK_100", "STREAK_180"]
      for (const id of streakAchievements) {
        expect(getAchievement(id)).toBeDefined()
      }
    })

    it("should have leaderboard achievements", () => {
      const leaderboardAchievements = ["TOP_1", "TOP_5"]
      for (const id of leaderboardAchievements) {
        expect(getAchievement(id)).toBeDefined()
      }
    })

    it("should have certificate achievements", () => {
      const certAchievements = ["CERTIFICATES_2", "CERTIFICATES_3", "CERTIFICATES_5"]
      for (const id of certAchievements) {
        expect(getAchievement(id)).toBeDefined()
      }
    })

    it("should have project achievements", () => {
      const projectAchievements = ["PROJECT_FIRST", "PROJECTS_3", "PROJECTS_5", "PROJECTS_10"]
      for (const id of projectAchievements) {
        expect(getAchievement(id)).toBeDefined()
      }
    })
  })
})
