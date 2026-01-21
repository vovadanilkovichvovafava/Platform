// Парсер для DOC формата (старый Word формат - OLE Compound Document)
// DOC - это бинарный формат, более сложный чем DOCX

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

// Парсинг DOC из ArrayBuffer
export async function parseDoc(buffer: ArrayBuffer): Promise<ParseResult> {
  const warnings: string[] = []
  const errors: string[] = []

  try {
    const uint8 = new Uint8Array(buffer)

    // Проверяем сигнатуру OLE (D0 CF 11 E0 A1 B1 1A E1)
    const oleSig = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]
    const isOle = oleSig.every((byte, i) => uint8[i] === byte)

    if (!isOle) {
      // Возможно это RTF или текст
      const textContent = new TextDecoder("utf-8", { fatal: false }).decode(uint8)
      if (textContent.startsWith("{\\rtf")) {
        warnings.push("Файл в формате RTF, обрабатываем как текст")
        return parseDocText(extractTextFromRtf(textContent), warnings)
      }

      errors.push("Файл не является валидным DOC форматом")
      return { success: false, trails: [], warnings, errors, parseMethod: "code" }
    }

    // Извлекаем текст из OLE структуры
    const text = extractTextFromOle(uint8)

    if (!text || !text.trim()) {
      errors.push("Не удалось извлечь текст из DOC файла")
      return { success: false, trails: [], warnings, errors, parseMethod: "code" }
    }

    return parseDocText(text, warnings)
  } catch (e) {
    errors.push(`Ошибка парсинга DOC: ${e instanceof Error ? e.message : String(e)}`)
    return { success: false, trails: [], warnings, errors, parseMethod: "code" }
  }
}

// Парсинг DOC из текстового контента
export function parseDocFromText(content: string): ParseResult {
  const warnings: string[] = []

  // Проверяем начало - если бинарные данные
  if (content.charCodeAt(0) === 0xD0 || content.includes("\x00")) {
    warnings.push("DOC файл загружен как текст, возможна потеря данных")

    // Пытаемся извлечь читаемый текст
    const cleanText = extractReadableText(content)
    if (cleanText.trim()) {
      return parseDocText(cleanText, warnings)
    }
  }

  // Если это RTF
  if (content.startsWith("{\\rtf")) {
    return parseDocText(extractTextFromRtf(content), warnings)
  }

  // Если обычный текст
  return parseDocText(content, warnings)
}

// Извлечение текста из OLE Compound Document
function extractTextFromOle(data: Uint8Array): string {
  try {
    // OLE Header
    const sectorSize = 1 << (data[30] | (data[31] << 8)) // Обычно 512
    const miniSectorSize = 1 << (data[32] | (data[33] << 8)) // Обычно 64

    const numFatSectors = data[44] | (data[45] << 8) | (data[46] << 16) | (data[47] << 24)
    const firstDirectorySectorLocation = data[48] | (data[49] << 8) | (data[50] << 16) | (data[51] << 24)
    const firstMiniFatSectorLocation = data[60] | (data[61] << 8) | (data[62] << 16) | (data[63] << 24)

    // Для простоты, просто ищем текстовые данные в файле
    // Полный парсинг OLE слишком сложен без библиотеки

    // Метод 1: Поиск Unicode текста (UTF-16LE)
    const text = extractUnicodeText(data)
    if (text.length > 100) {
      return text
    }

    // Метод 2: Поиск ASCII текста
    const asciiText = extractAsciiText(data)
    if (asciiText.length > text.length) {
      return asciiText
    }

    return text || asciiText
  } catch {
    // Fallback: извлекаем любой читаемый текст
    return extractReadableText(new TextDecoder("utf-8", { fatal: false }).decode(data))
  }
}

// Извлечение Unicode текста (UTF-16LE) из бинарных данных
function extractUnicodeText(data: Uint8Array): string {
  const chunks: string[] = []
  let currentChunk = ""
  let inText = false

  for (let i = 0; i < data.length - 1; i += 2) {
    const charCode = data[i] | (data[i + 1] << 8)

    // Проверяем, является ли это печатным символом
    if (isPrintableUnicode(charCode)) {
      currentChunk += String.fromCharCode(charCode)
      inText = true
    } else {
      if (inText && currentChunk.length > 3) {
        chunks.push(currentChunk)
      }
      currentChunk = ""
      inText = false
    }
  }

  if (currentChunk.length > 3) {
    chunks.push(currentChunk)
  }

  // Фильтруем и объединяем
  const meaningfulChunks = chunks
    .filter(chunk => {
      // Убираем технические строки
      const lower = chunk.toLowerCase()
      if (lower.includes("microsoft") && chunk.length < 50) return false
      if (lower.includes("normal.dot")) return false
      if (/^[a-z]{1,3}$/i.test(chunk)) return false
      return chunk.length > 5 || /[а-яА-ЯёЁ]/.test(chunk)
    })

  return meaningfulChunks.join("\n\n")
}

