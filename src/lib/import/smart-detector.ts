// Умный детектор структуры контента

import {
  ParsedTrail,
  ParsedModule,
  ParsedQuestion,
  ContentPatterns,
  DEFAULT_PATTERNS,
  generateSlug,
  detectModuleType,
  detectColor,
  detectIcon,
} from "./types"

interface DetectionResult {
  hasStructuredFormat: boolean
  hasTrailMarkers: boolean
  hasModuleMarkers: boolean
  hasQuestionMarkers: boolean
  detectedTrails: number
  detectedModules: number
  detectedQuestions: number
  confidence: number // 0-100
}

// Анализ структуры текста
export function analyzeStructure(text: string, patterns: ContentPatterns = DEFAULT_PATTERNS): DetectionResult {
  const lines = text.split("\n")

  let trailCount = 0
  let moduleCount = 0
  let questionCount = 0
  let structuredElements = 0

  for (const line of lines) {
    const trimmed = line.trim()

    // Проверка на маркеры trail
    if (patterns.trailMarkers.some(p => p.test(trimmed))) {
      trailCount++
      structuredElements++
    }

    // Проверка на маркеры module
    if (patterns.moduleMarkers.some(p => p.test(trimmed))) {
      moduleCount++
      structuredElements++
    }

    // Проверка на маркеры вопросов
    if (patterns.questionMarkers.some(p => p.test(trimmed))) {
      questionCount++
      structuredElements++
    }
  }

  // Расчёт уверенности
  const hasStructuredFormat = structuredElements > 0
  const confidence = Math.min(100, structuredElements * 15 + (trailCount > 0 ? 20 : 0) + (moduleCount > 0 ? 15 : 0))

  return {
    hasStructuredFormat,
    hasTrailMarkers: trailCount > 0,
    hasModuleMarkers: moduleCount > 0,
    hasQuestionMarkers: questionCount > 0,
    detectedTrails: trailCount,
    detectedModules: moduleCount,
    detectedQuestions: questionCount,
    confidence,
  }
}

// Умный парсинг неструктурированного текста
export function smartParseUnstructured(text: string): ParsedTrail[] {
  const lines = text.split("\n")
  const trails: ParsedTrail[] = []
  const warnings: string[] = []

  // Поиск возможных заголовков (первый h1 или первая строка с заглавными буквами)
  let trailTitle = ""
  let trailSubtitle = ""
  let currentContent: string[] = []
  let modules: ParsedModule[] = []
  let currentModuleTitle = ""
  let currentModuleContent: string[] = []
  let currentQuestions: ParsedQuestion[] = []
  let inQuestionSection = false
  let currentQuestion: ParsedQuestion | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Пропуск пустых строк
    if (!trimmed) {
      if (currentModuleContent.length > 0) {
        currentModuleContent.push("")
      }
      continue
    }

    // Определение заголовка trail (h1 или первая строка)
    if (!trailTitle && (trimmed.startsWith("# ") || (i < 5 && trimmed.length > 3 && trimmed.length < 100))) {
      trailTitle = trimmed.replace(/^#+\s*/, "")
      continue
    }

    // Определение подзаголовка (строка сразу после заголовка)
    if (trailTitle && !trailSubtitle && i < 10 && trimmed.length > 5 && trimmed.length < 200) {
      const isSubtitle = !trimmed.startsWith("#") && !trimmed.startsWith("-") && !trimmed.startsWith("*")
      if (isSubtitle) {
        trailSubtitle = trimmed
        continue
      }
    }

    // Определение заголовков модулей (h2, h3 или паттерны)
    const isModuleHeader = /^#{2,3}\s+/.test(trimmed) ||
      /^(Модуль|Module|Урок|Lesson|Глава|Chapter|Тема|Topic)\s*\d*[:.\s]/i.test(trimmed) ||
      /^\d+[\.\)]\s+[A-ZА-ЯЁ]/.test(trimmed)

    if (isModuleHeader) {
      // Сохранить предыдущий модуль
      if (currentModuleTitle) {
        modules.push(createModule(currentModuleTitle, currentModuleContent, currentQuestions))
        currentQuestions = []
      }

      currentModuleTitle = trimmed.replace(/^#{2,3}\s*/, "").replace(/^\d+[\.\)]\s*/, "")
      currentModuleContent = []
      inQuestionSection = false
      continue
    }

    // Определение секции вопросов
    const isQuestionSection = /^(вопрос[ыа]?|questions?|quiz|тест)/i.test(trimmed)
    if (isQuestionSection) {
      inQuestionSection = true
      continue
    }

    // Парсинг вопросов
    const isQuestion = /^[QВ][:.\s]/i.test(trimmed) ||
      /^Вопрос\s*\d*[:.\s]/i.test(trimmed) ||
      /^\d+[\.\)]\s*.+\?$/.test(trimmed)

    if (isQuestion || inQuestionSection) {
      if (isQuestion) {
        // Сохранить предыдущий вопрос
        if (currentQuestion && currentQuestion.options.length > 0) {
          currentQuestions.push(currentQuestion)
        }

        const questionText = trimmed
          .replace(/^[QВ][:.\s]/i, "")
          .replace(/^Вопрос\s*\d*[:.\s]/i, "")
          .replace(/^\d+[\.\)]\s*/, "")
          .trim()

        currentQuestion = {
          question: questionText,
          options: [],
          correctAnswer: 0,
        }
        continue
      }

      // Парсинг ответов
      const isAnswer = /^[-•●○◦▪▸►]\s*/.test(trimmed) ||
        /^[a-dа-г][\.\)]\s*/i.test(trimmed)

      if (isAnswer && currentQuestion) {
        let answerText = trimmed
          .replace(/^[-•●○◦▪▸►]\s*/, "")
          .replace(/^[a-dа-г][\.\)]\s*/i, "")
          .trim()

        // Проверка на правильный ответ
        const isCorrect = /\s*\*\s*$/.test(answerText) ||
          /\(correct\)/i.test(answerText) ||
          /\(правильн/i.test(answerText) ||
          /[✓✔]/.test(answerText)

        if (isCorrect) {
          answerText = answerText
            .replace(/\s*\*\s*$/, "")
            .replace(/\s*\(correct\)\s*/i, "")
            .replace(/\s*\(правильн[оы]й?\)\s*/i, "")
            .replace(/\s*[✓✔]\s*/, "")
            .trim()
          currentQuestion.correctAnswer = currentQuestion.options.length
        }

        currentQuestion.options.push(answerText)
        continue
      }
    }

    // Обычный контент
    if (!inQuestionSection) {
      currentModuleContent.push(line)
    }
  }

  // Сохранить последний вопрос
  if (currentQuestion && currentQuestion.options.length > 0) {
    currentQuestions.push(currentQuestion)
  }

  // Сохранить последний модуль
  if (currentModuleTitle) {
    modules.push(createModule(currentModuleTitle, currentModuleContent, currentQuestions))
  } else if (currentModuleContent.length > 0 || currentContent.length > 0) {
    // Если нет явных модулей, создать один из всего контента
    const content = [...currentContent, ...currentModuleContent]
    modules.push(createModule(trailTitle || "Введение", content, currentQuestions))
  }

  // Создать trail если есть контент
  if (trailTitle || modules.length > 0) {
    if (!trailTitle) {
      trailTitle = modules[0]?.title || "Импортированный курс"
    }

    trails.push({
      title: trailTitle,
      slug: generateSlug(trailTitle),
      subtitle: trailSubtitle || `Курс по теме: ${trailTitle}`,
      description: trailSubtitle || modules[0]?.description || "",
      icon: detectIcon(trailTitle),
      color: detectColor(trailTitle),
      modules,
    })
  }

  return trails
}

