// Главный модуль системы импорта

export * from "./types"
export * from "./smart-detector"
export type { ConfidenceDetails, ConfidenceCriterion } from "./types"
export { parseTxt } from "./parsers/txt-parser"
export { parseMd } from "./parsers/md-parser"
export { parseJson } from "./parsers/json-parser"
export { parseXml } from "./parsers/xml-parser"
export { parseWithAI, checkAIAvailability, getAIConfig } from "./parsers/ai-parser"

import { ParseResult, ParsedTrail, FileFormat, AIParserConfig, ConfidenceDetails } from "./types"
import { detectFileFormat, analyzeStructure } from "./smart-detector"
import { parseTxt } from "./parsers/txt-parser"
import { parseMd } from "./parsers/md-parser"
import { parseJson } from "./parsers/json-parser"
import { parseXml } from "./parsers/xml-parser"
import { parseWithAI, getAIConfig } from "./parsers/ai-parser"

export interface SmartImportOptions {
  useAI?: boolean
  aiConfig?: AIParserConfig
  preferredFormat?: FileFormat
}

export interface SmartImportResult extends ParseResult {
  detectedFormat: FileFormat
  structureConfidence: number
  confidenceDetails?: ConfidenceDetails
}

// Умный импорт с автоопределением формата
export async function smartImport(
  content: string,
  filename: string,
  options: SmartImportOptions = {}
): Promise<SmartImportResult> {
  const detectedFormat = options.preferredFormat || detectFileFormat(filename, content)
  const structureAnalysis = analyzeStructure(content)
  const isAIOnlyFormat = requiresAIParser(filename)

  let result: ParseResult

  // Для форматов без нативного парсера - сразу используем AI
  if (isAIOnlyFormat) {
    const aiConfig = options.aiConfig || getAIConfig()
    if (aiConfig.enabled && aiConfig.apiKey) {
      try {
        result = await parseWithAI(content, aiConfig)
        if (result.success) {
          return {
            ...result,
            detectedFormat,
            structureConfidence: structureAnalysis.confidence,
            confidenceDetails: structureAnalysis.confidenceDetails,
            parseMethod: "ai",
          }
        }
      } catch (e) {
        // Fallback to txt parser
      }
    }
    // Если AI недоступен для AI-only формата, пробуем как txt
    result = parseTxt(content)
    result.warnings.push(`Формат ${detectedFormat} требует AI-парсер, но он недоступен. Используется текстовый парсер.`)
    return {
      ...result,
      detectedFormat,
      structureConfidence: structureAnalysis.confidence,
      confidenceDetails: structureAnalysis.confidenceDetails,
    }
  }

  // Если включен AI и структура неясная - используем AI
  if (options.useAI && structureAnalysis.confidence < 60) {
    const aiConfig = options.aiConfig || getAIConfig()
    if (aiConfig.enabled && aiConfig.apiKey) {
      try {
        result = await parseWithAI(content, aiConfig)
        if (result.success) {
          return {
            ...result,
            detectedFormat,
            structureConfidence: structureAnalysis.confidence,
            confidenceDetails: structureAnalysis.confidenceDetails,
            parseMethod: "ai",
          }
        }
        // Если AI не справился, продолжаем с code парсером
        result.warnings.push("AI парсер не справился, используется кодовый парсер")
      } catch (e) {
        // Fallback to code parser
      }
    }
  }

  // Парсинг по формату
  switch (detectedFormat) {
    case "json":
      result = parseJson(content)
      break
    case "xml":
      result = parseXml(content)
      break
    case "md":
      result = parseMd(content)
      break
    case "txt":
    default:
      result = parseTxt(content)
      break
  }

  // Если кодовый парсер не справился и есть AI - пробуем AI
  if (!result.success && options.useAI) {
    const aiConfig = options.aiConfig || getAIConfig()
    if (aiConfig.enabled && aiConfig.apiKey) {
      try {
        const aiResult = await parseWithAI(content, aiConfig)
        if (aiResult.success) {
          return {
            ...aiResult,
            detectedFormat,
            structureConfidence: structureAnalysis.confidence,
            confidenceDetails: structureAnalysis.confidenceDetails,
            warnings: [...result.warnings, ...aiResult.warnings, "Кодовый парсер не справился, использован AI"],
          }
        }
      } catch (e) {
        // Return code parser result
      }
    }
  }

  return {
    ...result,
    detectedFormat,
    structureConfidence: structureAnalysis.confidence,
    confidenceDetails: structureAnalysis.confidenceDetails,
  }
}

