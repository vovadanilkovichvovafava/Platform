// Парсер для DOCX формата (Office Open XML)
// DOCX - это ZIP архив с XML файлами внутри

import * as zlib from "zlib"
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

// Парсинг DOCX из ArrayBuffer
export async function parseDocx(buffer: ArrayBuffer): Promise<ParseResult> {
  const warnings: string[] = []
  const errors: string[] = []

  try {
    const uint8 = new Uint8Array(buffer)

    // Проверяем сигнатуру ZIP (PK\x03\x04)
    if (uint8[0] !== 0x50 || uint8[1] !== 0x4B) {
      errors.push("Файл не является валидным DOCX (неверная сигнатура ZIP)")
      return { success: false, trails: [], warnings, errors, parseMethod: "code" }
    }

    // Извлекаем document.xml из ZIP
    const documentXml = await extractDocumentXml(uint8)

    if (!documentXml) {
      errors.push("Не найден document.xml внутри DOCX")
      return { success: false, trails: [], warnings, errors, parseMethod: "code" }
    }

    // Парсим XML
    const trails = parseDocxXml(documentXml, warnings)

    if (trails.length === 0) {
      errors.push("Не удалось извлечь структуру курса из DOCX")
    }

    return {
      success: trails.length > 0,
      trails,
      warnings,
      errors,
      parseMethod: "code",
    }
  } catch (e) {
    errors.push(`Ошибка парсинга DOCX: ${e instanceof Error ? e.message : String(e)}`)
    return { success: false, trails: [], warnings, errors, parseMethod: "code" }
  }
}

// Парсинг DOCX из текстового контента (fallback для старого API)
export function parseDocxFromText(content: string): ParseResult {
  const warnings: string[] = []
  const errors: string[] = []

  // Если контент начинается с PK - это бинарные данные, нужен ArrayBuffer
  if (content.startsWith("PK")) {
    warnings.push("DOCX файл загружен как текст, рекомендуется использовать бинарный режим")

    // Пытаемся найти XML внутри (иногда работает для небольших файлов)
    const xmlMatch = content.match(/<w:document[\s\S]*<\/w:document>/i)
    if (xmlMatch) {
      const trails = parseDocxXml(xmlMatch[0], warnings)
      return {
        success: trails.length > 0,
        trails,
        warnings,
        errors,
        parseMethod: "code",
      }
    }

    errors.push("Не удалось извлечь контент из DOCX. Файл должен быть загружен в бинарном режиме.")
    return { success: false, trails: [], warnings, errors, parseMethod: "code" }
  }

  // Если это уже XML контент
  if (content.includes("<w:document") || content.includes("<w:p>")) {
    const trails = parseDocxXml(content, warnings)
    return {
      success: trails.length > 0,
      trails,
      warnings,
      errors,
      parseMethod: "code",
    }
  }

  // Если это просто текст - обрабатываем как текст
  errors.push("Контент не является валидным DOCX форматом")
  return { success: false, trails: [], warnings, errors, parseMethod: "code" }
}