// Извлечение ASCII текста
function extractAsciiText(data: Uint8Array): string {
  const chunks: string[] = []
  let currentChunk = ""

  for (let i = 0; i < data.length; i++) {
    const byte = data[i]

    // Печатные ASCII символы (32-126) + перенос строки и таб
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
      currentChunk += String.fromCharCode(byte)
    } else if (byte >= 0xC0 && byte <= 0xFF) {
      // Возможно кириллица в CP1251
      currentChunk += decodeCp1251(byte)
    } else {
      if (currentChunk.length > 10) {
        chunks.push(currentChunk.trim())
      }
      currentChunk = ""
    }
  }

  if (currentChunk.length > 10) {
    chunks.push(currentChunk.trim())
  }

  return chunks.filter(c => c.length > 20).join("\n\n")
}

// Декодирование CP1251 (Windows Cyrillic)
function decodeCp1251(byte: number): string {
  const cp1251Map: Record<number, string> = {
    0xC0: "А", 0xC1: "Б", 0xC2: "В", 0xC3: "Г", 0xC4: "Д", 0xC5: "Е", 0xC6: "Ж", 0xC7: "З",
    0xC8: "И", 0xC9: "Й", 0xCA: "К", 0xCB: "Л", 0xCC: "М", 0xCD: "Н", 0xCE: "О", 0xCF: "П",
    0xD0: "Р", 0xD1: "С", 0xD2: "Т", 0xD3: "У", 0xD4: "Ф", 0xD5: "Х", 0xD6: "Ц", 0xD7: "Ч",
    0xD8: "Ш", 0xD9: "Щ", 0xDA: "Ъ", 0xDB: "Ы", 0xDC: "Ь", 0xDD: "Э", 0xDE: "Ю", 0xDF: "Я",
    0xE0: "а", 0xE1: "б", 0xE2: "в", 0xE3: "г", 0xE4: "д", 0xE5: "е", 0xE6: "ж", 0xE7: "з",
    0xE8: "и", 0xE9: "й", 0xEA: "к", 0xEB: "л", 0xEC: "м", 0xED: "н", 0xEE: "о", 0xEF: "п",
    0xF0: "р", 0xF1: "с", 0xF2: "т", 0xF3: "у", 0xF4: "ф", 0xF5: "х", 0xF6: "ц", 0xF7: "ч",
    0xF8: "ш", 0xF9: "щ", 0xFA: "ъ", 0xFB: "ы", 0xFC: "ь", 0xFD: "э", 0xFE: "ю", 0xFF: "я",
    0xA8: "Ё", 0xB8: "ё",
  }
  return cp1251Map[byte] || ""
}

// Проверка печатного Unicode символа
function isPrintableUnicode(code: number): boolean {
  // Пробел, ASCII буквы и цифры
  if (code >= 32 && code <= 126) return true
  // Кириллица
  if (code >= 0x0400 && code <= 0x04FF) return true
  // Расширенная латиница
  if (code >= 0x00C0 && code <= 0x024F) return true
  // Перенос строки и таб
  if (code === 10 || code === 13 || code === 9) return true
  // Типографские символы
  if (code >= 0x2000 && code <= 0x206F) return true

  return false
}

// Извлечение читаемого текста из строки с мусором
function extractReadableText(content: string): string {
  // Удаляем нулевые символы и управляющие коды
  const text = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")

  // Находим последовательности читаемого текста
  const chunks: string[] = []
  const words = text.split(/\s+/)

  let currentChunk: string[] = []
  for (const word of words) {
    // Слово считается читаемым если содержит буквы
    if (/[a-zA-Zа-яА-ЯёЁ]{2,}/.test(word)) {
      currentChunk.push(word)
    } else if (currentChunk.length > 0) {
      if (currentChunk.length > 3) {
        chunks.push(currentChunk.join(" "))
      }
      currentChunk = []
    }
  }

  if (currentChunk.length > 3) {
    chunks.push(currentChunk.join(" "))
  }

  return chunks.join("\n\n")
}

// Извлечение текста из RTF
function extractTextFromRtf(rtf: string): string {
  let text = rtf

  // Удаляем RTF команды
  text = text.replace(/\\[a-z]+\d*\s?/gi, " ")
  text = text.replace(/\{[^{}]*\}/g, "") // Удаляем группы
  text = text.replace(/[{}]/g, "")

  // Декодируем Unicode
  text = text.replace(/\\u(\d+)\??/g, (_, code) => String.fromCharCode(parseInt(code)))

  // Декодируем hex
  text = text.replace(/\\'([0-9a-f]{2})/gi, (_, hex) => {
    const code = parseInt(hex, 16)
    return decodeCp1251(code) || String.fromCharCode(code)
  })

  // Специальные символы
  text = text.replace(/\\par\b/g, "\n")
  text = text.replace(/\\tab\b/g, "\t")
  text = text.replace(/\\line\b/g, "\n")

  // Очистка
  text = text.replace(/\s+/g, " ")
  text = text.replace(/\n\s+/g, "\n")

  return text.trim()
}

