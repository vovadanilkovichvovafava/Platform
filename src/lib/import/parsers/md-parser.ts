// Парсер для Markdown формата

import {
  ParsedTrail,
  ParsedModule,
  ParsedQuestion,
  ParseResult,
  generateSlug,
  detectModuleType,
  detectColor,
  detectIcon,
} from "../types"

interface MarkdownSection {
  level: number
  title: string
  content: string[]
  children: MarkdownSection[]
}

// Парсинг Markdown файла
export function parseMd(text: string): ParseResult {
  const warnings: string[] = []
  const errors: string[] = []

  try {
    const sections = parseMarkdownStructure(text)
    const trails = convertSectionsToTrails(sections, warnings)

    return {
      success: trails.length > 0,
      trails,
      warnings,
      errors,
      parseMethod: "code",
    }
  } catch (e) {
    errors.push(`Ошибка парсинга Markdown: ${e}`)
    return {
      success: false,
      trails: [],
      warnings,
      errors,
      parseMethod: "code",
    }
  }
}

// Парсинг структуры Markdown
function parseMarkdownStructure(text: string): MarkdownSection[] {
  const lines = text.split("\n")
  const rootSections: MarkdownSection[] = []
  const stack: MarkdownSection[] = []

  let currentContent: string[] = []

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)

    if (headerMatch) {
      const level = headerMatch[1].length
      const title = headerMatch[2].trim()

      // Сохранить накопленный контент
      if (stack.length > 0) {
        stack[stack.length - 1].content.push(...currentContent)
      }
      currentContent = []

      const section: MarkdownSection = {
        level,
        title,
        content: [],
        children: [],
      }

      // Найти родителя
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop()
      }

      if (stack.length === 0) {
        rootSections.push(section)
      } else {
        stack[stack.length - 1].children.push(section)
      }

      stack.push(section)
    } else {
      currentContent.push(line)
    }
  }

  // Сохранить последний контент
  if (stack.length > 0) {
    stack[stack.length - 1].content.push(...currentContent)
  }

  return rootSections
}

// Конвертация секций в trails
function convertSectionsToTrails(sections: MarkdownSection[], warnings: string[]): ParsedTrail[] {
  const trails: ParsedTrail[] = []

  for (const section of sections) {
    // H1 = Trail
    if (section.level === 1) {
      const trail = createTrailFromSection(section, warnings)
      trails.push(trail)
    } else {
      // Если нет H1, создать trail из всех секций
      warnings.push("Нет заголовка H1 - создан trail из первой секции")
      const trail: ParsedTrail = {
        title: section.title,
        slug: generateSlug(section.title),
        subtitle: extractSubtitle(section.content),
        description: extractDescription(section.content),
        icon: detectIcon(section.title),
        color: detectColor(section.title),
        modules: [],
      }

      // Сам раздел как модуль
      if (section.content.length > 0 || section.children.length === 0) {
        const module = createModuleFromSection(section, warnings)
        trail.modules.push(module)
      }

      // Дочерние как модули
      for (const child of section.children) {
        const module = createModuleFromSection(child, warnings)
        trail.modules.push(module)
      }

      trails.push(trail)
    }
  }

  // Если ничего не создано, создать один trail из всего контента
  if (trails.length === 0 && sections.length > 0) {
    const allContent = sections.map(s => `# ${s.title}\n${s.content.join("\n")}`).join("\n\n")
    warnings.push("Структура не распознана - создан один модуль из всего контента")

    trails.push({
      title: "Импортированный курс",
      slug: "imported-course",
      subtitle: "",
      description: "",
      icon: "📚",
      color: "#6366f1",
      modules: [{
        title: "Контент",
        slug: "content",
        type: "THEORY",
        points: 50,
        description: "",
        content: allContent,
        questions: [],
      }],
    })
  }

  return trails
}

// Создание trail из секции
function createTrailFromSection(section: MarkdownSection, warnings: string[]): ParsedTrail {
  const trail: ParsedTrail = {
    title: section.title,
    slug: generateSlug(section.title),
    subtitle: extractSubtitle(section.content),
    description: extractDescription(section.content),
    icon: detectIcon(section.title),
    color: detectColor(section.title),
    modules: [],
  }

  // Парсинг метаданных из контента
  const metadata = extractMetadata(section.content)
  if (metadata.subtitle) trail.subtitle = metadata.subtitle
  if (metadata.description) trail.description = metadata.description
  if (metadata.icon) trail.icon = metadata.icon
  if (metadata.color) trail.color = metadata.color

  // H2/H3 = Modules
  for (const child of section.children) {
    const module = createModuleFromSection(child, warnings)
    trail.modules.push(module)

    // H3/H4 внутри модуля - добавить к контенту
    for (const subchild of child.children) {
      module.content += `\n\n## ${subchild.title}\n${subchild.content.join("\n")}`

      // Проверка на секцию вопросов
      if (/вопрос|question|quiz|тест/i.test(subchild.title)) {
        const questions = parseQuestionsFromContent(subchild.content.join("\n"))
        module.questions.push(...questions)
      }
    }
  }

  // Если нет дочерних, создать модуль из основного контента
  if (trail.modules.length === 0 && section.content.length > 0) {
    warnings.push(`Trail "${section.title}" не имеет подразделов - создан один модуль`)
    trail.modules.push({
      title: "Введение",
      slug: generateSlug(section.title + "-intro"),
      type: "THEORY",
      points: 50,
      description: extractDescription(section.content),
      content: section.content.join("\n"),
      questions: [],
    })
  }

  return trail
}

