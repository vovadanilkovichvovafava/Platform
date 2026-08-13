// Умный детектор структуры контента

import {
  ParsedTrail,
  ParsedModule,
  ParsedQuestion,
  ContentPatterns,
  DEFAULT_PATTERNS,
  generateSlug,
  detectModuleType,
  detectRequiresSubmission,
  detectColor,
  detectIcon,
  detectQuestionType,
  parseMatchingOptions,
  parseOrderingOptions,
  parseCaseAnalysisOptions,
  ConfidenceCriterion,
  ConfidenceDetails,
  FileFormat,
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
  confidenceDetails: ConfidenceDetails
}

// Анализ структуры текста
export function analyzeStructure(text: string, patterns: ContentPatterns = DEFAULT_PATTERNS): DetectionResult {
  const lines = text.split("\n")
  const criteria: ConfidenceCriterion[] = []

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

  // Дополнительная проверка на свободный формат
  const freeFormPatterns = detectFreeFormStructure(text)
  moduleCount += freeFormPatterns.modules
  questionCount += freeFormPatterns.questions

  // Расчёт уверенности с детальными критериями
  const trailScore = trailCount > 0 ? 20 : 0
  criteria.push({
    name: "Маркеры курса/трейла",
    description: `Найдено ${trailCount} маркеров курса (=== TRAIL ===, # Course и т.д.)`,
    score: trailScore,
    maxScore: 20,
    met: trailCount > 0,
  })

  const moduleScore = moduleCount > 0 ? Math.min(25, moduleCount * 5) : 0
  criteria.push({
    name: "Структура модулей",
    description: `Найдено ${moduleCount} модулей/уроков (заголовки, нумерованные разделы)`,
    score: moduleScore,
    maxScore: 25,
    met: moduleCount > 0,
  })

  const questionScore = questionCount > 0 ? Math.min(20, questionCount * 4) : 0
  criteria.push({
    name: "Вопросы и тесты",
    description: `Найдено ${questionCount} вопросов с вариантами ответов`,
    score: questionScore,
    maxScore: 20,
    met: questionCount > 0,
  })

  const structuredScore = Math.min(20, structuredElements * 5)
  criteria.push({
    name: "Структурированные элементы",
    description: `${structuredElements} элементов со стандартными маркерами (===, ---, ### и др.)`,
    score: structuredScore,
    maxScore: 20,
    met: structuredElements > 0,
  })

  const freeFormScore = Math.min(15, freeFormPatterns.confidence)
  criteria.push({
    name: "Свободный формат",
    description: "Распознавание структуры без явных маркеров (нумерация, заголовки)",
    score: freeFormScore,
    maxScore: 15,
    met: freeFormPatterns.confidence > 0,
  })

  const totalScore = trailScore + moduleScore + questionScore + structuredScore + freeFormScore
  const maxPossibleScore = 100
  const confidence = Math.min(100, totalScore)

  // Расчёт уверенности
  const hasStructuredFormat = structuredElements > 0 || freeFormPatterns.modules > 0

  const confidenceDetails: ConfidenceDetails = {
    totalScore,
    maxPossibleScore,
    percentage: confidence,
    criteria,
  }

  return {
    hasStructuredFormat,
    hasTrailMarkers: trailCount > 0,
    hasModuleMarkers: moduleCount > 0,
    hasQuestionMarkers: questionCount > 0,
    detectedTrails: Math.max(trailCount, 1),
    detectedModules: moduleCount,
    detectedQuestions: questionCount,
    confidence,
    confidenceDetails,
  }
}

