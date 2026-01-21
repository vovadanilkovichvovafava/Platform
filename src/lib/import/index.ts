// Главный модуль системы импорта

export * from "./types"
export * from "./smart-detector"
export { parseTxt } from "./parsers/txt-parser"
export { parseMd } from "./parsers/md-parser"
export { parseJson } from "./parsers/json-parser"
export { parseXml } from "./parsers/xml-parser"
export { parseWithAI, checkAIAvailability, getAIConfig } from "./parsers/ai-parser"

import { ParseResult, ParsedTrail, FileFormat, AIParserConfig } from "./types"
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
}

// Умный импорт с автоопределением формата
export async function smartImport(
  content: string,
  filename: string,
  options: SmartImportOptions = {}
): Promise<SmartImportResult> {
  const detectedFormat = options.preferredFormat || detectFileFormat(filename, content)
  const structureAnalysis = analyzeStructure(content)

  let result: ParseResult

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
export const SUPPORTED_FORMATS = [
  { ext: ".txt", name: "Текстовый файл", mime: "text/plain" },
  { ext: ".md", name: "Markdown", mime: "text/markdown" },
  { ext: ".json", name: "JSON", mime: "application/json" },
  { ext: ".xml", name: "XML", mime: "application/xml" },
] as const

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