// Создание модуля из секции
function createModuleFromSection(section: MarkdownSection, warnings: string[]): ParsedModule {
  const content = section.content.join("\n").trim()
  const type = detectModuleType(section.title + " " + content)

  // Парсинг вопросов из контента
  const questions = parseQuestionsFromContent(content)

  // Удаление вопросов из контента
  let cleanContent = content
  if (questions.length > 0) {
    // Удаляем секцию вопросов
    cleanContent = content
      .replace(/#{1,4}\s*(вопрос[ыа]?|questions?|quiz|тест)[^\n]*\n[\s\S]*$/i, "")
      .trim()
  }

  const metadata = extractMetadata(section.content)

  return {
    title: section.title.replace(/^\d+[\.\)]\s*/, ""),
    slug: metadata.slug || generateSlug(section.title),
    type: metadata.type || (questions.length > 0 ? "PRACTICE" : type),
    points: metadata.points || (type === "PROJECT" ? 100 : 50),
    description: metadata.description || extractDescription(section.content),
    content: cleanContent,
    questions,
    level: metadata.level,
    duration: metadata.duration,
  }
}

// Извлечение метаданных из контента (YAML frontmatter или комментарии)
function extractMetadata(content: string[]): Record<string, any> {
  const metadata: Record<string, any> = {}
  const text = content.join("\n")

  // YAML frontmatter
  const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---/)
  if (frontmatterMatch) {
    const yaml = frontmatterMatch[1]
    const lines = yaml.split("\n")
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/)
      if (match) {
        const key = match[1].toLowerCase()
        let value: any = match[2].trim()

        // Убрать кавычки
        value = value.replace(/^["']|["']$/g, "")

        // Числовые значения
        if (/^\d+$/.test(value)) {
          value = parseInt(value)
        }

        // Маппинг типов
        if (key === "type" || key === "тип") {
          const typeMap: Record<string, "THEORY" | "PRACTICE" | "PROJECT"> = {
            lesson: "THEORY", theory: "THEORY", урок: "THEORY", теория: "THEORY",
            quiz: "PRACTICE", practice: "PRACTICE", тест: "PRACTICE", практика: "PRACTICE",
            project: "PROJECT", проект: "PROJECT",
          }
          value = typeMap[value.toLowerCase()] || "THEORY"
        }

        metadata[key] = value
      }
    }
  }

  // HTML комментарии с метаданными
  const commentMatch = text.match(/<!--\s*([\s\S]*?)\s*-->/)
  if (commentMatch) {
    const comment = commentMatch[1]
    const lines = comment.split("\n")
    for (const line of lines) {
      const match = line.match(/(\w+):\s*(.+)/)
      if (match) {
        metadata[match[1].toLowerCase()] = match[2].trim()
      }
    }
  }

  return metadata
}

// Парсинг вопросов из контента
function parseQuestionsFromContent(content: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []
  const lines = content.split("\n")

  let currentQuestion: ParsedQuestion | null = null
  let inQuestionSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Начало секции вопросов
    if (/^#{1,4}\s*(вопрос[ыа]?|questions?|quiz|тест)/i.test(trimmed)) {
      inQuestionSection = true
      continue
    }

    if (!inQuestionSection) continue

    // Новый вопрос
    const questionMatch = trimmed.match(/^(?:[QВ][:.]|\d+[\.\)]\s*|(?:вопрос|question)\s*\d*[:.])\s*(.+)/i)
    if (questionMatch) {
      if (currentQuestion && currentQuestion.options.length > 0) {
        questions.push(currentQuestion)
      }
      currentQuestion = {
        question: questionMatch[1].trim(),
        options: [],
        correctAnswer: 0,
      }
      continue
    }

    // Ответ
    const answerMatch = trimmed.match(/^(?:[-•●○]\s*|\[[ x]\]\s*|[a-dа-г][\.\)]\s*)(.+)/i)
    if (answerMatch && currentQuestion) {
      let answerText = answerMatch[1].trim()

      // Проверка на правильный ответ
      const isCorrect = /\s*\*\s*$/.test(answerText) ||
        /\[x\]/i.test(trimmed) ||
        /\(correct\)/i.test(answerText) ||
        /\(правильн/i.test(answerText)

      if (isCorrect) {
        answerText = answerText
          .replace(/\s*\*\s*$/, "")
          .replace(/\s*\(correct\)\s*/i, "")
          .replace(/\s*\(правильн[оы]й?\)\s*/i, "")
          .trim()
        currentQuestion.correctAnswer = currentQuestion.options.length
      }

      currentQuestion.options.push(answerText)
    }
  }

  // Последний вопрос
  if (currentQuestion && currentQuestion.options.length > 0) {
    questions.push(currentQuestion)
  }

  return questions
}

// Извлечение подзаголовка
function extractSubtitle(content: string[]): string {
  const text = content.join("\n")
  // Первая строка после заголовка, если она короткая
  const firstLine = content.find(l => l.trim() && !l.startsWith("#") && !l.startsWith("-"))
  if (firstLine && firstLine.length < 150) {
    return firstLine.trim()
  }
  return ""
}

// Извлечение описания
function extractDescription(content: string[]): string {
  const text = content.join("\n")
  // Первый абзац текста
  const paragraphs = text.split(/\n\n+/)
  const firstParagraph = paragraphs.find(p =>
    p.trim() && !p.startsWith("#") && !p.startsWith("-") && !p.startsWith("*")
  )
  if (firstParagraph) {
    return firstParagraph.trim().substring(0, 200)
  }
  return ""
}