// Определение свободной структуры
function detectFreeFormStructure(text: string): { modules: number; questions: number; confidence: number } {
  let modules = 0
  let questions = 0
  let confidence = 0

  // Паттерны для модулей в свободной форме
  const modulePatterns = [
    /модуль\s*(первый|второй|третий|четвёртый|пятый|\d+|один|два|три)/i,
    /урок\s*(первый|второй|третий|четвёртый|пятый|\d+|один|два|три|№\s*\d+)/i,
    /занятие\s*(первое|второе|третье|четвёртое|пятое|\d+)/i,
    /глава\s*(первая|вторая|третья|\d+)/i,
    /тема\s*(первая|вторая|третья|\d+)/i,
    /часть\s*(первая|вторая|третья|\d+)/i,
    /раздел\s*(первый|второй|третий|\d+)/i,
    /приложение\s*[A-ZА-Яа-я]/i,
    // Теоретический материал / Теоретические материалы
    /теоретическ(?:ий|ие)\s+материал(?:ы)?/i,
  ]

  // Паттерны для inline вопросов
  const inlineQuestionPatterns = [
    /вопрос[:\s]+.+\s+\d+[\.:\s)]/i,
    /\?\s*\d+[\.:\s)]/,
  ]

  for (const pattern of modulePatterns) {
    const matches = text.match(new RegExp(pattern, "gi"))
    if (matches) {
      modules += matches.length
      confidence += 10
    }
  }

  for (const pattern of inlineQuestionPatterns) {
    const matches = text.match(new RegExp(pattern, "gi"))
    if (matches) {
      questions += matches.length
      confidence += 5
    }
  }

  return { modules, questions, confidence }
}

// Умный парсинг неструктурированного текста
export function smartParseUnstructured(text: string): ParsedTrail[] {
  const lines = text.split("\n")
  const trails: ParsedTrail[] = []

  // Сначала попробуем найти inline вопросы и преобразовать их
  const processedText = preprocessInlineQuestions(text)
  const processedLines = processedText.split("\n")

  let trailTitle = ""
  let trailSubtitle = ""
  let modules: ParsedModule[] = []
  let currentModuleTitle = ""
  let currentModuleContent: string[] = []
  let currentQuestions: ParsedQuestion[] = []
  let inQuestionSection = false
  let currentQuestion: ParsedQuestion | null = null
  let lineIndex = 0

  for (let i = 0; i < processedLines.length; i++) {
    const line = processedLines[i]
    const trimmed = line.trim()
    lineIndex++

    // Пропуск пустых строк
    if (!trimmed) {
      if (currentModuleContent.length > 0) {
        currentModuleContent.push("")
      }
      continue
    }

    // Определение заголовка trail (первая значимая строка)
    if (!trailTitle) {
      const extracted = extractTrailTitle(trimmed, i, processedLines)
      if (extracted) {
        trailTitle = extracted
        continue
      }
    }

    // Определение подзаголовка
    const subtitleMatch = extractSubtitle(trimmed, trailTitle, trailSubtitle, i)
    if (subtitleMatch) {
      trailSubtitle = subtitleMatch
      continue
    }

    // Определение заголовков модулей
    const moduleTitle = extractModuleTitle(trimmed)
    if (moduleTitle) {
      // Сохранить предыдущий модуль
      if (currentModuleTitle) {
        if (currentQuestion && currentQuestion.options.length > 0) {
          currentQuestions.push(currentQuestion)
          currentQuestion = null
        }
        modules.push(createModule(currentModuleTitle, currentModuleContent, currentQuestions))
        currentQuestions = []
      }

      currentModuleTitle = moduleTitle
      currentModuleContent = []
      inQuestionSection = false
      continue
    }

    // Определение вопроса
    const questionData = extractQuestion(trimmed)
    if (questionData) {
      // Сохранить предыдущий вопрос
      if (currentQuestion && currentQuestion.options.length > 0) {
        currentQuestions.push(currentQuestion)
      }
      currentQuestion = questionData
      inQuestionSection = true
      continue
    }

    // Парсинг ответов
    if (currentQuestion) {
      const answer = extractAnswer(trimmed)
      if (answer) {
        if (answer.isCorrect) {
          currentQuestion.correctAnswer = currentQuestion.options.length
        }
        currentQuestion.options.push(answer.text)
        continue
      }
    }

    // Обычный контент
    if (!inQuestionSection || !currentQuestion) {
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
  } else if (currentModuleContent.length > 0) {
    // Если нет явных модулей, создать один из всего контента
    modules.push(createModule(trailTitle || "Основной материал", currentModuleContent, currentQuestions))
  }

  // Если нет модулей но есть вопросы, создать модуль
  if (modules.length === 0 && currentQuestions.length > 0) {
    modules.push(createModule("Тест", [], currentQuestions))
  }

  // Создать trail
  if (trailTitle || modules.length > 0) {
    if (!trailTitle) {
      trailTitle = modules[0]?.title || "Импортированный курс"
    }

    trails.push({
      title: trailTitle,
      slug: generateSlug(trailTitle),
      subtitle: trailSubtitle || `Курс: ${trailTitle}`,
      description: trailSubtitle || modules[0]?.description || "",
      icon: detectIcon(trailTitle),
      color: detectColor(trailTitle),
      modules,
    })
  }

  return trails
}

// Предобработка inline вопросов
// "Вопрос Как скачать 1 с сайта 2 с гитхаба 3 отовсюду" -> нормальный формат
function preprocessInlineQuestions(text: string): string {
  // Паттерн для inline вопросов с нумерованными ответами
  // "Вопрос XXX 1 ответ1 2 ответ2 3 ответ3"
  const inlineQuestionRegex = /(?:вопрос|question)[:\s]*(.+?)\s+(\d)\s+(.+?)\s+(\d)\s+(.+?)(?:\s+(\d)\s+(.+?))?(?:\s+(\d)\s+(.+?))?$/gim

  let result = text

  // Заменяем inline вопросы на структурированный формат
  result = result.replace(inlineQuestionRegex, (match, question, n1, a1, n2, a2, n3, a3, n4, a4) => {
    let formatted = `\nВ: ${question.trim()}\n`
    formatted += `- ${a1.trim()}\n`
    formatted += `- ${a2.trim()}\n`
    if (a3) formatted += `- ${a3.trim()}\n`
    if (a4) formatted += `- ${a4.trim()}\n`
    return formatted
  })

  // Ещё один паттерн: "1 ответ 2 ответ 3 ответ" на отдельных строках или подряд
  // после слова "вопрос"
  const questionBlockRegex = /(?:вопрос|question)[:\s]*([^\n\d]+?)[\s\n]+1[\.:\s)]+([^\n\d]+?)[\s\n]+2[\.:\s)]+([^\n\d]+?)(?:[\s\n]+3[\.:\s)]+([^\n\d]+?))?(?:[\s\n]+4[\.:\s)]+([^\n\d]+?))?/gi

  result = result.replace(questionBlockRegex, (match, question, a1, a2, a3, a4) => {
    let formatted = `\nВ: ${question.trim()}\n`
    formatted += `- ${a1.trim()}\n`
    formatted += `- ${a2.trim()}\n`
    if (a3) formatted += `- ${a3.trim()}\n`
    if (a4) formatted += `- ${a4.trim()}\n`
    return formatted
  })

  return result
}

