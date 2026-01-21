// Парсер для HTML формата
// Извлекает структуру курса из HTML документа

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

// Простой HTML парсер без зависимостей
export function parseHtml(content: string): ParseResult {
  const warnings: string[] = []
  const errors: string[] = []

  try {
    // Удаляем скрипты, стили и комментарии
    const cleanHtml = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")

    // Извлекаем title страницы
    const titleMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const pageTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : ""

    // Извлекаем body или весь контент
    const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const bodyContent = bodyMatch ? bodyMatch[1] : cleanHtml

    // Парсим структуру из HTML
    const trails = parseHtmlStructure(bodyContent, pageTitle, warnings)

    if (trails.length === 0) {
      errors.push("Не удалось извлечь структуру курса из HTML")
    }

    return {
      success: trails.length > 0,
      trails,
      warnings,
      errors,
      parseMethod: "code",
    }
  } catch (e) {
    errors.push(`Ошибка парсинга HTML: ${e instanceof Error ? e.message : String(e)}`)
    return {
      success: false,
      trails: [],
      warnings,
      errors,
      parseMethod: "code",
    }
  }
}

// Парсинг структуры HTML
function parseHtmlStructure(html: string, pageTitle: string, warnings: string[]): ParsedTrail[] {
  const trails: ParsedTrail[] = []

  // Ищем заголовки и структуру
  const headings = extractHeadings(html)

  if (headings.length === 0) {
    // Если нет заголовков, создаём один trail из всего контента
    const textContent = htmlToText(html)
    if (textContent.trim()) {
      const title = pageTitle || "Импортированный HTML"
      trails.push({
        title,
        slug: generateSlug(title),
        subtitle: "",
        description: textContent.substring(0, 200),
        icon: detectIcon(title),
        color: detectColor(title),
        modules: [{
          title: "Основной материал",
          slug: "osnovnoj-material",
          type: "THEORY",
          points: 50,
          description: "",
          content: textContent,
          questions: [],
        }],
      })
    }
    return trails
  }

  // Группируем по H1 (trails) и H2/H3 (modules)
  let currentTrail: ParsedTrail | null = null
  let currentMod: ParsedModule | null = null
  let contentBuffer: string[] = []

  for (const heading of headings) {
    if (heading.level === 1) {
      // Сохраняем предыдущий модуль
      if (currentMod && currentTrail) {
        currentMod.content = contentBuffer.join("\n\n").trim()
        currentTrail.modules.push(currentMod)
        currentMod = null
      }
      // Сохраняем предыдущий trail
      if (currentTrail && currentTrail.modules.length > 0) {
        trails.push(currentTrail)
      } else if (currentTrail && contentBuffer.length > 0) {
        // Если был trail без модулей, создаём модуль из контента
        currentTrail.modules.push({
          title: "Введение",
          slug: "vvedenie",
          type: "THEORY",
          points: 50,
          description: "",
          content: contentBuffer.join("\n\n").trim(),
          questions: [],
        })
        trails.push(currentTrail)
      }

      const title = heading.text
      currentTrail = {
        title,
        slug: generateSlug(title),
        subtitle: "",
        description: "",
        icon: detectIcon(title),
        color: detectColor(title),
        modules: [],
      }
      contentBuffer = []
    } else if (heading.level === 2 || heading.level === 3) {
      // Создаём trail если его нет
      if (!currentTrail) {
        const trailTitle = pageTitle || "Импортированный курс"
        currentTrail = {
          title: trailTitle,
          slug: generateSlug(trailTitle),
          subtitle: "",
          description: "",
          icon: detectIcon(trailTitle),
          color: detectColor(trailTitle),
          modules: [],
        }
      }

      // Сохраняем предыдущий модуль
      if (currentMod) {
        currentMod.content = contentBuffer.join("\n\n").trim()
        currentTrail.modules.push(currentMod)
      }

      const moduleTitle = heading.text
      currentMod = {
        title: moduleTitle,
        slug: generateSlug(moduleTitle),
        type: detectModuleType(moduleTitle),
        points: 50,
        description: "",
        content: "",
        questions: [],
      }
      contentBuffer = []
    }

    // Добавляем контент после заголовка
    if (heading.content) {
      contentBuffer.push(heading.content)
    }
  }

  // Сохраняем последний модуль и trail
  if (currentMod && currentTrail) {
    currentMod.content = contentBuffer.join("\n\n").trim()
    currentTrail.modules.push(currentMod)
  } else if (currentTrail && contentBuffer.length > 0 && currentTrail.modules.length === 0) {
    currentTrail.modules.push({
      title: "Материал",
      slug: "material",
      type: "THEORY",
      points: 50,
      description: "",
      content: contentBuffer.join("\n\n").trim(),
      questions: [],
    })
  }

  if (currentTrail && currentTrail.modules.length > 0) {
    trails.push(currentTrail)
  }

  // Если ничего не нашли через заголовки, создаём из всего контента
  if (trails.length === 0) {
    const textContent = htmlToText(html)
    if (textContent.trim()) {
      const title = pageTitle || "Импортированный HTML"
      trails.push({
        title,
        slug: generateSlug(title),
        subtitle: "",
        description: textContent.substring(0, 200),
        icon: detectIcon(title),
        color: detectColor(title),
        modules: [{
          title: "Основной материал",
          slug: "osnovnoj-material",
          type: "THEORY",
          points: 50,
          description: "",
          content: textContent,
          questions: [],
        }],
      })
    }
  }

  // Извлекаем вопросы из списков
  for (const trail of trails) {
    for (const mod of trail.modules) {
      const { content, questions } = extractQuestionsFromContent(mod.content)
      if (questions.length > 0) {
        mod.content = content
        mod.questions = questions
        mod.type = "PRACTICE"
        mod.points = 75
      }
    }
  }

  return trails
}

