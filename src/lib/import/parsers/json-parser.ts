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
    // Формируем понятное сообщение об ошибке JSON
    let errorMsg = "Невалидный JSON"
    if (e instanceof SyntaxError) {
      const match = e.message.match(/position (\d+)/)
      if (match) {
        const pos = parseInt(match[1])
        const lines = text.substring(0, pos).split("\n")
        const line = lines.length
        const col = lines[lines.length - 1].length + 1
        errorMsg = `Синтаксическая ошибка JSON на строке ${line}, колонка ${col}`
      } else {
        errorMsg = `Синтаксическая ошибка JSON: ${e.message}`
      }
    }
    errors.push(errorMsg)
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
function convertJsonToTrails(data: any, warnings: string[]): ParsedTrail[] {
  const trails: ParsedTrail[] = []

  // Массив trails
  if (Array.isArray(data)) {
    for (const item of data) {
      const trail = convertJsonTrail(item, warnings)
      if (trail) trails.push(trail)
    }
    return trails
  }

  // Объект с полем trails/courses
  if (data.trails || data.courses || data.курсы || data.трейлы) {
    const trailsArray = data.trails || data.courses || data.курсы || data.трейлы
    for (const item of trailsArray) {
      const trail = convertJsonTrail(item, warnings)
      if (trail) trails.push(trail)
    }
    return trails
  }

  // Один trail
  if (data.title || data.name || data.название || data.modules || data.модули) {
    const trail = convertJsonTrail(data, warnings)
    if (trail) trails.push(trail)
    return trails
  }

  // Попытка интерпретировать как модули
  if (data.lessons || data.уроки || Array.isArray(data.content)) {
    warnings.push("JSON интерпретирован как список модулей")
    const modules = convertJsonModules(data.lessons || data.уроки || data.content, warnings)

    if (modules.length > 0) {
      trails.push({
        title: data.title || data.название || "Импортированный курс",
        slug: data.slug || generateSlug(data.title || "imported"),
        subtitle: data.subtitle || data.подзаголовок || "",
        description: data.description || data.описание || "",
        icon: data.icon || data.иконка || "📚",
        color: data.color || data.цвет || "#6366f1",
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
    const module = convertJsonModule(item, warnings)
    if (module) modules.push(module)
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
