// Парсер для TXT формата (стандартный формат системы)

import {
  ParsedTrail,
  ParsedModule,
  ParsedQuestion,
  ParseResult,
  DEFAULT_PATTERNS,
  generateSlug,
  detectRequiresSubmission,
  detectQuestionType,
  parseMatchingOptions,
  parseOrderingOptions,
  parseCaseAnalysisOptions,
} from "../types"
import { analyzeStructure, smartParseUnstructured } from "../smart-detector"

// Парсинг стандартного формата (=== TRAIL ===, === MODULE ===, etc.)
export function parseTxt(text: string): ParseResult {
  const structure = analyzeStructure(text)
  const warnings: string[] = []
  const errors: string[] = []

  // Если структура обнаружена, используем строгий парсинг
  if (structure.hasStructuredFormat && structure.confidence > 50) {
    try {
      const trails = parseStructuredFormat(text, warnings)
      return {
        success: trails.length > 0,
        trails,
        warnings,
        errors,
        parseMethod: "code",
      }
    } catch (e) {
      warnings.push(`Ошибка при строгом парсинге: ${e}. Пробуем умный парсинг.`)
    }
  }

  // Если нет структуры или парсинг не удался - умный парсинг
  try {
    const trails = smartParseUnstructured(text)
    if (trails.length === 0) {
      errors.push("Не удалось извлечь контент из файла")
    }
    return {
      success: trails.length > 0,
      trails,
      warnings: [...warnings, "Использован умный парсинг - проверьте результат"],
      errors,
      parseMethod: "code",
    }
  } catch (e) {
    errors.push(`Ошибка парсинга: ${e}`)
    return {
      success: false,
      trails: [],
      warnings,
      errors,
      parseMethod: "code",
    }
  }
}