// Извлечение заголовка trail
function extractTrailTitle(line: string, index: number, allLines: string[]): string | null {
  // Markdown заголовок H1
  if (line.startsWith("# ")) {
    return line.replace(/^#+\s*/, "").trim()
  }

  // Явные ключевые слова
  const trailKeywords = /^(?:курс|course|trail|трейл|дисциплина|предмет)[:\s]+(.+)$/i
  const match = line.match(trailKeywords)
  if (match) {
    return match[1].trim()
  }

  // Первая строка если она короткая и не является модулем/вопросом
  if (index < 3 && line.length > 3 && line.length < 100) {
    const isNotModule = !isModuleLine(line)
    const isNotQuestion = !isQuestionLine(line)
    const isNotMeta = !/^(подзаголовок|subtitle|описание|description)[:\s]/i.test(line)

    if (isNotModule && isNotQuestion && isNotMeta) {
      return line.trim()
    }
  }

  return null
}

// Извлечение подзаголовка
function extractSubtitle(line: string, trailTitle: string, currentSubtitle: string, index: number): string | null {
  if (!trailTitle || currentSubtitle) return null

  // Явное указание подзаголовка
  const explicitMatch = line.match(/^(?:подзаголовок|subtitle)[:\s]+(.+)$/i)
  if (explicitMatch) {
    return explicitMatch[1].trim()
  }

  // Строка после заголовка, если она подходящего размера
  if (index < 10 && line.length > 5 && line.length < 200) {
    const isNotModule = !isModuleLine(line)
    const isNotQuestion = !isQuestionLine(line)
    const isNotHeader = !line.startsWith("#")
    const isNotList = !line.startsWith("-") && !line.startsWith("*") && !line.startsWith("•")

    if (isNotModule && isNotQuestion && isNotHeader && isNotList) {
      return line.trim()
    }
  }

  return null
}

// Проверка - является ли строка модулем
function isModuleLine(line: string): boolean {
  const modulePatterns = [
    /^#{2,3}\s+/,
    /^(?:модуль|module|урок|lesson|глава|chapter|тема|topic|часть|раздел|занятие|class|session|приложение|appendix)\s*(?:первый|второй|третий|четвёртый|пятый|шестой|первое|второе|третье|четвёртое|пятое|\d+|один|два|три|четыре|пять|№\s*\d+|[A-ZА-Яа-я])?[:\s—\-]/i,
    /^\d+[\.\)]\s+[A-ZА-ЯЁ]/,
    // Теоретический материал / Теоретические материалы
    /^(?:теоретическ(?:ий|ие)\s+материал(?:ы)?|theoretical\s+materials?)[:\s—\-]*/i,
  ]
  return modulePatterns.some(p => p.test(line))
}

