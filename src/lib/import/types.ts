// Типы для системы импорта

export interface ParsedQuestion {
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

export interface ParsedModule {
  title: string
  slug: string
  type: "THEORY" | "PRACTICE" | "PROJECT"
  points: number
  description: string
  content: string
  questions: ParsedQuestion[]
  level?: string
  duration?: string
}

export interface ParsedTrail {
  title: string
  slug: string
  subtitle: string
  description: string
  icon: string
  color: string
  modules: ParsedModule[]
}

export interface ParseResult {
  success: boolean
  trails: ParsedTrail[]
  warnings: string[]
  errors: string[]
  parseMethod: "ai" | "code" | "hybrid"
  confidenceDetails?: ConfidenceDetails
}

export interface ImportResult {
  success: boolean
  imported: {
    trails: number
    modules: number
    questions: number
  }
  message: string
  warnings?: string[]
}

export type FileFormat =
  | "txt"
  | "md"
  | "json"
  | "xml"
  | "docx"
  | "doc"
  | "yml"
  | "yaml"
  | "kdl"
  | "csv"
  | "rtf"
  | "odt"
  | "pdf"
  | "html"
  | "rst"
  | "tex"
  | "org"
  | "adoc"
  | "unknown"

// Критерии уверенности для детализации
export interface ConfidenceCriterion {
  name: string
  description: string
  score: number
  maxScore: number
  met: boolean
}

export interface ConfidenceDetails {
  totalScore: number
  maxPossibleScore: number
  percentage: number
  criteria: ConfidenceCriterion[]
}

export interface AIParserConfig {
  enabled: boolean
  apiEndpoint?: string
  apiKey?: string
  model?: string
}

// Паттерны для умного определения структуры
export interface ContentPatterns {
  trailMarkers: RegExp[]
  moduleMarkers: RegExp[]
  questionMarkers: RegExp[]
  answerMarkers: RegExp[]
  correctAnswerMarkers: RegExp[]
  contentDelimiters: RegExp[]
  headerPatterns: RegExp[]
}

// Конфигурация по умолчанию
export const DEFAULT_PATTERNS: ContentPatterns = {
  trailMarkers: [
    /^={3,}\s*(TRAIL|ТРЕЙЛ|КУРС|COURSE|ДИСЦИПЛИНА)\s*={3,}$/i,
    /^#{1,2}\s*(Trail|Трейл|Курс|Course|Дисциплина)/i,
    /^\*{3,}\s*(Trail|Трейл|Курс)\s*\*{3,}$/i,
  ],
  moduleMarkers: [
    /^={3,}\s*(MODULE|МОДУЛЬ|УРОК|LESSON|ТЕМА|TOPIC)\s*={3,}$/i,
    /^#{1,3}\s*(Module|Модуль|Урок|Lesson|Тема)/i,
    /^\*{3,}\s*(Module|Модуль|Урок)\s*\*{3,}$/i,
    /^---\s*(Модуль|Module|Урок|Lesson)/i,
  ],
  questionMarkers: [
    /^={3,}\s*(QUESTIONS?|ВОПРОС[ЫА]?|QUIZ|ТЕСТ)\s*={3,}$/i,
    /^#{1,3}\s*(Questions?|Вопрос[ыа]?|Quiz|Тест)/i,
    /^[QВ][:\.]\s*/i,
    /^\d+[\.\)]\s*[QВ][:\.]/i,
    /^Вопрос\s*\d*[:\.]/i,
    /^Question\s*\d*[:\.]/i,
  ],
  answerMarkers: [
    /^[-•●○◦▪▸►]\s*/,
    /^[a-dа-г][\.\)]\s*/i,
    /^\d+[\.\)]\s*(?![QВ]:)/,
    /^\[[ x]\]\s*/i,
  ],
  correctAnswerMarkers: [
    /\s*\*\s*$/,
    /\s*\(correct\)\s*$/i,
    /\s*\(правильн[оы]й?\)\s*$/i,
    /\s*✓\s*$/,
    /\s*✔\s*$/,
    /^\[x\]\s*/i,
  ],
  contentDelimiters: [
    /^-{3,}$/,
    /^_{3,}$/,
    /^={3,}$/,
    /^\*{3,}$/,
  ],
  headerPatterns: [
    /^#{1,6}\s+/,
    /^[А-ЯA-Z][^.!?]*[:：]\s*$/,
  ],
}

// Slug генератор
export function generateSlug(text: string): string {
  const translitMap: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
    з: "z", и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c",
    ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  }

  return text
    .toLowerCase()
    .split("")
    .map((char) => translitMap[char] || char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50)
}

// Определение типа модуля
export function detectModuleType(text: string): "THEORY" | "PRACTICE" | "PROJECT" {
  const lowerText = text.toLowerCase()

  const projectKeywords = ["проект", "project", "создай", "разработай", "построй", "build", "create", "develop"]
  const practiceKeywords = ["тест", "quiz", "практика", "practice", "упражнен", "exercise", "задан", "task"]

  if (projectKeywords.some(k => lowerText.includes(k))) return "PROJECT"
  if (practiceKeywords.some(k => lowerText.includes(k))) return "PRACTICE"
  return "THEORY"
}

// Определение цвета по тематике
export function detectColor(text: string): string {
  const colorMap: Record<string, string> = {
    // Программирование
    code: "#6366f1", coding: "#6366f1", программ: "#6366f1", vibe: "#6366f1",
    // Дизайн
    design: "#ec4899", дизайн: "#ec4899", ui: "#ec4899", ux: "#ec4899",
    // Данные
    data: "#10b981", данн: "#10b981", аналитик: "#10b981", analytics: "#10b981",
    // AI
    ai: "#8b5cf6", ml: "#8b5cf6", нейро: "#8b5cf6", искусствен: "#8b5cf6",
    // Маркетинг
    market: "#f59e0b", маркет: "#f59e0b", продвиж: "#f59e0b",
    // Менеджмент
    manage: "#3b82f6", менедж: "#3b82f6", управлен: "#3b82f6",
  }

  const lowerText = text.toLowerCase()
  for (const [keyword, color] of Object.entries(colorMap)) {
    if (lowerText.includes(keyword)) return color
  }

  return "#6366f1" // default indigo
}

// Извлечение эмодзи иконки
export function detectIcon(text: string): string {
  // Поиск эмодзи в тексте
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
  const emojis = text.match(emojiRegex)
  if (emojis && emojis.length > 0) return emojis[0]

  // Определение по ключевым словам
  const iconMap: Record<string, string> = {
    code: "💻", coding: "💻", программ: "💻", vibe: "💻",
    design: "🎨", дизайн: "🎨", ui: "🎨",
    data: "📊", данн: "📊", аналитик: "📊",
    ai: "🤖", ml: "🤖", нейро: "🧠",
    market: "📈", маркет: "📈",
    web: "🌐", веб: "🌐",
    mobile: "📱", мобил: "📱",
    game: "🎮", игр: "🎮",
    security: "🔒", безопас: "🔒",
    cloud: "☁️", облак: "☁️",
  }

  const lowerText = text.toLowerCase()
  for (const [keyword, icon] of Object.entries(iconMap)) {
    if (lowerText.includes(keyword)) return icon
  }

  return "📚" // default book
}