// Парсинг структурированного формата
function parseStructuredFormat(text: string, warnings: string[]): ParsedTrail[] {
  const lines = text.split("\n")
  const trails: ParsedTrail[] = []

  let currentTrail: ParsedTrail | null = null
  let currentModule: ParsedModule | null = null
  let currentSection: "trail" | "module" | "questions" | "content" | null = null
  let contentBuffer: string[] = []
  let inContentBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // Section markers
    if (DEFAULT_PATTERNS.trailMarkers.some(p => p.test(trimmedLine))) {
      // Сохранить предыдущий модуль
      if (currentModule && currentTrail) {
        if (inContentBlock) {
          currentModule.content = contentBuffer.join("\n").trim()
        }
        currentTrail.modules.push(currentModule)
      }
      // Сохранить предыдущий trail
      if (currentTrail) {
        trails.push(currentTrail)
      }

      currentTrail = {
        title: "",
        slug: "",
        subtitle: "",
        description: "",
        icon: "📚",
        color: "#6366f1",
        modules: [],
      }
      currentModule = null
      currentSection = "trail"
      inContentBlock = false
      contentBuffer = []
      continue
    }

    if (DEFAULT_PATTERNS.moduleMarkers.some(p => p.test(trimmedLine))) {
      // Сохранить предыдущий модуль
      if (currentModule && currentTrail) {
        if (inContentBlock) {
          currentModule.content = contentBuffer.join("\n").trim()
        }
        currentTrail.modules.push(currentModule)
      }

      currentModule = {
        title: "",
        slug: "",
        type: "THEORY",
        points: 50,
        description: "",
        content: "",
        questions: [],
      }
      currentSection = "module"
      inContentBlock = false
      contentBuffer = []
      continue
    }

    if (/^={3,}\s*(QUESTIONS?|ВОПРОС[ЫА]?)\s*={3,}$/i.test(trimmedLine)) {
      if (inContentBlock && currentModule) {
        currentModule.content = contentBuffer.join("\n").trim()
      }
      currentSection = "questions"
      inContentBlock = false
      contentBuffer = []
      continue
    }

    // Content block start marker (первый --- после метаданных модуля)
    // ВАЖНО: --- внутри контента НЕ закрывает блок - только маркер секции закрывает
    if (trimmedLine === "---" && currentSection === "module" && !inContentBlock) {
      inContentBlock = true
      contentBuffer = []
      continue
    }

    // Inside content block - собираем ВСЁ до следующего маркера секции
    // --- внутри контента сохраняются как часть контента
    if (inContentBlock) {
      contentBuffer.push(line)
      continue
    }

    // Parse key-value pairs
    if (trimmedLine.includes(":") && !trimmedLine.startsWith("Q:") && !trimmedLine.startsWith("В:")) {
      const colonIndex = trimmedLine.indexOf(":")
      const key = trimmedLine.slice(0, colonIndex).trim().toLowerCase()
      const value = trimmedLine.slice(colonIndex + 1).trim()

      if (currentSection === "trail" && currentTrail) {
        switch (key) {
          case "title":
          case "название":
            currentTrail.title = value
            if (!currentTrail.slug) currentTrail.slug = generateSlug(value)
            break
          case "slug":
          case "слаг":
            currentTrail.slug = value
            break
          case "subtitle":
          case "подзаголовок":
            currentTrail.subtitle = value
            break
          case "description":
          case "описание":
            currentTrail.description = value
            break
          case "icon":
          case "иконка":
            currentTrail.icon = value
            break
          case "color":
          case "цвет":
            currentTrail.color = value
            break
        }
      } else if (currentSection === "module" && currentModule) {
        switch (key) {
          case "title":
          case "название":
            currentModule.title = value
            if (!currentModule.slug) currentModule.slug = generateSlug(value)
            break
          case "slug":
          case "слаг":
            currentModule.slug = value
            break
          case "type":
          case "тип":
            const typeMap: Record<string, "THEORY" | "PRACTICE" | "PROJECT"> = {
              lesson: "THEORY",
              theory: "THEORY",
              quiz: "PRACTICE",
              practice: "PRACTICE",
              project: "PROJECT",
              урок: "THEORY",
              теория: "THEORY",
              тест: "PRACTICE",
              практика: "PRACTICE",
              проект: "PROJECT",
            }
            currentModule.type = typeMap[value.toLowerCase()] || "THEORY"
            break
          case "points":
          case "очки":
          case "баллы":
            currentModule.points = parseInt(value) || 50
            break
          case "description":
          case "описание":
            currentModule.description = value
            break
          case "level":
          case "уровень":
            currentModule.level = value
            break
          case "duration":
          case "длительность":
            currentModule.duration = value
            break
          case "requires_submission":
          case "requiressubmission":
          case "требует_сдачу":
          case "требуетсдачу":
            currentModule.requiresSubmission = value.toLowerCase() === "да" ||
              value.toLowerCase() === "yes" ||
              value.toLowerCase() === "true" ||
              value === "1"
            break
        }
      }
      continue
    }

    // Parse questions
    if (currentSection === "questions" && currentModule) {
      if (trimmedLine.startsWith("Q:") || trimmedLine.startsWith("В:")) {
        let questionText = trimmedLine.slice(2).trim()

        // Проверяем маркеры типа вопроса [MATCHING], [ORDERING], [CASE_ANALYSIS]
        let explicitType: "MATCHING" | "ORDERING" | "CASE_ANALYSIS" | null = null
        const typeMarkerMatch = questionText.match(/\s*\[(MATCHING|ORDERING|CASE_ANALYSIS)\]\s*$/i)
        if (typeMarkerMatch) {
          explicitType = typeMarkerMatch[1].toUpperCase() as "MATCHING" | "ORDERING" | "CASE_ANALYSIS"
          questionText = questionText.replace(typeMarkerMatch[0], "").trim()
        }

        // Определяем тип: явный маркер или детекция по ключевым словам
        const questionType = explicitType || detectQuestionType(questionText)

        const newQuestion: ParsedQuestion = {
          question: questionText,
          type: questionType,
          options: [],
          correctAnswer: 0,
        }

        // data будет заполнена позже после сбора всех опций

        currentModule.questions.push(newQuestion)
      } else if (trimmedLine.startsWith("-") || trimmedLine.startsWith("•")) {
        const currentQuestion = currentModule.questions[currentModule.questions.length - 1]
        if (currentQuestion) {
          let optionText = trimmedLine.slice(1).trim()
          const isCorrect = optionText.endsWith("*")
          if (isCorrect) {
            optionText = optionText.slice(0, -1).trim()
            currentQuestion.correctAnswer = currentQuestion.options.length
          }
          // Пропускаем placeholder'ы типа [Термин 1], [Шаг 1], [Вариант]
          if (!optionText.match(/^\[.+\]$/)) {
            currentQuestion.options.push(optionText)
          } else {
            // Если это placeholder, добавляем пустую строку чтобы сохранить порядок
            currentQuestion.options.push("")
          }
        }
      }
    }
  }

  // Save last module and trail
  if (currentModule && currentTrail) {
    if (inContentBlock) {
      currentModule.content = contentBuffer.join("\n").trim()
    }
    currentTrail.modules.push(currentModule)
  }
  if (currentTrail) {
    trails.push(currentTrail)
  }

  // Валидация и установка requiresSubmission
  for (const trail of trails) {
    if (!trail.title) {
      warnings.push(`Trail без названия, использован slug: ${trail.slug}`)
      trail.title = trail.slug || "Без названия"
    }
    if (!trail.slug) {
      trail.slug = generateSlug(trail.title)
    }

    for (const mod of trail.modules) {
      if (!mod.title) {
        warnings.push(`Модуль без названия в trail "${trail.title}"`)
        mod.title = "Без названия"
      }
      if (!mod.slug) {
        mod.slug = generateSlug(mod.title)
      }
      // Установка requiresSubmission на основе типа и содержимого
      if (mod.requiresSubmission === undefined) {
        mod.requiresSubmission = detectRequiresSubmission(
          mod.type,
          mod.title,
          mod.content
        )
      }

      // Заполнение data для MATCHING, ORDERING и CASE_ANALYSIS вопросов из опций
      // ВАЖНО: Для этих типов data создаётся ВСЕГДА, даже если опций нет
      for (const question of mod.questions) {
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
    }
  }

  return trails
}