// Создание модуля
function createModule(
  title: string,
  contentLines: string[],
  questions: ParsedQuestion[]
): ParsedModule {
  const content = contentLines.join("\n").trim()
  const type = questions.length > 0 ? "PRACTICE" : detectModuleType(title + " " + content)

  return {
    title: title.replace(/^\d+[\.\)]\s*/, "").trim(),
    slug: generateSlug(title),
    type,
    points: type === "PROJECT" ? 100 : type === "PRACTICE" ? 75 : 50,
    description: extractDescription(content),
    content,
    questions,
    level: type === "PROJECT" ? "Middle" : "Beginner",
    duration: type === "PROJECT" ? "1-2 дня" : "20 мин",
  }
}

// Извлечение описания из контента
function extractDescription(content: string): string {
  const lines = content.split("\n").filter(l => l.trim())
  const firstParagraph = lines.find(l => !l.startsWith("#") && l.length > 20)
  if (firstParagraph) {
    return firstParagraph.substring(0, 200).trim()
  }
  return ""
}

// Определение формата файла по расширению и содержимому
export function detectFileFormat(filename: string, content: string): "txt" | "md" | "json" | "xml" | "docx" | "unknown" {
  const ext = filename.split(".").pop()?.toLowerCase()

  if (ext === "json") {
    try {
      JSON.parse(content)
      return "json"
    } catch {
      return "txt"
    }
  }

  if (ext === "xml") return "xml"
  if (ext === "docx") return "docx"
  if (ext === "md" || ext === "markdown") return "md"
  if (ext === "txt") return "txt"

  // Автоопределение по содержимому
  if (content.trim().startsWith("{") || content.trim().startsWith("[")) {
    try {
      JSON.parse(content)
      return "json"
    } catch {
      // not JSON
    }
  }

  if (content.includes("<?xml") || content.includes("<trail>") || content.includes("<module>")) {
    return "xml"
  }

  // Markdown признаки
  if (content.includes("```") || /^#{1,6}\s+/m.test(content)) {
    return "md"
  }

  return "txt"
}

// Извлечение пар ключ-значение из текста
export function extractKeyValuePairs(text: string): Record<string, string> {
  const pairs: Record<string, string> = {}
  const lines = text.split("\n")

  for (const line of lines) {
    const match = line.match(/^([а-яёa-z_]+)\s*[:=]\s*(.+)$/i)
    if (match) {
      const key = match[1].toLowerCase().trim()
      const value = match[2].trim()
      pairs[key] = value
    }
  }

  return pairs
}

// Нормализация ключей (русские -> английские)
export function normalizeKey(key: string): string {
  const keyMap: Record<string, string> = {
    название: "title",
    заголовок: "title",
    слаг: "slug",
    подзаголовок: "subtitle",
    описание: "description",
    иконка: "icon",
    цвет: "color",
    тип: "type",
    очки: "points",
    баллы: "points",
    уровень: "level",
    длительность: "duration",
    время: "duration",
    контент: "content",
    содержимое: "content",
    вопрос: "question",
    ответ: "answer",
    правильный: "correct",
  }

  return keyMap[key.toLowerCase()] || key.toLowerCase()
}