// Гибридный парсинг (код + AI для улучшения)
export async function hybridImport(
  content: string,
  filename: string,
  aiConfig?: AIParserConfig
): Promise<SmartImportResult> {
  const detectedFormat = detectFileFormat(filename, content)
  const structureAnalysis = analyzeStructure(content)
  const isAIOnlyFormat = requiresAIParser(filename)

  // Для AI-only форматов используем только AI
  if (isAIOnlyFormat) {
    const config = aiConfig || getAIConfig()
    if (config.enabled && config.apiKey) {
      try {
        const aiResult = await parseWithAI(content, config)
        if (aiResult.success) {
          return {
            ...aiResult,
            detectedFormat,
            structureConfidence: structureAnalysis.confidence,
            confidenceDetails: structureAnalysis.confidenceDetails,
            parseMethod: "ai",
          }
        }
      } catch (e) {
        // Fallback to txt parser
      }
    }
    const txtResult = parseTxt(content)
    txtResult.warnings.push(`Формат ${detectedFormat} требует AI-парсер, но он недоступен.`)
    return {
      ...txtResult,
      detectedFormat,
      structureConfidence: structureAnalysis.confidence,
      confidenceDetails: structureAnalysis.confidenceDetails,
    }
  }

  // Сначала пробуем кодовый парсер
  let codeResult: ParseResult

  switch (detectedFormat) {
    case "json":
      codeResult = parseJson(content)
      break
    case "xml":
      codeResult = parseXml(content)
      break
    case "md":
      codeResult = parseMd(content)
      break
    default:
      codeResult = parseTxt(content)
  }

  // Если кодовый парсер успешен и уверенность высокая - возвращаем
  if (codeResult.success && structureAnalysis.confidence > 70) {
    return {
      ...codeResult,
      detectedFormat,
      structureConfidence: structureAnalysis.confidence,
      confidenceDetails: structureAnalysis.confidenceDetails,
      parseMethod: "code",
    }
  }

  // Пробуем улучшить с помощью AI
  const config = aiConfig || getAIConfig()
  if (config.enabled && config.apiKey) {
    try {
      const aiResult = await parseWithAI(content, config)

      if (aiResult.success) {
        // Если AI справился лучше - используем его результат
        if (!codeResult.success || aiResult.trails.length > codeResult.trails.length) {
          return {
            ...aiResult,
            detectedFormat,
            structureConfidence: structureAnalysis.confidence,
            confidenceDetails: structureAnalysis.confidenceDetails,
            parseMethod: "hybrid",
            warnings: [...codeResult.warnings, ...aiResult.warnings],
          }
        }

        // Объединяем результаты (AI может найти то, что пропустил код)
        const mergedTrails = mergeTrails(codeResult.trails, aiResult.trails)
        return {
          success: true,
          trails: mergedTrails,
          warnings: [...codeResult.warnings, ...aiResult.warnings],
          errors: [],
          parseMethod: "hybrid",
          detectedFormat,
          structureConfidence: structureAnalysis.confidence,
          confidenceDetails: structureAnalysis.confidenceDetails,
        }
      }
    } catch (e) {
      // Return code result
    }
  }

  return {
    ...codeResult,
    detectedFormat,
    structureConfidence: structureAnalysis.confidence,
    confidenceDetails: structureAnalysis.confidenceDetails,
  }
}

// Объединение результатов парсинга
function mergeTrails(codeTrails: ParsedTrail[], aiTrails: ParsedTrail[]): ParsedTrail[] {
  // Простая стратегия: используем code как базу, добавляем уникальные из AI
  const result = [...codeTrails]
  const existingSlugs = new Set(codeTrails.map(t => t.slug))

  for (const aiTrail of aiTrails) {
    if (!existingSlugs.has(aiTrail.slug)) {
      result.push(aiTrail)
    }
  }

  return result
}

// Поддерживаемые форматы
// Форматы с нативным парсером (код)
export const NATIVE_PARSER_FORMATS = [
  { ext: ".txt", name: "Текстовый файл", mime: "text/plain", parser: "code" },
  { ext: ".md", name: "Markdown", mime: "text/markdown", parser: "code" },
  { ext: ".markdown", name: "Markdown", mime: "text/markdown", parser: "code" },
  { ext: ".json", name: "JSON", mime: "application/json", parser: "code" },
  { ext: ".xml", name: "XML", mime: "application/xml", parser: "code" },
] as const

