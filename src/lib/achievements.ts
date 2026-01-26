// Achievement definitions
export interface AchievementDef {
  id: string
  name: string
  description: string
  icon: string // streamline-freehand icon name
  color: string // tailwind color class
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
}

// Стандартизированные цвета по редкостям
export const RARITY_COLORS = {
  common: "bg-gray-100 text-gray-600",
  uncommon: "bg-green-100 text-green-700",
  rare: "bg-blue-100 text-blue-700",
  epic: "bg-purple-100 text-purple-700",
  legendary: "bg-orange-100 text-orange-700",
} as const

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  // Getting Started
  FIRST_MODULE: {
    id: "FIRST_MODULE",
    name: "Первый шаг",
    description: "Завершите первый модуль",
    icon: "streamline-freehand:focus-frame-target-1",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  FIRST_TRAIL: {
    id: "FIRST_TRAIL",
    name: "Первый trail",
    description: "Записаться на первый trail",
    icon: "streamline-freehand:product-launch-go-sign",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  FIRST_SUBMISSION: {
    id: "FIRST_SUBMISSION",
    name: "Первая работа",
    description: "Отправьте первую работу на проверку",
    icon: "streamline-freehand:edit-pen-write-paper",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  FIRST_APPROVED: {
    id: "FIRST_APPROVED",
    name: "Первый успех",
    description: "Получите первую одобренную работу",
    icon: "streamline-freehand:form-validation-check-square-1",
    color: RARITY_COLORS.common,
    rarity: "common",
  },

  // Progress
  MODULES_5: {
    id: "MODULES_5",
    name: "Ученик",
    description: "Завершите 5 модулей",
    icon: "streamline-freehand:book-flip-page",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  MODULES_10: {
    id: "MODULES_10",
    name: "Студент",
    description: "Завершите 10 модулей",
    icon: "streamline-freehand:learning-programming-book",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  MODULES_25: {
    id: "MODULES_25",
    name: "Эксперт",
    description: "Завершите 25 модулей",
    icon: "streamline-freehand:book-library-shelf-1",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },

  // XP Milestones
  XP_100: {
    id: "XP_100",
    name: "Первая сотня",
    description: "Заработайте 100 XP",
    icon: "streamline-freehand:cash-payment-coin-1",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  XP_500: {
    id: "XP_500",
    name: "Полтысячи",
    description: "Заработайте 500 XP",
    icon: "streamline-freehand:loading-star-1",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  XP_1000: {
    id: "XP_1000",
    name: "Тысячник",
    description: "Заработайте 1000 XP",
    icon: "streamline-freehand:task-list-clipboard-favorite-star",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },
  XP_5000: {
    id: "XP_5000",
    name: "Легенда",
    description: "Заработайте 5000 XP",
    icon: "streamline-freehand:human-resources-employee-crown-woman",
    color: RARITY_COLORS.legendary,
    rarity: "legendary",
  },

  // Streaks
  STREAK_3: {
    id: "STREAK_3",
    name: "Разогрев",
    description: "Активность 3 дня подряд",
    icon: "streamline-freehand:movies-hot-trending",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  STREAK_7: {
    id: "STREAK_7",
    name: "Недельный марафон",
    description: "Активность 7 дней подряд",
    icon: "streamline-freehand:fireworks-2",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  STREAK_30: {
    id: "STREAK_30",
    name: "Месячный челлендж",
    description: "Активность 30 дней подряд",
    icon: "streamline-freehand:strategy-business-success-peak",
    color: RARITY_COLORS.epic,
    rarity: "epic",
  },

  // Perfect scores
  PERFECT_10: {
    id: "PERFECT_10",
    name: "Перфекционист",
    description: "Получите оценку 10/10",
    icon: "streamline-freehand:mask-diamond",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  PERFECT_STREAK_3: {
    id: "PERFECT_STREAK_3",
    name: "Идеальная серия",
    description: "Получите 3 оценки 10/10 подряд",
    icon: "streamline-freehand:wealth-crystal-shine",
    color: RARITY_COLORS.epic,
    rarity: "epic",
  },

  // Certificates
  FIRST_CERTIFICATE: {
    id: "FIRST_CERTIFICATE",
    name: "Сертифицирован",
    description: "Получите первый сертификат",
    icon: "streamline-freehand:office-stamp-document",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },

  // Speed achievements
  SPEED_DEMON: {
    id: "SPEED_DEMON",
    name: "Скоростной",
    description: "Завершите модуль за один день",
    icon: "streamline-freehand:time-stopwatch",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },

  // Social
  TOP_10: {
    id: "TOP_10",
    name: "Топ-10",
    description: "Попадите в топ-10 лидерборда",
    icon: "streamline-freehand:human-resources-rating-man",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },
  TOP_3: {
    id: "TOP_3",
    name: "Призёр",
    description: "Попадите в топ-3 лидерборда",
    icon: "streamline-freehand:presentation-podium-notes",
    color: RARITY_COLORS.epic,
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