// Парсинг извлечённого текста в структуру курса
function parseDocText(text: string, warnings: string[]): ParseResult {
  const errors: string[] = []

  if (!text.trim()) {
    errors.push("Текст документа пуст")
    return { success: false, trails: [], warnings, errors, parseMethod: "code" }
  }

  const lines = text.split("\n")
  const trails: ParsedTrail[] = []

  let currentTrail: ParsedTrail | null = null
  let currentMod: ParsedModule | null = null
  let contentBuffer: string[] = []
  let trailTitle = ""

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (contentBuffer.length > 0) {
        contentBuffer.push("")
      }
      continue
    }

    // Определяем заголовки по длине и регистру
    const isLikelyHeading1 = isHeading1Like(trimmed, lines.indexOf(line))
    const isLikelyHeading2 = isHeading2Like(trimmed)

    if (isLikelyHeading1) {
      // Сохраняем предыдущий модуль
      if (currentMod && currentTrail) {
        currentMod.content = contentBuffer.join("\n").trim()
        currentTrail.modules.push(currentMod)
        currentMod = null
      }
      // Сохраняем предыдущий trail
      if (currentTrail && currentTrail.modules.length > 0) {
        trails.push(currentTrail)
      }

      trailTitle = trimmed
      currentTrail = {
        title: trimmed,
        slug: generateSlug(trimmed),
        subtitle: "",
        description: "",
        icon: detectIcon(trimmed),
        color: detectColor(trimmed),
        modules: [],
      }
      contentBuffer = []
    } else if (isLikelyHeading2 && currentTrail) {
      // Сохраняем предыдущий модуль
      if (currentMod) {
        currentMod.content = contentBuffer.join("\n").trim()
        currentTrail.modules.push(currentMod)
      }

      currentMod = {
        title: trimmed,
        slug: generateSlug(trimmed),
        type: detectModuleType(trimmed),
        points: 50,
        description: "",
        content: "",
        questions: [],
      }
      contentBuffer = []
    } else {
      contentBuffer.push(trimmed)

      // Первая строка - возможный заголовок
      if (!currentTrail && !trailTitle && contentBuffer.length === 1) {
        trailTitle = trimmed
      }
    }
  }

  // Сохраняем последний модуль и trail
  if (currentMod && currentTrail) {
    currentMod.content = contentBuffer.join("\n").trim()
    currentTrail.modules.push(currentMod)
  }

  if (currentTrail && currentTrail.modules.length > 0) {
    trails.push(currentTrail)
  }

  // Если ничего не нашли, создаём из всего текста
  if (trails.length === 0) {
    const title = trailTitle || lines[0]?.substring(0, 50) || "Импортированный документ"
    trails.push({
      title,
      slug: generateSlug(title),
      subtitle: "",
      description: text.substring(0, 200),
      icon: detectIcon(title),
      color: detectColor(title),
      modules: [{
        title: "Основной материал",
        slug: "osnovnoj-material",
        type: "THEORY",
        points: 50,
        description: "",
        content: text,
        questions: [],
      }],
    })
  }

  // Извлекаем вопросы
  for (const trail of trails) {
    for (const mod of trail.modules) {
      const { content, questions } = extractQuestions(mod.content)
      if (questions.length > 0) {
        mod.content = content
        mod.questions = questions
        mod.type = "PRACTICE"
        mod.points = 75
      }
    }
  }

  return {
    success: trails.length > 0,
    trails,
    warnings,
    errors,
    parseMethod: "code",
  }
}

// Определение заголовка 1 уровня
function isHeading1Like(text: string, lineIndex: number): boolean {
  // Короткая строка (вероятно заголовок)
  if (text.length < 5 || text.length > 100) return false

  // В начале документа
  if (lineIndex < 5) {
    // Весь в верхнем регистре или начинается с заглавной
    if (text === text.toUpperCase() && text.length > 10) return true
  }

  // Явные маркеры
  if (/^(?:курс|course|глава|chapter|раздел|section)\s*[:\d]/i.test(text)) return true
  if (/^#\s+/.test(text)) return true

  return false
}

// Определение заголовка 2 уровня
function isHeading2Like(text: string): boolean {
  if (text.length < 3 || text.length > 80) return false

  // Явные маркеры
  if (/^(?:модуль|module|урок|lesson|тема|topic)\s*[:\d]/i.test(text)) return true
  if (/^##\s+/.test(text)) return true
  if (/^\d+[.)]\s+[A-ZА-ЯЁ]/.test(text)) return true

  return false
}

// Извлечение вопросов из контента
function extractQuestions(content: string): { content: string; questions: ParsedQuestion[] } {
  const questions: ParsedQuestion[] = []
  let cleanContent = content

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