// Извлечение document.xml из ZIP (упрощённая реализация)
async function extractDocumentXml(zipData: Uint8Array): Promise<string | null> {
  try {
    // Простой парсер ZIP для извлечения одного файла
    // ZIP структура: [local file header][file data][...][central directory]

    let offset = 0
    const files: Map<string, Uint8Array> = new Map()

    while (offset < zipData.length - 4) {
      // Проверяем сигнатуру local file header (PK\x03\x04)
      if (zipData[offset] !== 0x50 || zipData[offset + 1] !== 0x4B) {
        break
      }

      const signature = (zipData[offset + 3] << 8) | zipData[offset + 2]

      if (signature === 0x0403) {
        // Local file header
        const compressionMethod = zipData[offset + 8] | (zipData[offset + 9] << 8)
        const compressedSize = zipData[offset + 18] | (zipData[offset + 19] << 8) |
          (zipData[offset + 20] << 16) | (zipData[offset + 21] << 24)
        const uncompressedSize = zipData[offset + 22] | (zipData[offset + 23] << 8) |
          (zipData[offset + 24] << 16) | (zipData[offset + 25] << 24)
        const fileNameLength = zipData[offset + 26] | (zipData[offset + 27] << 8)
        const extraFieldLength = zipData[offset + 28] | (zipData[offset + 29] << 8)

        const fileNameStart = offset + 30
        const fileNameBytes = zipData.slice(fileNameStart, fileNameStart + fileNameLength)
        const fileName = new TextDecoder().decode(fileNameBytes)

        const dataStart = fileNameStart + fileNameLength + extraFieldLength
        const compressedData = zipData.slice(dataStart, dataStart + compressedSize)

        // Декомпрессия
        let fileData: Uint8Array

        if (compressionMethod === 0) {
          // Без сжатия
          fileData = compressedData
        } else if (compressionMethod === 8) {
          // Deflate
          try {
            const decompressed = zlib.inflateRawSync(Buffer.from(compressedData))
            fileData = new Uint8Array(decompressed)
          } catch {
            // Если не удалось разжать, пропускаем файл
            offset = dataStart + compressedSize
            continue
          }
        } else {
          // Неподдерживаемый метод сжатия
          offset = dataStart + compressedSize
          continue
        }

        files.set(fileName, fileData)
        offset = dataStart + compressedSize
      } else if (signature === 0x0201 || signature === 0x0605 || signature === 0x0606) {
        // Central directory или End of central directory - конец файлов
        break
      } else {
        offset++
      }
    }

    // Ищем word/document.xml
    const documentXmlData = files.get("word/document.xml")
    if (documentXmlData) {
      return new TextDecoder("utf-8").decode(documentXmlData)
    }

    return null
  } catch (e) {
    console.error("Error extracting document.xml:", e)
    return null
  }
}

