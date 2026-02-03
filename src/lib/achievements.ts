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

  // ============================================
  // NEW ACHIEVEMENTS (60 total)
  // ============================================

  // === МОДУЛИ: Прогресс обучения ===
  MODULES_15: {
    id: "MODULES_15",
    name: "Прилежный ученик",
    description: "Завершите 15 модулей",
    icon: "streamline-freehand:book-bookmark",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  MODULES_20: {
    id: "MODULES_20",
    name: "Знаток",
    description: "Завершите 20 модулей",
    icon: "streamline-freehand:notes-book",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  MODULES_50: {
    id: "MODULES_50",
    name: "Профессионал",
    description: "Завершите 50 модулей",
    icon: "streamline-freehand:learning-programming-flag",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },
  MODULES_75: {
    id: "MODULES_75",
    name: "Мастер знаний",
    description: "Завершите 75 модулей",
    icon: "streamline-freehand:programming-code-idea",
    color: RARITY_COLORS.epic,
    rarity: "epic",
  },
  MODULES_100: {
    id: "MODULES_100",
    name: "Гуру обучения",
    description: "Завершите 100 модулей",
    icon: "streamline-freehand:programming-team-chat",
    color: RARITY_COLORS.epic,
    rarity: "epic",
  },
  MODULES_150: {
    id: "MODULES_150",
    name: "Академик",
    description: "Завершите 150 модулей",
    icon: "streamline-freehand:programming-user-head-matrix",
    color: RARITY_COLORS.legendary,
    rarity: "legendary",
  },

  // === XP: Вехи опыта ===
  XP_200: {
    id: "XP_200",
    name: "Двести очков",
    description: "Заработайте 200 XP",
    icon: "streamline-freehand:money-coin-cash",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  XP_250: {
    id: "XP_250",
    name: "Четверть тысячи",
    description: "Заработайте 250 XP",
    icon: "streamline-freehand:money-coin-purse",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  XP_750: {
    id: "XP_750",
    name: "Три четверти",
    description: "Заработайте 750 XP",
    icon: "streamline-freehand:money-bag",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  XP_2000: {
    id: "XP_2000",
    name: "Двухтысячник",
    description: "Заработайте 2000 XP",
    icon: "streamline-freehand:money-bag-dollar",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },
  XP_3000: {
    id: "XP_3000",
    name: "Мастер опыта",
    description: "Заработайте 3000 XP",
    icon: "streamline-freehand:money-cash-bill-stack",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },
  XP_7500: {
    id: "XP_7500",
    name: "Элита",
    description: "Заработайте 7500 XP",
    icon: "streamline-freehand:saving-safe",
    color: RARITY_COLORS.epic,
    rarity: "epic",
  },
  XP_10000: {
    id: "XP_10000",
    name: "Десять тысяч",
    description: "Заработайте 10000 XP",
    icon: "streamline-freehand:wealth-treasure-chest-open",
    color: RARITY_COLORS.epic,
    rarity: "epic",
  },
  XP_15000: {
    id: "XP_15000",
    name: "Бессмертный",
    description: "Заработайте 15000 XP",
    icon: "streamline-freehand:wealth-gold-bars",
    color: RARITY_COLORS.legendary,
    rarity: "legendary",
  },

  // === СТРИКИ: Серии активности ===
  STREAK_5: {
    id: "STREAK_5",
    name: "Пять дней",
    description: "Активность 5 дней подряд",
    icon: "streamline-freehand:time-clock-circle",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  STREAK_14: {
    id: "STREAK_14",
    name: "Две недели",
    description: "Активность 14 дней подряд",
    icon: "streamline-freehand:time-hourglass-triangle",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  STREAK_21: {
    id: "STREAK_21",
    name: "Три недели",
    description: "Активность 21 день подряд",
    icon: "streamline-freehand:calendar-date",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  STREAK_45: {
    id: "STREAK_45",
    name: "Полтора месяца",
    description: "Активность 45 дней подряд",
    icon: "streamline-freehand:calendar-grid",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },
  STREAK_90: {
    id: "STREAK_90",
    name: "Квартал силы",
    description: "Активность 90 дней подряд",
    icon: "streamline-freehand:timer-countdown-ten",
    color: RARITY_COLORS.epic,
    rarity: "epic",
  },
  STREAK_100: {
    id: "STREAK_100",
    name: "Сто дней",
    description: "Активность 100 дней подряд",
    icon: "streamline-freehand:waiting-room-clock",
    color: RARITY_COLORS.epic,
    rarity: "epic",
  },
  STREAK_180: {
    id: "STREAK_180",
    name: "Полугодовой марафон",
    description: "Активность 180 дней подряд",
    icon: "streamline-freehand:time-wrist-watch-1",
    color: RARITY_COLORS.legendary,
    rarity: "legendary",
  },

  // === КАЧЕСТВО: Идеальные оценки ===
  PERFECT_3: {
    id: "PERFECT_3",
    name: "Тройной успех",
    description: "Получите 3 оценки 10/10",
    icon: "streamline-freehand:form-validation-check-double",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  PERFECT_5: {
    id: "PERFECT_5",
    name: "Пятёрка отличника",
    description: "Получите 5 оценок 10/10",
    icon: "streamline-freehand:task-clipboard-check",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  PERFECT_STREAK_5: {
    id: "PERFECT_STREAK_5",
    name: "Безупречная серия",
    description: "Получите 5 оценок 10/10 подряд",
    icon: "streamline-freehand:task-list-clipboard-check",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },
  PERFECT_20: {
    id: "PERFECT_20",
    name: "Двадцатка идеала",
    description: "Получите 20 оценок 10/10",
    icon: "streamline-freehand:check-payment-sign",
    color: RARITY_COLORS.epic,
    rarity: "epic",
  },
  PERFECT_25: {
    id: "PERFECT_25",
    name: "Четверть сотни",
    description: "Получите 25 оценок 10/10",
    icon: "streamline-freehand:security-shield-network",
    color: RARITY_COLORS.legendary,
    rarity: "legendary",
  },

  // === СЕРТИФИКАТЫ ===
  CERTIFICATES_2: {
    id: "CERTIFICATES_2",
    name: "Дважды сертифицирован",
    description: "Получите 2 сертификата",
    icon: "streamline-freehand:stamps-portrait",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  CERTIFICATES_3: {
    id: "CERTIFICATES_3",
    name: "Трижды подтверждён",
    description: "Получите 3 сертификата",
    icon: "streamline-freehand:receipt",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },
  CERTIFICATES_5: {
    id: "CERTIFICATES_5",
    name: "Коллекционер дипломов",
    description: "Получите 5 сертификатов",
    icon: "streamline-freehand:office-file-sheet",
    color: RARITY_COLORS.epic,
    rarity: "epic",
  },

  // === ЛИДЕРБОРД ===
  TOP_5: {
    id: "TOP_5",
    name: "Топ-5",
    description: "Попадите в топ-5 лидерборда",
    icon: "streamline-freehand:human-resources-hierarchy",
    color: RARITY_COLORS.epic,
    rarity: "epic",
  },
  TOP_1: {
    id: "TOP_1",
    name: "Чемпион",
    description: "Займите 1 место в лидерборде",
    icon: "streamline-freehand:amusement-park-strength-meter",
    color: RARITY_COLORS.legendary,
    rarity: "legendary",
  },

  // === TRAILS: Записи на курсы ===
  TRAILS_2: {
    id: "TRAILS_2",
    name: "Два направления",
    description: "Запишитесь на 2 trail",
    icon: "streamline-freehand:hierarchy",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  TRAILS_3: {
    id: "TRAILS_3",
    name: "Три пути",
    description: "Запишитесь на 3 trail",
    icon: "streamline-freehand:hierarchy-web",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  TRAILS_5: {
    id: "TRAILS_5",
    name: "Многопрофильный",
    description: "Запишитесь на 5 trail",
    icon: "streamline-freehand:module-three-boxes",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },

  // === SUBMISSIONS: Отправки работ ===
  SUBMISSIONS_5: {
    id: "SUBMISSIONS_5",
    name: "Пять попыток",
    description: "Отправьте 5 работ на проверку",
    icon: "streamline-freehand:content-paper-edit",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  SUBMISSIONS_10: {
    id: "SUBMISSIONS_10",
    name: "Десяток работ",
    description: "Отправьте 10 работ на проверку",
    icon: "streamline-freehand:content-write",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  SUBMISSIONS_25: {
    id: "SUBMISSIONS_25",
    name: "Четверть сотни работ",
    description: "Отправьте 25 работ на проверку",
    icon: "streamline-freehand:content-brush-pen",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  SUBMISSIONS_50: {
    id: "SUBMISSIONS_50",
    name: "Полсотни работ",
    description: "Отправьте 50 работ на проверку",
    icon: "streamline-freehand:content-typewriter",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },
  SUBMISSIONS_100: {
    id: "SUBMISSIONS_100",
    name: "Сотня работ",
    description: "Отправьте 100 работ на проверку",
    icon: "streamline-freehand:design-process-drawing-board",
    color: RARITY_COLORS.epic,
    rarity: "epic",
  },

  // === APPROVED: Одобренные работы ===
  APPROVED_5: {
    id: "APPROVED_5",
    name: "Пять одобрений",
    description: "Получите одобрение 5 работ",
    icon: "streamline-freehand:cloud-check",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  APPROVED_10: {
    id: "APPROVED_10",
    name: "Десять побед",
    description: "Получите одобрение 10 работ",
    icon: "streamline-freehand:form-edition-clipboard-check",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  APPROVED_50: {
    id: "APPROVED_50",
    name: "Полсотни успехов",
    description: "Получите одобрение 50 работ",
    icon: "streamline-freehand:analytics-graph-line-triple",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },
  APPROVED_100: {
    id: "APPROVED_100",
    name: "Сотня одобрений",
    description: "Получите одобрение 100 работ",
    icon: "streamline-freehand:stats-line-graph-circle",
    color: RARITY_COLORS.epic,
    rarity: "epic",
  },

  // === СКОРОСТЬ: Быстрое прохождение ===
  SPEED_WEEK: {
    id: "SPEED_WEEK",
    name: "Недельный спринт",
    description: "Завершите 5 модулей за неделю",
    icon: "streamline-freehand:cursor-speed-1",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  SPEED_MARATHON: {
    id: "SPEED_MARATHON",
    name: "Марафонец",
    description: "Завершите 10 модулей за месяц",
    icon: "streamline-freehand:multimedia-controls-button-next",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },

  // === АКТИВНОСТЬ: Действия в платформе ===
  NIGHT_OWL: {
    id: "NIGHT_OWL",
    name: "Ночная сова",
    description: "Завершите модуль после 23:00",
    icon: "streamline-freehand:light-mode-dark-light",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  EARLY_BIRD: {
    id: "EARLY_BIRD",
    name: "Ранняя пташка",
    description: "Завершите модуль до 7:00 утра",
    icon: "streamline-freehand:light-mode-brightness-half",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },

  // === СОЦИАЛЬНОЕ: Telegram и связь ===
  TELEGRAM_CONNECTED: {
    id: "TELEGRAM_CONNECTED",
    name: "На связи",
    description: "Подключите Telegram-уведомления",
    icon: "streamline-freehand:push-notification-2",
    color: RARITY_COLORS.common,
    rarity: "common",
  },

  // === ПРОЕКТЫ: Практические задания ===
  PROJECT_FIRST: {
    id: "PROJECT_FIRST",
    name: "Первый проект",
    description: "Завершите первый проектный модуль",
    icon: "streamline-freehand:design-process-drawing-board-education",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  PROJECTS_3: {
    id: "PROJECTS_3",
    name: "Три проекта",
    description: "Завершите 3 проектных модуля",
    icon: "streamline-freehand:job-briefcase-document",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  PROJECTS_5: {
    id: "PROJECTS_5",
    name: "Портфолио",
    description: "Завершите 5 проектных модулей",
    icon: "streamline-freehand:products-purse",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },
  PROJECTS_10: {
    id: "PROJECTS_10",
    name: "Мастер проектов",
    description: "Завершите 10 проектных модулей",
    icon: "streamline-freehand:business-workflow-project-management",
    color: RARITY_COLORS.epic,
    rarity: "epic",
  },

  // === ТЕОРИЯ: Тестовые задания ===
  QUIZ_MASTER: {
    id: "QUIZ_MASTER",
    name: "Знаток тестов",
    description: "Ответьте правильно на 50 вопросов",
    icon: "streamline-freehand:conversation-question-text-1",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  QUIZ_CHAMPION: {
    id: "QUIZ_CHAMPION",
    name: "Чемпион викторин",
    description: "Ответьте правильно на 100 вопросов",
    icon: "streamline-freehand:help-question-circle",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },
  FIRST_TRY: {
    id: "FIRST_TRY",
    name: "С первой попытки",
    description: "Ответьте правильно на 10 вопросов с первой попытки",
    icon: "streamline-freehand:focus-cross",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },

  // === УРОВНИ: Достижение уровней ===
  LEVEL_JUNIOR: {
    id: "LEVEL_JUNIOR",
    name: "Джуниор",
    description: "Достигните уровня Junior в trail",
    icon: "streamline-freehand:stairs-ascend",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  LEVEL_MIDDLE: {
    id: "LEVEL_MIDDLE",
    name: "Мидл",
    description: "Достигните уровня Middle в trail",
    icon: "streamline-freehand:escalator-ascend-person",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
  LEVEL_SENIOR: {
    id: "LEVEL_SENIOR",
    name: "Сеньор",
    description: "Достигните уровня Senior в trail",
    icon: "streamline-freehand:business-metaphor-boat-success",
    color: RARITY_COLORS.rare,
    rarity: "rare",
  },

  // === ВОЗВРАЩЕНИЕ: Активность после паузы ===
  COMEBACK: {
    id: "COMEBACK",
    name: "Возвращение",
    description: "Вернитесь к обучению после 7 дней перерыва",
    icon: "streamline-freehand:synchronize-arrows",
    color: RARITY_COLORS.common,
    rarity: "common",
  },
  PERSISTENT: {
    id: "PERSISTENT",
    name: "Настойчивый",
    description: "Продолжайте обучение после 3 неудачных попыток",
    icon: "streamline-freehand:creativity-idea-strategy",
    color: RARITY_COLORS.uncommon,
    rarity: "uncommon",
  },
}

export const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"]

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS[id]
}

export function getAllAchievements(): AchievementDef[] {
  return Object.values(ACHIEVEMENTS)
}
