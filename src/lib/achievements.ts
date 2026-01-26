// Achievement definitions
export interface AchievementDef {
  id: string
  name: string
  description: string
  icon: string // streamline-pixel icon name
  color: string // tailwind color class
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
}

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  // Getting Started
  FIRST_MODULE: {
    id: "FIRST_MODULE",
    name: "Первый шаг",
    description: "Завершите первый модуль",
    icon: "streamline-pixel:business-product-target",
    color: "bg-green-100 text-green-700",
    rarity: "common",
  },
  FIRST_TRAIL: {
    id: "FIRST_TRAIL",
    name: "Первый trail",
    description: "Записаться на первый trail",
    icon: "streamline-pixel:business-product-startup-1",
    color: "bg-blue-100 text-blue-700",
    rarity: "common",
  },
  FIRST_SUBMISSION: {
    id: "FIRST_SUBMISSION",
    name: "Первая работа",
    description: "Отправьте первую работу на проверку",
    icon: "streamline-pixel:content-files-write-note",
    color: "bg-purple-100 text-purple-700",
    rarity: "common",
  },
  FIRST_APPROVED: {
    id: "FIRST_APPROVED",
    name: "Первый успех",
    description: "Получите первую одобренную работу",
    icon: "streamline-pixel:business-product-check",
    color: "bg-green-100 text-green-700",
    rarity: "common",
  },

  // Progress
  MODULES_5: {
    id: "MODULES_5",
    name: "Ученик",
    description: "Завершите 5 модулей",
    icon: "streamline-pixel:content-files-book",
    color: "bg-blue-100 text-blue-700",
    rarity: "common",
  },
  MODULES_10: {
    id: "MODULES_10",
    name: "Студент",
    description: "Завершите 10 модулей",
    icon: "streamline-pixel:school-science-graduation-cap",
    color: "bg-indigo-100 text-indigo-700",
    rarity: "uncommon",
  },
  MODULES_25: {
    id: "MODULES_25",
    name: "Эксперт",
    description: "Завершите 25 модулей",
    icon: "streamline-pixel:interface-essential-trophy",
    color: "bg-yellow-100 text-yellow-700",
    rarity: "rare",
  },

  // XP Milestones
  XP_100: {
    id: "XP_100",
    name: "Первая сотня",
    description: "Заработайте 100 XP",
    icon: "streamline-pixel:business-money-coin-currency",
    color: "bg-orange-100 text-orange-700",
    rarity: "common",
  },
  XP_500: {
    id: "XP_500",
    name: "Полтысячи",
    description: "Заработайте 500 XP",
    icon: "streamline-pixel:social-rewards-rating-star-1",
    color: "bg-yellow-100 text-yellow-700",
    rarity: "uncommon",
  },
  XP_1000: {
    id: "XP_1000",
    name: "Тысячник",
    description: "Заработайте 1000 XP",
    icon: "streamline-pixel:social-rewards-rating-star-2",
    color: "bg-amber-100 text-amber-700",
    rarity: "rare",
  },
  XP_5000: {
    id: "XP_5000",
    name: "Легенда",
    description: "Заработайте 5000 XP",
    icon: "streamline-pixel:social-rewards-vip-crown-king",
    color: "bg-purple-100 text-purple-700",
    rarity: "legendary",
  },

  // Streaks
  STREAK_3: {
    id: "STREAK_3",
    name: "Разогрев",
    description: "Активность 3 дня подряд",
    icon: "streamline-pixel:social-rewards-trends-hot-flame",
    color: "bg-orange-100 text-orange-700",
    rarity: "common",
  },
  STREAK_7: {
    id: "STREAK_7",
    name: "Недельный марафон",
    description: "Активность 7 дней подряд",
    icon: "streamline-pixel:ecology-global-warming-globe-fire",
    color: "bg-red-100 text-red-700",
    rarity: "uncommon",
  },
  STREAK_30: {
    id: "STREAK_30",
    name: "Месячный челлендж",
    description: "Активность 30 дней подряд",
    icon: "streamline-pixel:entertainment-events-hobbies-reward-winner-talent",
    color: "bg-red-100 text-red-700",
    rarity: "epic",
  },

  // Perfect scores
  PERFECT_10: {
    id: "PERFECT_10",
    name: "Перфекционист",
    description: "Получите оценку 10/10",
    icon: "streamline-pixel:money-payments-diamond",
    color: "bg-cyan-100 text-cyan-700",
    rarity: "uncommon",
  },
  PERFECT_STREAK_3: {
    id: "PERFECT_STREAK_3",
    name: "Идеальная серия",
    description: "Получите 3 оценки 10/10 подряд",
    icon: "streamline-pixel:business-prodect-diamond",
    color: "bg-purple-100 text-purple-700",
    rarity: "epic",
  },

  // Certificates
  FIRST_CERTIFICATE: {
    id: "FIRST_CERTIFICATE",
    name: "Сертифицирован",
    description: "Получите первый сертификат",
    icon: "streamline-pixel:social-rewards-certified-diploma",
    color: "bg-amber-100 text-amber-700",
    rarity: "rare",
  },

  // Speed achievements
  SPEED_DEMON: {
    id: "SPEED_DEMON",
    name: "Скоростной",
    description: "Завершите модуль за один день",
    icon: "streamline-pixel:interface-essential-stopwatch",
    color: "bg-yellow-100 text-yellow-700",
    rarity: "uncommon",
  },

  // Social
  TOP_10: {
    id: "TOP_10",
    name: "Топ-10",
    description: "Попадите в топ-10 лидерборда",
    icon: "streamline-pixel:business-products-climb-top",
    color: "bg-yellow-100 text-yellow-700",
    rarity: "rare",
  },
  TOP_3: {
    id: "TOP_3",
    name: "Призёр",
    description: "Попадите в топ-3 лидерборда",
    icon: "streamline-pixel:interface-essential-crown",
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