// Парсинг DOCX XML (OOXML формат)
function parseDocxXml(xml: string, warnings: string[]): ParsedTrail[] {
  const trails: ParsedTrail[] = []

  // Извлекаем параграфы
  const paragraphs = extractParagraphs(xml)

  if (paragraphs.length === 0) {
    return trails
  }

  // Анализируем структуру по стилям
  let currentTrail: ParsedTrail | null = null
  let currentMod: ParsedModule | null = null
  let contentBuffer: string[] = []
  let trailTitle = ""

  for (const para of paragraphs) {
    const text = para.text.trim()
    if (!text) continue

    // Определяем уровень заголовка
    const isHeading1 = para.style?.includes("Heading1") ||
      para.style?.includes("1") ||
      para.outlineLevel === 0
    const isHeading2 = para.style?.includes("Heading2") ||
      para.style?.includes("2") ||
      para.outlineLevel === 1
    const isHeading3 = para.style?.includes("Heading3") ||
      para.style?.includes("3") ||
      para.outlineLevel === 2

    if (isHeading1) {
      // Сохраняем предыдущий модуль
      if (currentMod && currentTrail) {
        currentMod.content = contentBuffer.join("\n\n").trim()
        currentTrail.modules.push(currentMod)
        currentMod = null
      }
      // Сохраняем предыдущий trail
      if (currentTrail && currentTrail.modules.length > 0) {
        trails.push(currentTrail)
      }

      trailTitle = text
      currentTrail = {
        title: text,
        slug: generateSlug(text),
        subtitle: "",
        description: "",
        icon: detectIcon(text),
        color: detectColor(text),
        modules: [],
      }
      contentBuffer = []
    } else if (isHeading2 || isHeading3) {
      // Создаём trail если его нет
      if (!currentTrail) {
        const defaultTitle = trailTitle || "Импортированный курс"
        currentTrail = {
          title: defaultTitle,
          slug: generateSlug(defaultTitle),
          subtitle: "",
          description: "",
          icon: detectIcon(defaultTitle),
          color: detectColor(defaultTitle),
          modules: [],
        }
      }

      // Сохраняем предыдущий модуль
      if (currentMod) {
        currentMod.content = contentBuffer.join("\n\n").trim()
        currentTrail.modules.push(currentMod)
      }

      currentMod = {
        title: text,
        slug: generateSlug(text),
        type: detectModuleType(text),
        points: 50,
        description: "",
        content: "",
        questions: [],
      }
      contentBuffer = []
    } else {
      // Обычный текст
      let formattedText = text

      // Добавляем форматирование
      if (para.isBold) formattedText = `**${formattedText}**`
      if (para.isItalic) formattedText = `*${formattedText}*`
      if (para.isList) formattedText = `- ${formattedText}`

      contentBuffer.push(formattedText)

      // Если это первый параграф и нет trail - это может быть заголовок
      if (!currentTrail && !trailTitle && contentBuffer.length === 1) {
        trailTitle = text
      }
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

  // Если ничего не нашли, создаём один trail из всего контента
  if (trails.length === 0 && paragraphs.length > 0) {
    const allText = paragraphs.map(p => p.text).join("\n\n")
    const title = trailTitle || paragraphs[0]?.text || "Импортированный документ"

    trails.push({
      title,
      slug: generateSlug(title),
      subtitle: "",
      description: allText.substring(0, 200),
      icon: detectIcon(title),
      color: detectColor(title),
      modules: [{
        title: "Основной материал",
        slug: "osnovnoj-material",
        type: "THEORY",
        points: 50,
        description: "",
        content: allText,
        questions: [],
      }],
    })
  }

  // Извлекаем вопросы
  for (const trail of trails) {
    for (const mod of trail.modules) {
      const { content, questions } = extractQuestionsFromDocx(mod.content)
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

// Структура параграфа
interface DocxParagraph {
  text: string
  style?: string
  outlineLevel?: number
  isBold?: boolean
  isItalic?: boolean
  isList?: boolean
}

// Извлечение параграфов из DOCX XML
function extractParagraphs(xml: string): DocxParagraph[] {
  const paragraphs: DocxParagraph[] = []

  // Паттерн для параграфов <w:p>
  const paraRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g
  let match: RegExpExecArray | null

  while ((match = paraRegex.exec(xml)) !== null) {
    const paraContent = match[1]

    // Извлекаем текст из <w:t> элементов
    const textParts: string[] = []
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
    let textMatch: RegExpExecArray | null

    while ((textMatch = textRegex.exec(paraContent)) !== null) {
      textParts.push(textMatch[1])
    }

    const text = textParts.join("")

    if (!text.trim()) continue

    // Определяем стиль
    const styleMatch = paraContent.match(/<w:pStyle\s+w:val="([^"]+)"/i)
    const style = styleMatch ? styleMatch[1] : undefined

    // Определяем уровень outline
    const outlineLvlMatch = paraContent.match(/<w:outlineLvl\s+w:val="(\d+)"/i)
    const outlineLevel = outlineLvlMatch ? parseInt(outlineLvlMatch[1]) : undefined

    // Определяем форматирование
    const isBold = /<w:b(?:\s|\/|>)/.test(paraContent) && !/<w:b\s+w:val="0"/.test(paraContent)
    const isItalic = /<w:i(?:\s|\/|>)/.test(paraContent) && !/<w:i\s+w:val="0"/.test(paraContent)

    // Определяем список
    const isList = /<w:numPr>/.test(paraContent)

    paragraphs.push({
      text,
      style,
      outlineLevel,
      isBold,
      isItalic,
      isList,
    })
  }

  return paragraphs
}

// Извлечение вопросов из контента DOCX
function extractQuestionsFromDocx(content: string): { content: string; questions: ParsedQuestion[] } {
  const questions: ParsedQuestion[] = []
  let cleanContent = content

  // Паттерн для вопросов
  const questionPattern = /([^\n]+\?)\s*\n((?:[-•\da-dа-г][.)\s]+[^\n]+\n?)+)/gi

  const matches = content.matchAll(questionPattern)

  for (const match of matches) {
    const questionText = match[1].trim()
    const optionsBlock = match[2]

    const options: string[] = []
    let correctAnswer = 0

    const optionPattern = /[-•\da-dа-г][.)\s]+([^\n]+?)(\*|(?:\(правильн|верн|correct))?$/gim
    const optionMatches = optionsBlock.matchAll(optionPattern)

    let index = 0
    for (const optMatch of optionMatches) {
      let optionText = optMatch[1].trim()
      const isCorrect = optMatch[2] !== undefined

      optionText = optionText.replace(/\s*\*\s*$/, "").replace(/\s*\((?:правильн|верн|correct)[^)]*\)\s*$/i, "").trim()

      if (optionText) {
        options.push(optionText)
        if (isCorrect) correctAnswer = index
        index++
      }
    }

    if (options.length >= 2) {
      questions.push({ question: questionText, options, correctAnswer })
      cleanContent = cleanContent.replace(match[0], "")
    }
  }

  return { content: cleanContent.trim(), questions }
}