// Проверка - является ли строка вопросом
function isQuestionLine(line: string): boolean {
  const questionPatterns = [
    /^[QВ][:.\s]/i,
    /^(?:вопрос|question)\s*\d*[:.\s]/i,
    /\?\s*$/,
  ]
  return questionPatterns.some(p => p.test(line))
}

// Извлечение заголовка модуля
function extractModuleTitle(line: string): string | null {
  // H2/H3 Markdown
  const headerMatch = line.match(/^#{2,3}\s+(.+)$/)
  if (headerMatch) {
    return headerMatch[1].trim()
  }

  // "Модуль первый: Название" или "Модуль 1: Название" или "Занятие 1 — Название"
  const modulePatterns = [
    /^(?:модуль|module)\s*(?:первый|второй|третий|четвёртый|пятый|шестой|\d+|один|два|три|четыре|пять)[:\s]+(.+)$/i,
    /^(?:модуль|module)\s*(?:первый|второй|третий|четвёртый|пятый|шестой|\d+|один|два|три|четыре|пять)$/i,
    /^(?:урок|lesson)\s*(?:первый|второй|третий|четвёртый|пятый|шестой|\d+|один|два|три|четыре|пять|№\s*\d+)[:\s—\-]*(.*)$/i,
    /^(?:занятие|class|session)\s*(?:первое|второе|третье|четвёртое|пятое|\d+)[:\s—\-]+(.+)$/i,
    /^(?:занятие|class|session)\s*(?:первое|второе|третье|четвёртое|пятое|\d+)$/i,
    /^(?:глава|chapter)\s*(?:первая|вторая|третья|четвёртая|пятая|\d+)[:\s—\-]*(.*)$/i,
    /^(?:тема|topic)\s*(?:первая|вторая|третья|четвёртая|пятая|\d+)[:\s—\-]*(.*)$/i,
    /^(?:часть|part)\s*(?:первая|вторая|третья|четвёртая|пятая|\d+)[:\s—\-]*(.*)$/i,
    /^(?:раздел|section)\s*(?:первый|второй|третий|четвёртый|пятый|\d+)[:\s—\-]*(.*)$/i,
    // Приложение A, Приложение B и т.д.
    /^(?:приложение|appendix)\s*[A-ZА-Яа-я][:\s—\-]+(.+)$/i,
    /^(?:приложение|appendix)\s*[A-ZА-Яа-я]$/i,
    // Теоретический материал / Теоретические материалы
    /^(?:теоретическ(?:ий|ие)\s+материал(?:ы)?|theoretical\s+materials?)[:\s—\-]+(.+)$/i,
    /^(?:теоретическ(?:ий|ие)\s+материал(?:ы)?|theoretical\s+materials?)$/i,
  ]

  for (const pattern of modulePatterns) {
    const match = line.match(pattern)
    if (match) {
      // Если есть название после двоеточия - вернуть его
      if (match[1] && match[1].trim()) {
        return match[1].trim()
      }
      // Иначе вернуть всю строку как название
      return line.trim()
    }
  }

  // Нумерованный список с заглавной буквы (1. Введение)
  const numberedMatch = line.match(/^\d+[\.\)]\s+([A-ZА-ЯЁ].{3,})$/)
  if (numberedMatch) {
    return numberedMatch[1].trim()
  }

  return null
}

