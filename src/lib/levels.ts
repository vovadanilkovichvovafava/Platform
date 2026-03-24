// Единый модуль для уровней, рангов и XP
// Источник истины для всех расчётов прогресса

// ==============================================
// КОНФИГУРАЦИЯ УРОВНЕЙ
// ==============================================

export interface LevelConfig {
  level: number
  name: string
  minXP: number
  maxXP: number | null // null = бесконечность (максимальный уровень)
  color: string // tailwind color class
  bgColor: string // background color class
  icon: string // emoji или иконка
}

// Уровни масштабируемы - просто добавьте новые в массив
export const LEVELS: LevelConfig[] = [
  { level: 1, name: "Новичок", minXP: 0, maxXP: 100, color: "text-gray-600 dark:text-gray-400", bgColor: "bg-gray-100 dark:bg-gray-800", icon: "🌱" },
  { level: 2, name: "Ученик", minXP: 100, maxXP: 250, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900", icon: "📖" },
  { level: 3, name: "Практик", minXP: 250, maxXP: 500, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900", icon: "💪" },
  { level: 4, name: "Специалист", minXP: 500, maxXP: 1000, color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-100 dark:bg-indigo-900", icon: "⭐" },
  { level: 5, name: "Эксперт", minXP: 1000, maxXP: 2000, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900", icon: "🏆" },
  { level: 6, name: "Мастер", minXP: 2000, maxXP: 3500, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900", icon: "👑" },
  { level: 7, name: "Гуру", minXP: 3500, maxXP: 5000, color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900", icon: "🔥" },
  { level: 8, name: "Легенда", minXP: 5000, maxXP: null, color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900", icon: "🌟" },
]

// ==============================================
// КОНФИГУРАЦИЯ РАНГОВ
// ==============================================

export interface RankConfig {
  id: string
  name: string
  minXP: number
  maxXP: number | null
  color: string
  bgColor: string
  borderColor: string
  description: string
}

// Ранги - более широкая классификация (используется для бейджей)
export const RANKS: RankConfig[] = [
  {
    id: "beginner",
    name: "Beginner",
    minXP: 0,
    maxXP: 200,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    borderColor: "border-gray-300 dark:border-gray-600",
    description: "Начало пути",
  },
  {
    id: "intermediate",
    name: "Intermediate",
    minXP: 200,
    maxXP: 500,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900",
    borderColor: "border-green-400 dark:border-green-600",
    description: "Уверенный рост",
  },
  {
    id: "advanced",
    name: "Advanced",
    minXP: 500,
    maxXP: 1500,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900",
    borderColor: "border-blue-400 dark:border-blue-600",
    description: "Продвинутый уровень",
  },
  {
    id: "expert",
    name: "Expert",
    minXP: 1500,
    maxXP: 3000,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900",
    borderColor: "border-purple-400 dark:border-purple-600",
    description: "Экспертное мастерство",
  },
  {
    id: "master",
    name: "Master",
    minXP: 3000,
    maxXP: null,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900",
    borderColor: "border-amber-400 dark:border-amber-600",
    description: "Высшее достижение",
  },
]

// ==============================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С УРОВНЯМИ
// ==============================================

export interface LevelInfo {
  current: LevelConfig
  next: LevelConfig | null
  xpInLevel: number
  xpToNext: number
  progressPercent: number
  isMaxLevel: boolean
}

/**
 * Получить текущий уровень по XP
 */
export function getLevel(xp: number): LevelConfig {
  // Ищем уровень с конца (от высшего к низшему)
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) {
      return LEVELS[i]
    }
  }
  return LEVELS[0]
}

/**
 * Получить полную информацию об уровне и прогрессе
 */
export function getLevelInfo(xp: number): LevelInfo {
  const current = getLevel(xp)
  const currentIndex = LEVELS.findIndex(l => l.level === current.level)
  const next = currentIndex < LEVELS.length - 1 ? LEVELS[currentIndex + 1] : null

  const isMaxLevel = next === null

  if (isMaxLevel) {
    return {
      current,
      next: null,
      xpInLevel: xp - current.minXP,
      xpToNext: 0,
      progressPercent: 100,
      isMaxLevel: true,
    }
  }

  const xpInLevel = xp - current.minXP
  const xpNeededForLevel = (current.maxXP ?? 0) - current.minXP
  const xpToNext = (current.maxXP ?? 0) - xp
  const progressPercent = Math.min(100, Math.round((xpInLevel / xpNeededForLevel) * 100))

  return {
    current,
    next,
    xpInLevel,
    xpToNext,
    progressPercent,
    isMaxLevel: false,
  }
}

// ==============================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С РАНГАМИ
// ==============================================

export interface RankInfo {
  current: RankConfig
  next: RankConfig | null
  xpInRank: number
  xpToNext: number
  progressPercent: number
  isMaxRank: boolean
}

/**
 * Получить текущий ранг по XP
 */
export function getRank(xp: number): RankConfig {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXP) {
      return RANKS[i]
    }
  }
  return RANKS[0]
}

/**
 * Получить полную информацию о ранге и прогрессе
 */
export function getRankInfo(xp: number): RankInfo {
  const current = getRank(xp)
  const currentIndex = RANKS.findIndex(r => r.id === current.id)
  const next = currentIndex < RANKS.length - 1 ? RANKS[currentIndex + 1] : null

  const isMaxRank = next === null

  if (isMaxRank) {
    return {
      current,
      next: null,
      xpInRank: xp - current.minXP,
      xpToNext: 0,
      progressPercent: 100,
      isMaxRank: true,
    }
  }

  const xpInRank = xp - current.minXP
  const xpNeededForRank = (current.maxXP ?? 0) - current.minXP
  const xpToNext = (current.maxXP ?? 0) - xp
  const progressPercent = Math.min(100, Math.round((xpInRank / xpNeededForRank) * 100))

  return {
    current,
    next,
    xpInRank,
    xpToNext,
    progressPercent,
    isMaxRank: false,
  }
}

// ==============================================
// УТИЛИТЫ
// ==============================================

/**
 * Получить XP необходимый для следующего уровня
 */
export function getXPForNextLevel(currentLevel: number): number {
  const nextLevel = LEVELS.find(l => l.level === currentLevel + 1)
  return nextLevel?.minXP ?? Infinity
}

/**
 * Получить XP необходимый для конкретного уровня
 */
export function getXPForLevel(level: number): number {
  const levelConfig = LEVELS.find(l => l.level === level)
  return levelConfig?.minXP ?? 0
}

/**
 * Вычислить сколько XP даёт модуль в зависимости от типа и баллов
 * Используется как справочная функция, реальные баллы берутся из БД
 */
export function getModuleXP(moduleType: "THEORY" | "PRACTICE" | "PROJECT", basePoints?: number): number {
  if (basePoints !== undefined) return basePoints

  switch (moduleType) {
    case "THEORY": return 50
    case "PRACTICE": return 75
    case "PROJECT": return 100
    default: return 50
  }
}

/**
 * Форматирование XP для отображения
 */
export function formatXP(xp: number): string {
  if (xp >= 10000) {
    return `${(xp / 1000).toFixed(1)}k`
  }
  return xp.toLocaleString("ru-RU")
}