// Форматы, требующие AI-парсинга (нет нативного парсера)
export const AI_ONLY_FORMATS = [
  { ext: ".doc", name: "Word (старый)", mime: "application/msword", parser: "ai" },
  { ext: ".docx", name: "Word", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", parser: "ai" },
  { ext: ".yml", name: "YAML", mime: "text/yaml", parser: "ai" },
  { ext: ".yaml", name: "YAML", mime: "text/yaml", parser: "ai" },
  { ext: ".kdl", name: "KDL", mime: "text/plain", parser: "ai" },
  { ext: ".csv", name: "CSV", mime: "text/csv", parser: "ai" },
  { ext: ".rtf", name: "Rich Text", mime: "application/rtf", parser: "ai" },
  { ext: ".odt", name: "OpenDocument", mime: "application/vnd.oasis.opendocument.text", parser: "ai" },
  { ext: ".pdf", name: "PDF", mime: "application/pdf", parser: "ai" },
  { ext: ".html", name: "HTML", mime: "text/html", parser: "ai" },
  { ext: ".htm", name: "HTML", mime: "text/html", parser: "ai" },
  { ext: ".rst", name: "reStructuredText", mime: "text/x-rst", parser: "ai" },
  { ext: ".tex", name: "LaTeX", mime: "text/x-tex", parser: "ai" },
  { ext: ".org", name: "Org Mode", mime: "text/x-org", parser: "ai" },
  { ext: ".adoc", name: "AsciiDoc", mime: "text/asciidoc", parser: "ai" },
  { ext: ".asciidoc", name: "AsciiDoc", mime: "text/asciidoc", parser: "ai" },
] as const

// Все поддерживаемые форматы
export const SUPPORTED_FORMATS = [...NATIVE_PARSER_FORMATS, ...AI_ONLY_FORMATS] as const

// Проверка - требует ли формат AI-парсинг
export function requiresAIParser(filename: string): boolean {
  const ext = "." + filename.split(".").pop()?.toLowerCase()
  return AI_ONLY_FORMATS.some(f => f.ext === ext)
}

// Генерация примера формата
export function generateSampleFormat(format: FileFormat): string {
  switch (format) {
    case "json":
      return JSON.stringify({
        trails: [{
          title: "Vibe Coding",
          slug: "vibe-coding",
          subtitle: "Научись кодить с AI",
          description: "Полный курс по Vibe Coding",
          icon: "💻",
          color: "#6366f1",
          modules: [{
            title: "Введение в Vibe Coding",
            slug: "intro-vibe-coding",
            type: "THEORY",
            points: 50,
            description: "Основы работы с AI-ассистентами",
            content: "# Добро пожаловать!\n\nVibe Coding — это современный подход...",
            questions: [{
              question: "Что такое Vibe Coding?",
              options: [
                "Программирование без компьютера",
                "Программирование с помощью AI",
                "Визуальное программирование",
                "Игра"
              ],
              correctAnswer: 1
            }]
          }]
        }]
      }, null, 2)

    case "xml":
      return `<?xml version="1.0" encoding="UTF-8"?>
<trails>
  <trail slug="vibe-coding">
    <title>Vibe Coding</title>
    <subtitle>Научись кодить с AI</subtitle>
    <description>Полный курс по Vibe Coding</description>
    <icon>💻</icon>
    <color>#6366f1</color>
    <modules>
      <module slug="intro-vibe-coding">
        <title>Введение в Vibe Coding</title>
        <type>THEORY</type>
        <points>50</points>
        <description>Основы работы с AI-ассистентами</description>
        <content><![CDATA[
# Добро пожаловать!

Vibe Coding — это современный подход...
        ]]></content>
        <questions>
          <question>
            <text>Что такое Vibe Coding?</text>
            <options>
              <option>Программирование без компьютера</option>
              <option correct="true">Программирование с помощью AI</option>
              <option>Визуальное программирование</option>
              <option>Игра</option>
            </options>
          </question>
        </questions>
      </module>
    </modules>
  </trail>
</trails>`

    case "md":
      return `# Vibe Coding

Научись кодить с AI

## Введение в Vibe Coding

Основы работы с AI-ассистентами

### Добро пожаловать!

Vibe Coding — это современный подход к программированию с использованием AI.

### Вопросы

В: Что такое Vibe Coding?
- Программирование без компьютера
- Программирование с помощью AI *
- Визуальное программирование
- Игра`

    case "txt":
    default:
      return `=== TRAIL ===
название: Vibe Coding
slug: vibe-coding
подзаголовок: Научись кодить с AI
описание: Полный курс по Vibe Coding
иконка: 💻
цвет: #6366f1

=== MODULE ===
название: Введение в Vibe Coding
slug: intro-vibe-coding
тип: урок
очки: 50
описание: Основы работы с AI-ассистентами
---
# Добро пожаловать в Vibe Coding!

Vibe Coding — это современный подход к программированию...

## Что такое AI-ассистент?

Здесь пишется контент модуля в формате Markdown.
---

=== ВОПРОСЫ ===
В: Что такое Vibe Coding?
- Программирование без компьютера
- Программирование с помощью AI *
- Визуальное программирование
- Игра`
  }
}
