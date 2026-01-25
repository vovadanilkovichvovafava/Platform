// Achievement definitions
export interface AchievementDef {
  id: string
  name: string
  description: string
  icon: string // emoji
  color: string // tailwind color class
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
}

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  // Getting Started
  FIRST_MODULE: {
    id: "FIRST_MODULE",
    name: "Первый шаг",
    description: "Завершите первый модуль",
    icon: "🎯",
    color: "bg-green-100 text-green-700",
    rarity: "common",
  },
  FIRST_TRAIL: {
    id: "FIRST_TRAIL",
    name: "Первый trail",
    description: "Записаться на первый trail",
    icon: "🚀",
    color: "bg-blue-100 text-blue-700",
    rarity: "common",
  },
  FIRST_SUBMISSION: {
    id: "FIRST_SUBMISSION",
    name: "Первая работа",
    description: "Отправьте первую работу на проверку",
    icon: "📝",
    color: "bg-purple-100 text-purple-700",
    rarity: "common",
  },
  FIRST_APPROVED: {
    id: "FIRST_APPROVED",
    name: "Первый успех",
    description: "Получите первую одобренную работу",
    icon: "✅",
    color: "bg-green-100 text-green-700",
    rarity: "common",
  },

  // Progress
  MODULES_5: {
    id: "MODULES_5",
    name: "Ученик",
    description: "Завершите 5 модулей",
    icon: "📚",
    color: "bg-blue-100 text-blue-700",
    rarity: "common",
  },
  MODULES_10: {
    id: "MODULES_10",
    name: "Студент",
    description: "Завершите 10 модулей",
    icon: "🎓",
    color: "bg-indigo-100 text-indigo-700",
    rarity: "uncommon",
  },
  MODULES_25: {
    id: "MODULES_25",
    name: "Эксперт",
    description: "Завершите 25 модулей",
    icon: "🏆",
    color: "bg-yellow-100 text-yellow-700",
    rarity: "rare",
  },

  // XP Milestones
  XP_100: {
    id: "XP_100",
    name: "Первая сотня",
    description: "Заработайте 100 XP",
    icon: "💯",
    color: "bg-orange-100 text-orange-700",
    rarity: "common",
  },
  XP_500: {
    id: "XP_500",
    name: "Полтысячи",
    description: "Заработайте 500 XP",
    icon: "⭐",
    color: "bg-yellow-100 text-yellow-700",
    rarity: "uncommon",
  },
  XP_1000: {
    id: "XP_1000",
    name: "Тысячник",
    description: "Заработайте 1000 XP",
    icon: "🌟",
    color: "bg-amber-100 text-amber-700",
    rarity: "rare",
  },
  XP_5000: {
    id: "XP_5000",
    name: "Легенда",
    description: "Заработайте 5000 XP",
    icon: "👑",
    color: "bg-purple-100 text-purple-700",
    rarity: "legendary",
  },

  // Perfect scores
  PERFECT_10: {
    id: "PERFECT_10",
    name: "Перфекционист",
    description: "Получите оценку 10/10",
    icon: "💎",
    color: "bg-cyan-100 text-cyan-700",
    rarity: "uncommon",
  },
  PERFECT_STREAK_3: {
    id: "PERFECT_STREAK_3",
    name: "Идеальная серия",
    description: "Получите 3 оценки 10/10 подряд",
    icon: "💎",
    color: "bg-purple-100 text-purple-700",
    rarity: "epic",
  },

  // Certificates
  FIRST_CERTIFICATE: {
    id: "FIRST_CERTIFICATE",
    name: "Сертифицирован",
    description: "Получите первый сертификат",
    icon: "📜",
    color: "bg-amber-100 text-amber-700",
    rarity: "rare",
  },

  // Speed achievements
  SPEED_DEMON: {
    id: "SPEED_DEMON",
    name: "Скоростной",
    description: "Завершите модуль за один день",
    icon: "⚡",
    color: "bg-yellow-100 text-yellow-700",
    rarity: "uncommon",
  },

  // Social
  TOP_10: {
    id: "TOP_10",
    name: "Топ-10",
    description: "Попадите в топ-10 лидерборда",
    icon: "🏅",
    color: "bg-yellow-100 text-yellow-700",
    rarity: "rare",
  },
  TOP_3: {
    id: "TOP_3",
    name: "Призёр",
    description: "Попадите в топ-3 лидерборда",
    icon: "🥇",
    color: "bg-amber-100 text-amber-700",
    rarity: "epic",
  },
}

export const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"]

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS[id]
}

export function getAllAchievements(): AchievementDef[] {
  return Object.values(ACHIEVEMENTS)
}
