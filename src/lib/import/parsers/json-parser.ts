// Парсер для JSON формата

import {
  ParsedTrail,
  ParsedModule,
  ParsedQuestion,
  ParseResult,
  generateSlug,
  detectModuleType,
  detectRequiresSubmission,
  detectColor,
  detectIcon,
} from "../types"

interface JsonTrail {
  title?: string
  name?: string
  название?: string
  slug?: string
  subtitle?: string
  подзаголовок?: string
  description?: string
  описание?: string
  icon?: string
  иконка?: string
  color?: string
  цвет?: string
  modules?: JsonModule[]
  модули?: JsonModule[]
  lessons?: JsonModule[]
  уроки?: JsonModule[]
}

interface JsonModule {
  title?: string
  name?: string
  название?: string
  slug?: string
  type?: string
  тип?: string
  points?: number
  очки?: number
  баллы?: number
  description?: string
  описание?: string
  content?: string
  контент?: string
  содержимое?: string
  level?: string
  уровень?: string
  duration?: string
  длительность?: string
  questions?: JsonQuestion[]
  вопросы?: JsonQuestion[]
}

interface JsonQuestion {
  question?: string
  вопрос?: string
  text?: string
  текст?: string
  options?: string[]
  варианты?: string[]
  ответы?: string[]
  answers?: string[]
  correctAnswer?: number
  correct?: number
  правильный?: number
  правильныйОтвет?: number
}

// Парсинг JSON файла
export function parseJson(text: string): ParseResult {
  const warnings: string[] = []
  const errors: string[] = []

  try {
    const data = JSON.parse(text)
    const trails = convertJsonToTrails(data, warnings)

    return {
      success: trails.length > 0,
      trails,
      warnings,
      errors,
      parseMethod: "code",
    }
  } catch (e) {
    errors.push(`Ошибка парсинга JSON: ${e}`)
    return {
      success: false,
      trails: [],
      warnings,
      errors,
      parseMethod: "code",
    }
  }
}

// Конвертация JSON в trails
function convertJsonToTrails(data: unknown, warnings: string[]): ParsedTrail[] {
  const trails: ParsedTrail[] = []

  // Массив trails
  if (Array.isArray(data)) {
    for (const item of data) {
      const trail = convertJsonTrail(item, warnings)
      if (trail) trails.push(trail)
    }
    return trails
  }

  // Проверка что data - объект
  if (typeof data !== "object" || data === null) {
    warnings.push("Не удалось распознать структуру JSON")
    return trails
  }

  const obj = data as Record<string, unknown>

  // Объект с полем trails/courses
  if (obj.trails || obj.courses || obj.курсы || obj.трейлы) {
    const trailsArray = (obj.trails || obj.courses || obj.курсы || obj.трейлы) as JsonTrail[]
    for (const item of trailsArray) {
      const trail = convertJsonTrail(item, warnings)
      if (trail) trails.push(trail)
    }
    return trails
  }

  // Один trail
  if (obj.title || obj.name || obj.название || obj.modules || obj.модули) {
    const trail = convertJsonTrail(obj as JsonTrail, warnings)
    if (trail) trails.push(trail)
    return trails
  }

  // Попытка интерпретировать как модули
  if (obj.lessons || obj.уроки || Array.isArray(obj.content)) {
    warnings.push("JSON интерпретирован как список модулей")
    const modules = convertJsonModules((obj.lessons || obj.уроки || obj.content) as JsonModule[], warnings)

    if (modules.length > 0) {
      trails.push({
        title: String(obj.title || obj.название || "Импортированный курс"),
        slug: String(obj.slug || generateSlug(String(obj.title || "imported"))),
        subtitle: String(obj.subtitle || obj.подзаголовок || ""),
        description: String(obj.description || obj.описание || ""),
        icon: String(obj.icon || obj.иконка || "📚"),
        color: String(obj.color || obj.цвет || "#6366f1"),
        modules,
      })
    }
    return trails
  }

  warnings.push("Не удалось распознать структуру JSON")
  return trails
}

// Конвертация одного trail
function convertJsonTrail(data: JsonTrail, warnings: string[]): ParsedTrail | null {
  const title = data.title || data.name || data.название
  if (!title) {
    warnings.push("Trail без названия пропущен")
    return null
  }

  const trail: ParsedTrail = {
    title,
    slug: data.slug || generateSlug(title),
    subtitle: data.subtitle || data.подзаголовок || "",
    description: data.description || data.описание || "",
    icon: data.icon || data.иконка || detectIcon(title),
    color: data.color || data.цвет || detectColor(title),
    modules: [],
  }

  // Модули
  const modulesData = data.modules || data.модули || data.lessons || data.уроки || []
  trail.modules = convertJsonModules(modulesData, warnings)

  return trail
}

// Конвертация модулей
function convertJsonModules(data: JsonModule[], warnings: string[]): ParsedModule[] {
  const modules: ParsedModule[] = []

  for (const item of data) {
    const mod = convertJsonModule(item, warnings)
    if (mod) modules.push(mod)
  }

  return modules
}

// Конвертация одного модуля
function convertJsonModule(data: JsonModule, warnings: string[]): ParsedModule | null {
  const title = data.title || data.name || data.название
  if (!title) {
    warnings.push("Модуль без названия пропущен")
    return null
  }

  const content = data.content || data.контент || data.содержимое || ""
  const typeStr = data.type || data.тип || ""

  const typeMap: Record<string, "THEORY" | "PRACTICE" | "PROJECT"> = {
    lesson: "THEORY", theory: "THEORY", урок: "THEORY", теория: "THEORY",
    quiz: "PRACTICE", practice: "PRACTICE", тест: "PRACTICE", практика: "PRACTICE",
    project: "PROJECT", проект: "PROJECT",
  }

  const questionsData = data.questions || data.вопросы || []
  const questions = convertJsonQuestions(questionsData, warnings)

  const type = typeMap[typeStr.toLowerCase()] ||
    (questions.length > 0 ? "PRACTICE" : detectModuleType(title, content))

  // Определяем, требуется ли сдача работы
  const requiresSubmission = detectRequiresSubmission(type, title, content)

  return {
    title,
    slug: data.slug || generateSlug(title),
    type,
    points: data.points || data.очки || data.баллы || (type === "PROJECT" ? 100 : type === "PRACTICE" ? 75 : 50),
    description: data.description || data.описание || "",
    content,
    questions,
    level: data.level || data.уровень,
    duration: data.duration || data.длительность,
    requiresSubmission,
  }
}

// Конвертация вопросов
function convertJsonQuestions(data: JsonQuestion[], warnings: string[]): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []

  for (const item of data) {
    const question = item.question || item.вопрос || item.text || item.текст
    if (!question) {
      warnings.push("Вопрос без текста пропущен")
      continue
    }

    const options = item.options || item.варианты || item.ответы || item.answers || []
    if (options.length < 2) {
      warnings.push(`Вопрос "${question.substring(0, 30)}..." имеет менее 2 вариантов`)
    }

    const correctAnswer = item.correctAnswer ?? item.correct ?? item.правильный ?? item.правильныйОтвет ?? 0

    questions.push({
      question,
      options,
      correctAnswer,
    })
  }

  return questions
}
