// Типы для системы импорта

export type QuestionType = "SINGLE_CHOICE" | "MATCHING" | "ORDERING" | "CASE_ANALYSIS"

export interface MatchingData {
  leftLabel: string
  rightLabel: string
  leftItems: { id: string; text: string }[]
  rightItems: { id: string; text: string }[]
  correctPairs: Record<string, string>
}

export interface OrderingData {
  items: { id: string; text: string }[]
  correctOrder: string[]
}

export interface CaseAnalysisData {
  caseContent: string
  caseLabel: string
  options: { id: string; text: string; isCorrect: boolean; explanation: string }[]
  minCorrectRequired: number
}

export interface ParsedQuestion {
  question: string
  type?: QuestionType
  options: string[]
  correctAnswer: number
  data?: MatchingData | OrderingData | CaseAnalysisData | null
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
  requiresSubmission?: boolean // Требуется ли сдача работы (загрузка файлов)
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
    // Теоретический материал / Теоретические материалы
    /^#{1,3}\s*(?:теоретическ(?:ий|ие)\s+материал(?:ы)?|theoretical\s+materials?)/i,
    /^(?:теоретическ(?:ий|ие)\s+материал(?:ы)?|theoretical\s+materials?)[:\s—\-]*/i,
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
export function detectModuleType(title: string, content: string = ""): "THEORY" | "PRACTICE" | "PROJECT" {
  const lowerTitle = title.toLowerCase()
  const lowerContent = content.toLowerCase()
  const fullText = lowerTitle + " " + lowerContent

  // PROJECT - создание чего-то большого
  const projectKeywords = ["проект", "project", "создай", "разработай", "построй", "build", "create", "develop"]
  if (projectKeywords.some(k => lowerTitle.includes(k))) return "PROJECT"

  // PRACTICE - занятия с домашкой, уроки с практикой
  const practiceKeywords = [
    // Явные маркеры практики
    "тест", "quiz", "практика", "practice", "упражнен", "exercise", "задан", "task",
    // Занятия и уроки обычно практические
    "занятие", "lesson", "урок",
    // Лабораторные и семинары
    "лаборатор", "семинар", "workshop", "воркшоп",
  ]

  // Проверяем заголовок на практические ключевые слова
  if (practiceKeywords.some(k => lowerTitle.includes(k))) {
    return "PRACTICE"
  }

  // Проверяем содержимое на наличие домашки/практических заданий
  const homeworkMarkers = [
    "домашка", "домашнее задание", "homework", "задание на дом",
    "что делаем:", "практика на уроке:", "на уроке:",
    "сделай", "выполни", "реализуй", "implement",
  ]
  if (homeworkMarkers.some(k => lowerContent.includes(k))) {
    return "PRACTICE"
  }

  // THEORY - теоретические материалы, справочники, приложения
  const theoryKeywords = [
    "шаблон", "чеклист", "template", "checklist",
    "приложение", "appendix", "справочник", "reference",
    "контакт", "contact", "введение", "introduction",
    "обзор", "overview", "теория", "theory",
  ]
  if (theoryKeywords.some(k => lowerTitle.includes(k))) {
    return "THEORY"
  }

  // По умолчанию - теория
  return "THEORY"
}

// Определение, требуется ли сдача работы для модуля
export function detectRequiresSubmission(
  type: "THEORY" | "PRACTICE" | "PROJECT",
  title: string,
  content: string = ""
): boolean {
  // PROJECT всегда требует сдачу
  if (type === "PROJECT") return true

  // THEORY никогда не требует сдачу
  if (type === "THEORY") return false

  // PRACTICE - анализируем содержимое
  const lowerTitle = title.toLowerCase()
  const lowerContent = content.toLowerCase()

  // Явные маркеры домашки/практики требующей сдачи
  const submissionMarkers = [
    "домашка", "домашнее задание", "homework",
    "сдать", "загрузить", "прикрепить", "submit", "upload",
    "сделай", "собери", "реализуй", "создай",
    "практика на уроке", "что делаем",
    "выполни задание", "задание:",
  ]

  // Проверяем наличие маркеров сдачи в контенте
  if (submissionMarkers.some(m => lowerContent.includes(m))) {
    return true
  }

  // Занятия/уроки по умолчанию требуют сдачу если это PRACTICE
  const lessonPatterns = ["занятие", "lesson", "урок", "workshop", "воркшоп", "лаборатор", "семинар"]
  if (lessonPatterns.some(p => lowerTitle.includes(p))) {
    return true
  }

  // Маркеры которые НЕ требуют сдачи (только тесты/квизы)
  const noSubmissionMarkers = ["тест", "quiz", "викторина", "опрос"]
  if (noSubmissionMarkers.some(m => lowerTitle.includes(m)) &&
      !submissionMarkers.some(m => lowerContent.includes(m))) {
    return false
  }

  // По умолчанию для PRACTICE - требуется сдача
  return true
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

// Определение типа вопроса по тексту
export function detectQuestionType(questionText: string): QuestionType {
  const lowerText = questionText.toLowerCase()

  // MATCHING - сопоставление
  const matchingKeywords = [
    "сопоставь", "сопоставьте", "соотнес", "соотнеси", "соотнесите",
    "соедин", "соединить", "свяж", "связать",
    "match", "matching", "pair", "connect",
    "с их определениями", "с их описаниями", "с их характеристиками",
  ]
  if (matchingKeywords.some(k => lowerText.includes(k))) {
    return "MATCHING"
  }

  // ORDERING - порядок/последовательность
  const orderingKeywords = [
    "расположи", "расположите", "упорядочь", "упорядочьте",
    "порядок", "последовательность", "правильном порядке",
    "расставь", "расставьте", "выстрой", "выстройте",
    "выставьте правильный порядок",
    "order", "arrange", "sequence", "sort",
    "от первого к последнему", "от начала до конца",
  ]
  if (orderingKeywords.some(k => lowerText.includes(k))) {
    return "ORDERING"
  }

  // CASE_ANALYSIS - анализ кейса/ситуации
  const caseAnalysisKeywords = [
    "найдите ошибки", "найди ошибки", "найдите ошибку",
    "проанализируйте", "проанализируй",
    "анализ кейса", "анализ ситуации",
    "оцените ситуацию", "оцени ситуацию",
    "что неправильно", "что не так",
    "выберите правильные решения", "выбери правильные решения",
    "аудит", "найдите проблемы", "найди проблемы",
    "case analysis", "analyze", "find errors", "what's wrong",
  ]
  if (caseAnalysisKeywords.some(k => lowerText.includes(k))) {
    return "CASE_ANALYSIS"
  }

  return "SINGLE_CHOICE"
}

// Парсинг опций для MATCHING вопроса
// Формат опции: "термин -> определение" или "термин | определение" или "термин : определение"
// ВАЖНО: Поддерживает случай когда несколько терминов указывают на одно определение
// Пример: "CTR -> AI", "CPC -> AI", "ROI -> Разработчик" - будет 3 left и 2 уникальных right
export function parseMatchingOptions(options: string[]): MatchingData {
  const leftItems: { id: string; text: string }[] = []
  const correctPairs: Record<string, string> = {}

  // Карта уникальных правых элементов: text -> id
  const rightItemsMap: Map<string, string> = new Map()
  let rightCounter = 1

  // Пробуем разные разделители
  const separators = [" -> ", " → ", " | ", " : ", " - "]

  for (let i = 0; i < options.length; i++) {
    const option = options[i]
    let left = ""
    let right = ""
    let found = false

    for (const sep of separators) {
      const parts = option.split(sep)
      if (parts.length === 2) {
        left = parts[0].trim()
        right = parts[1].trim()
        found = true
        break
      }
    }

    if (found && left && right) {
      const leftId = `l${i + 1}`
      leftItems.push({ id: leftId, text: left })

      // Проверяем, есть ли уже такой правый элемент
      let rightId = rightItemsMap.get(right)
      if (!rightId) {
        rightId = `r${rightCounter++}`
        rightItemsMap.set(right, rightId)
      }

      correctPairs[leftId] = rightId
    }
  }

  // Конвертируем Map в массив rightItems
  const rightItems: { id: string; text: string }[] = []
  for (const [text, id] of rightItemsMap) {
    rightItems.push({ id, text })
  }

  // Если не удалось распарсить - создаем пустой шаблон
  if (leftItems.length === 0) {
    return {
      leftLabel: "Термин",
      rightLabel: "Определение",
      leftItems: [
        { id: "l1", text: "" },
        { id: "l2", text: "" },
        { id: "l3", text: "" },
      ],
      rightItems: [
        { id: "r1", text: "" },
        { id: "r2", text: "" },
        { id: "r3", text: "" },
      ],
      correctPairs: { l1: "r1", l2: "r2", l3: "r3" },
    }
  }

  return {
    leftLabel: "Термин",
    rightLabel: "Определение",
    leftItems,
    rightItems,
    correctPairs,
  }
}

// Генерация данных для MATCHING вопроса (совместимость)
export function generateMatchingData(questionText: string): MatchingData {
  return {
    leftLabel: "Термин",
    rightLabel: "Определение",
    leftItems: [
      { id: "l1", text: "" },
      { id: "l2", text: "" },
      { id: "l3", text: "" },
    ],
    rightItems: [
      { id: "r1", text: "" },
      { id: "r2", text: "" },
      { id: "r3", text: "" },
    ],
    correctPairs: { l1: "r1", l2: "r2", l3: "r3" },
  }
}

// Парсинг опций для ORDERING вопроса
// Формат: текст элемента (порядок определяется порядком в файле)
export function parseOrderingOptions(options: string[]): OrderingData {
  const items: { id: string; text: string }[] = []
  const correctOrder: string[] = []

  for (let i = 0; i < options.length; i++) {
    const text = options[i].trim()
    if (text) {
      const id = `s${i + 1}`
      items.push({ id, text })
      correctOrder.push(id)
    }
  }

  // Если не удалось распарсить - создаем пустой шаблон
  if (items.length === 0) {
    return {
      items: [
        { id: "s1", text: "" },
        { id: "s2", text: "" },
        { id: "s3", text: "" },
        { id: "s4", text: "" },
      ],
      correctOrder: ["s1", "s2", "s3", "s4"],
    }
  }

  return { items, correctOrder }
}

// Генерация данных для ORDERING вопроса (совместимость)
export function generateOrderingData(questionText: string): OrderingData {
  return {
    items: [
      { id: "s1", text: "" },
      { id: "s2", text: "" },
      { id: "s3", text: "" },
      { id: "s4", text: "" },
    ],
    correctOrder: ["s1", "s2", "s3", "s4"],
  }
}

// Парсинг опций для CASE_ANALYSIS вопроса
// Формат: текст варианта, с * для правильных ответов
// Может содержать несколько правильных ответов
export function parseCaseAnalysisOptions(options: string[], questionText: string = ""): CaseAnalysisData {
  const parsedOptions: { id: string; text: string; isCorrect: boolean; explanation: string }[] = []

  for (let i = 0; i < options.length; i++) {
    let text = options[i].trim()
    let isCorrect = false

    // Проверяем маркер правильного ответа
    if (text.endsWith("*")) {
      isCorrect = true
      text = text.slice(0, -1).trim()
    }

    if (text) {
      parsedOptions.push({
        id: `o${i + 1}`,
        text,
        isCorrect,
        explanation: "",
      })
    }
  }

  // Если не удалось распарсить - создаем пустой шаблон
  if (parsedOptions.length === 0) {
    return {
      caseContent: "",
      caseLabel: "Кейс для анализа",
      options: [
        { id: "o1", text: "", isCorrect: false, explanation: "" },
        { id: "o2", text: "", isCorrect: false, explanation: "" },
        { id: "o3", text: "", isCorrect: false, explanation: "" },
      ],
      minCorrectRequired: 1,
    }
  }

  // Считаем количество правильных ответов
  const correctCount = parsedOptions.filter(o => o.isCorrect).length

  return {
    caseContent: "",
    caseLabel: "Кейс для анализа",
    options: parsedOptions,
    minCorrectRequired: Math.max(1, correctCount),
  }
}
