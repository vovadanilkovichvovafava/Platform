import { describe, it, expect } from "vitest"

import { parseMd } from "@/lib/import/parsers/md-parser"
import { parseTxt } from "@/lib/import/parsers/txt-parser"
import { parseJson } from "@/lib/import/parsers/json-parser"
import { SUPPORTED_FORMATS, NATIVE_PARSER_FORMATS, requiresAIParser } from "@/lib/import"

// Inline test fixtures
const sampleMd = `# Тестовый курс

Описание тестового курса для проверки импорта

## Введение в тестирование

Это модуль о тестировании приложений.

### Теория

Тестирование важно для качества кода.

### Вопросы

В: Что такое unit-тест?
- Тест базы данных
- Тест отдельной функции *
- Тест интерфейса
- Нагрузочный тест
`

const sampleTxt = `=== TRAIL ===
название: Основы программирования
slug: basics
подзаголовок: Для начинающих
описание: Курс основ программирования

=== MODULE ===
название: Переменные
slug: variables
тип: урок
очки: 50
описание: Изучаем переменные
---
Переменная - это именованная область памяти.
---

=== ВОПРОСЫ ===
В: Какое ключевое слово создаёт константу?
- var
- let
- const *
- function
`

const sampleValidJson = `{
  "trails": [
    {
      "title": "JavaScript Основы",
      "slug": "js-basics",
      "subtitle": "Изучаем JS",
      "description": "Базовый курс JavaScript",
      "icon": "📘",
      "color": "#f7df1e",
      "modules": [
        {
          "title": "Введение",
          "slug": "intro",
          "type": "theory",
          "points": 50,
          "description": "Первый модуль",
          "content": "JavaScript - это язык программирования для веба.",
          "questions": [
            {
              "question": "Где выполняется JavaScript?",
              "options": ["Только в браузере", "Только на сервере", "В браузере и на сервере", "Нигде"],
              "correctAnswer": 2
            }
          ]
        }
      ]
    }
  ]
}`

const sampleInvalidJson = `{
  "trails": [
    {
      "title": "Невалидный JSON,
      "modules": []
    }
  ]
}`

describe("Поддерживаемые форматы импорта", () => {
  it("должен включать обязательные расширения в SUPPORTED_FORMATS", () => {
    const extensions = SUPPORTED_FORMATS.map(f => f.ext)

    // Обязательные форматы
    expect(extensions).toContain(".txt")
    expect(extensions).toContain(".md")
    expect(extensions).toContain(".markdown")
    expect(extensions).toContain(".json")
    expect(extensions).toContain(".pdf")
    expect(extensions).toContain(".doc")
    expect(extensions).toContain(".docx")
  })

  it("должен правильно определять AI-only форматы", () => {
    expect(requiresAIParser("file.pdf")).toBe(true)
    expect(requiresAIParser("file.csv")).toBe(true)
    expect(requiresAIParser("file.rtf")).toBe(true)

    // Нативные форматы НЕ требуют AI
    expect(requiresAIParser("file.txt")).toBe(false)
    expect(requiresAIParser("file.md")).toBe(false)
    expect(requiresAIParser("file.json")).toBe(false)
    expect(requiresAIParser("file.doc")).toBe(false)
    expect(requiresAIParser("file.docx")).toBe(false)
  })

  it("должен иметь нативные парсеры для doc и docx", () => {
    const nativeExtensions = NATIVE_PARSER_FORMATS.map(f => f.ext)
    expect(nativeExtensions).toContain(".doc")
    expect(nativeExtensions).toContain(".docx")
  })
})

describe("Markdown парсер", () => {
  it("должен парсить валидный markdown файл", () => {
    const result = parseMd(sampleMd)

    expect(result.success).toBe(true)
    expect(result.trails.length).toBeGreaterThan(0)
    expect(result.trails[0].title).toBe("Тестовый курс")
    expect(result.errors).toHaveLength(0)
  })

  it("должен извлекать модули из markdown", () => {
    const result = parseMd(sampleMd)

    expect(result.trails[0].modules.length).toBeGreaterThan(0)
  })

  it("должен обрабатывать пустой контент без падения", () => {
    const result = parseMd("")

    expect(result.success).toBe(false)
    expect(result.trails).toHaveLength(0)
  })
})

describe("TXT парсер", () => {
  it("должен парсить валидный txt файл с маркерами", () => {
    const result = parseTxt(sampleTxt)

    expect(result.success).toBe(true)
    expect(result.trails.length).toBeGreaterThan(0)
    expect(result.errors).toHaveLength(0)
  })

  it("должен обрабатывать пустой контент без падения", () => {
    const result = parseTxt("")

    expect(result.success).toBe(false)
    expect(result.trails).toHaveLength(0)
  })
})

describe("JSON парсер", () => {
  it("должен парсить валидный JSON файл", () => {
    const result = parseJson(sampleValidJson)

    expect(result.success).toBe(true)
    expect(result.trails.length).toBeGreaterThan(0)
    expect(result.trails[0].title).toBe("JavaScript Основы")
    expect(result.errors).toHaveLength(0)
  })

  it("должен возвращать понятную ошибку для невалидного JSON", () => {
    const result = parseJson(sampleInvalidJson)

    expect(result.success).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    // Должно содержать информацию о синтаксической ошибке
    expect(result.errors[0]).toMatch(/JSON|синтаксическ/i)
  })

  it("должен обрабатывать пустой JSON без падения", () => {
    const result = parseJson("{}")

    // Пустой объект - не ошибка, но trails пустой
    expect(result.trails).toHaveLength(0)
  })

  it("должен обрабатывать некорректный JSON без падения", () => {
    const result = parseJson("not json at all")

    expect(result.success).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe("Безопасность импорта", () => {
  it("не должен падать на очень длинном контенте", () => {
    const longContent = "# Test\n" + "A".repeat(100000)

    expect(() => parseMd(longContent)).not.toThrow()
  })

  it("не должен падать на строке с нулевыми символами", () => {
    const binaryContent = String.fromCharCode(0, 1, 2, 255)

    expect(() => parseTxt(binaryContent)).not.toThrow()
    expect(() => parseMd(binaryContent)).not.toThrow()
  })
})