// Извлечение вопроса
function extractQuestion(line: string): ParsedQuestion | null {
  // Стандартные форматы
  const patterns = [
    /^[QВ][:.\s]\s*(.+)$/i,
    /^(?:вопрос|question)\s*\d*[:.\s]\s*(.+)$/i,
    /^(?:вопрос|question)\s+(.+\?)$/i,
  ]

  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match) {
      let questionText = match[1].trim()

      // Проверяем маркеры типа вопроса [MATCHING], [ORDERING], [CASE_ANALYSIS]
      let explicitType: "MATCHING" | "ORDERING" | "CASE_ANALYSIS" | null = null
      const typeMarkerMatch = questionText.match(/\s*\[(MATCHING|ORDERING|CASE_ANALYSIS)\]\s*$/i)
      if (typeMarkerMatch) {
        explicitType = typeMarkerMatch[1].toUpperCase() as "MATCHING" | "ORDERING" | "CASE_ANALYSIS"
        questionText = questionText.replace(typeMarkerMatch[0], "").trim()
      }

      // Определяем тип: явный маркер или детекция по ключевым словам
      const questionType = explicitType || detectQuestionType(questionText)

      const question: ParsedQuestion = {
        question: questionText,
        type: questionType,
        options: [],
        correctAnswer: 0,
      }

      // data будет заполнена позже после сбора всех опций

      return question
    }
  }

  // Строка заканчивающаяся на ? (но не слишком короткая)
  if (line.endsWith("?") && line.length > 10 && !line.startsWith("-") && !line.startsWith("•")) {
    let questionText = line.trim()

    // Проверяем маркеры типа вопроса [MATCHING], [ORDERING], [CASE_ANALYSIS]
    let explicitType: "MATCHING" | "ORDERING" | "CASE_ANALYSIS" | null = null
    const typeMarkerMatch = questionText.match(/\s*\[(MATCHING|ORDERING|CASE_ANALYSIS)\]\s*$/i)
    if (typeMarkerMatch) {
      explicitType = typeMarkerMatch[1].toUpperCase() as "MATCHING" | "ORDERING" | "CASE_ANALYSIS"
      questionText = questionText.replace(typeMarkerMatch[0], "").trim()
    }

    const questionType = explicitType || detectQuestionType(questionText)

    const question: ParsedQuestion = {
      question: questionText,
      type: questionType,
      options: [],
      correctAnswer: 0,
    }

    // data будет заполнена позже после сбора всех опций

    return question
  }

  return null
}

// Извлечение ответа
function extractAnswer(line: string): { text: string; isCorrect: boolean } | null {
  // Паттерны для ответов
  const answerPatterns = [
    /^[-•●○◦▪▸►]\s*(.+)$/,
    /^[a-dа-г][\.\)]\s*(.+)$/i,
    /^\d+[\.\)]\s*(.+)$/,
    /^\[([x\s])\]\s*(.+)$/i, // checkbox формат
  ]

  for (const pattern of answerPatterns) {
    const match = line.match(pattern)
    if (match) {
      let text = match[match.length - 1] || match[1]
      let isCorrect = false

      // Checkbox отмечен
      if (match[1] && match[1].toLowerCase() === "x") {
        isCorrect = true
        text = match[2]
      }

      // Маркеры правильного ответа
      const correctMarkers = [
        { pattern: /\s*\*\s*$/, replace: /\s*\*\s*$/ },
        { pattern: /\s*\(correct\)\s*$/i, replace: /\s*\(correct\)\s*$/i },
        { pattern: /\s*\(правильн[оы]й?\)\s*$/i, replace: /\s*\(правильн[оы]й?\)\s*$/i },
        { pattern: /\s*\(верн[оы]й?\)\s*$/i, replace: /\s*\(верн[оы]й?\)\s*$/i },
        { pattern: /\s*[✓✔]\s*$/, replace: /\s*[✓✔]\s*$/ },
        { pattern: /\s*\+\s*$/, replace: /\s*\+\s*$/ },
      ]

      for (const marker of correctMarkers) {
        if (marker.pattern.test(text)) {
          isCorrect = true
          text = text.replace(marker.replace, "").trim()
          break
        }
      }

      return { text: text.trim(), isCorrect }
    }
  }

  return null
}