// Извлечение заголовков с контентом между ними
interface HeadingWithContent {
  level: number
  text: string
  content: string
}

function extractHeadings(html: string): HeadingWithContent[] {
  const results: HeadingWithContent[] = []

  // Паттерн для заголовков H1-H6
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi
  let match: RegExpExecArray | null

  const matches: Array<{level: number; text: string; start: number; end: number}> = []

  while ((match = headingRegex.exec(html)) !== null) {
    matches.push({
      level: parseInt(match[1]),
      text: htmlToText(match[2]).trim(),
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]

    // Контент между текущим и следующим заголовком
    const contentStart = current.end
    const contentEnd = next ? next.start : html.length
    const contentHtml = html.substring(contentStart, contentEnd)
    const content = htmlToText(contentHtml).trim()

    results.push({
      level: current.level,
      text: current.text,
      content,
    })
  }

  return results
}

// Конвертация HTML в текст (Markdown-подобный)
function htmlToText(html: string): string {
  let text = html

  // Заменяем переносы строк на пробелы временно
  text = text.replace(/\r\n/g, "\n")

  // Параграфы
  text = text.replace(/<p[^>]*>/gi, "\n\n")
  text = text.replace(/<\/p>/gi, "")

  // Заголовки в Markdown стиль (только для вложенных)
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n")
  text = text.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n")
  text = text.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n###### $1\n")

  // Списки
  text = text.replace(/<ul[^>]*>/gi, "\n")
  text = text.replace(/<\/ul>/gi, "\n")
  text = text.replace(/<ol[^>]*>/gi, "\n")
  text = text.replace(/<\/ol>/gi, "\n")
  text = text.replace(/<li[^>]*>/gi, "- ")
  text = text.replace(/<\/li>/gi, "\n")

  // Форматирование
  text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
  text = text.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
  text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
  text = text.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")

  // Блоки кода
  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n```\n$1\n```\n")

  // Ссылки
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")

  // Изображения
  text = text.replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, "![$1]")
  text = text.replace(/<img[^>]*>/gi, "")

  // Переносы строк
  text = text.replace(/<br\s*\/?>/gi, "\n")
  text = text.replace(/<hr\s*\/?>/gi, "\n---\n")

  // Div и span
  text = text.replace(/<div[^>]*>/gi, "\n")
  text = text.replace(/<\/div>/gi, "")
  text = text.replace(/<span[^>]*>/gi, "")
  text = text.replace(/<\/span>/gi, "")

  // Таблицы (упрощённо)
  text = text.replace(/<table[^>]*>/gi, "\n")
  text = text.replace(/<\/table>/gi, "\n")
  text = text.replace(/<tr[^>]*>/gi, "")
  text = text.replace(/<\/tr>/gi, "\n")
  text = text.replace(/<td[^>]*>/gi, " | ")
  text = text.replace(/<\/td>/gi, "")
  text = text.replace(/<th[^>]*>/gi, " | **")
  text = text.replace(/<\/th>/gi, "**")

  // Удаляем оставшиеся теги
  text = text.replace(/<[^>]+>/g, "")

  // Декодируем HTML entities
  text = decodeHtmlEntities(text)

  // Очистка пробелов
  text = text.replace(/[ \t]+/g, " ")
  text = text.replace(/\n{3,}/g, "\n\n")
  text = text.trim()

  return text
}

// Декодирование HTML entities
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": "\"",
    "&apos;": "'",
    "&#39;": "'",
    "&mdash;": "—",
    "&ndash;": "–",
    "&laquo;": "«",
    "&raquo;": "»",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
    "&hellip;": "...",
    "&bull;": "•",
  }

  let result = text
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, "gi"), char)
  }

  // Числовые entities
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))

  return result
}

// Извлечение вопросов из контента (ищем списки с маркерами ответов)
function extractQuestionsFromContent(content: string): { content: string; questions: ParsedQuestion[] } {
  const questions: ParsedQuestion[] = []
  let cleanContent = content

  // Паттерн для вопросов: строка заканчивающаяся на ?
  // за которой следуют варианты ответов (- или a) b) c))
  const questionPattern = /([^\n]+\?)\s*\n((?:[-•a-dа-г][.)\s]+[^\n]+\n?)+)/gi

  const matches = content.matchAll(questionPattern)

  for (const match of matches) {
    const questionText = match[1].trim()
    const optionsBlock = match[2]

    // Извлекаем варианты ответов
    const optionPattern = /[-•a-dа-г][.)\s]+([^\n]+?)(\*|(?:\(правильн|верн|correct))?$/gim
    const options: string[] = []
    let correctAnswer = 0

    const optionMatches = optionsBlock.matchAll(optionPattern)
    let index = 0
    for (const optMatch of optionMatches) {
      let optionText = optMatch[1].trim()
      const isCorrect = optMatch[2] !== undefined

      // Убираем маркер правильного ответа
      optionText = optionText.replace(/\s*\*\s*$/, "").replace(/\s*\((?:правильн|верн|correct)[^)]*\)\s*$/i, "").trim()

      if (optionText) {
        options.push(optionText)
        if (isCorrect) {
          correctAnswer = index
        }
        index++
      }
    }

    if (options.length >= 2) {
      questions.push({
        question: questionText,
        options,
        correctAnswer,
      })
      // Удаляем вопрос из контента
      cleanContent = cleanContent.replace(match[0], "")
    }
  }

  return {
    content: cleanContent.trim(),
    questions,
  }
}