// Создание модуля
function createModule(
  title: string,
  contentLines: string[],
  questions: ParsedQuestion[]
): ParsedModule {
  const content = contentLines.join("\n").trim()

  // Очистка заголовка от маркеров (нужна для detectModuleType)
  const cleanTitle = title
    .replace(/^\d+[\.\)]\s*/, "")
    .replace(/^(?:модуль|module|урок|lesson|глава|chapter|тема|topic)\s*(?:первый|второй|третий|четвёртый|пятый|шестой|\d+|один|два|три|четыре|пять|№\s*\d+)?[:\s]*/i, "")
    .trim() || title.trim()

  // Определяем тип модуля на основе заголовка и содержимого
  // Если есть вопросы - это PRACTICE (тест), иначе анализируем содержимое
  const type = questions.length > 0 ? "PRACTICE" : detectModuleType(cleanTitle, content)

  // Определяем, требуется ли сдача работы
  const requiresSubmission = detectRequiresSubmission(type, cleanTitle, content)

  // Заполнение data для MATCHING, ORDERING и CASE_ANALYSIS вопросов из опций
  // ВАЖНО: Для этих типов data создаётся ВСЕГДА, даже если опций нет
  for (const question of questions) {
    if (question.type === "MATCHING") {
      // Фильтруем пустые опции
      const nonEmptyOptions = question.options.filter(opt => opt.trim() !== "")
      question.data = parseMatchingOptions(nonEmptyOptions)
    } else if (question.type === "ORDERING") {
      // Фильтруем пустые опции
      const nonEmptyOptions = question.options.filter(opt => opt.trim() !== "")
      question.data = parseOrderingOptions(nonEmptyOptions)
    } else if (question.type === "CASE_ANALYSIS") {
      // Фильтруем пустые опции
      const nonEmptyOptions = question.options.filter(opt => opt.trim() !== "")
      question.data = parseCaseAnalysisOptions(nonEmptyOptions, question.question)
    }
  }

  return {
    title: cleanTitle,
    slug: generateSlug(cleanTitle),
    type,
    points: type === "PROJECT" ? 100 : type === "PRACTICE" ? 75 : 50,
    description: extractDescription(content),
    content,
    questions,
    level: type === "PROJECT" ? "Middle" : "Beginner",
    duration: type === "PROJECT" ? "1-2 дня" : "20 мин",
    requiresSubmission,
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
export function detectFileFormat(filename: string, content: string): FileFormat {
  const ext = filename.split(".").pop()?.toLowerCase()

  // Форматы по расширению
  const formatMap: Record<string, FileFormat> = {
    json: "json",
    xml: "xml",
    docx: "docx",
    doc: "doc",
    md: "md",
    markdown: "md",
    txt: "txt",
    yml: "yml",
    yaml: "yaml",
    kdl: "kdl",
    csv: "csv",
    rtf: "rtf",
    odt: "odt",
    pdf: "pdf",
    html: "html",
    htm: "html",
    rst: "rst",
    tex: "tex",
    org: "org",
    adoc: "adoc",
    asciidoc: "adoc",
  }

  if (ext && formatMap[ext]) {
    // Для JSON проверяем валидность
    if (ext === "json") {
      try {
        JSON.parse(content)
        return "json"
      } catch {
        return "txt" // Невалидный JSON - обрабатываем как текст
      }
    }
    return formatMap[ext]
  }

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

  // YAML признаки
  if (/^---\s*$/m.test(content) && /^[\w-]+:\s/m.test(content)) {
    return "yml"
  }

  // HTML признаки
  if (content.includes("<!DOCTYPE") || content.includes("<html") || /<[a-z]+[^>]*>/i.test(content)) {
    return "html"
  }

  // Markdown признаки
  if (content.includes("```") || /^#{1,6}\s+/m.test(content)) {
    return "md"
  }

  // reStructuredText признаки
  if (/^={3,}$/m.test(content) && /^-{3,}$/m.test(content)) {
    return "rst"
  }

  // LaTeX признаки
  if (content.includes("\\documentclass") || content.includes("\\begin{")) {
    return "tex"
  }

  // Org-mode признаки
  if (/^\*{1,3}\s+/m.test(content) && content.includes("#+")) {
    return "org"
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
