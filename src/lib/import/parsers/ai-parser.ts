// AI парсер для умного определения структуры через нейросеть

import {
  ParsedTrail,
  ParseResult,
  AIParserConfig,
} from "../types"

// Промпт для AI парсинга
const AI_SYSTEM_PROMPT = `Ты - AI-ассистент для парсинга образовательного контента.
Твоя задача - преобразовать текст в структурированный формат курса.

Формат вывода (JSON):
{
  "trails": [{
    "title": "Название курса",
    "slug": "nazvanie-kursa",
    "subtitle": "Краткое описание",
    "description": "Полное описание курса",
    "icon": "📚",
    "color": "#6366f1",
    "modules": [{
      "title": "Название модуля",
      "slug": "nazvanie-modulya",
      "type": "THEORY" | "PRACTICE" | "PROJECT",
      "points": 50,
      "description": "Описание модуля",
      "content": "Контент в Markdown",
      "questions": [{
        "question": "Текст вопроса?",
        "options": ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"],
        "correctAnswer": 0
      }]
    }]
  }]
}

Правила:
1. Определи структуру: заголовки -> trail, подзаголовки -> module
2. Если есть вопросы с вариантами ответов - это PRACTICE
3. Если есть задание на создание чего-то - это PROJECT
4. Остальное - THEORY
5. Slug генерируй из названия (транслитерация, lowercase, дефисы)
6. Выбери подходящий emoji для icon
7. Выбери подходящий цвет (#hex)
8. points: THEORY=50, PRACTICE=75, PROJECT=100
9. Сохрани весь контент в формате Markdown
10. Верни ТОЛЬКО валидный JSON без комментариев`

const AI_USER_PROMPT = `Преобразуй следующий текст в структурированный курс:

---
{content}
---

Верни JSON согласно формату.`

export interface AIParserResult {
  available: boolean
  trails: ParsedTrail[]
  error?: string
}

// Проверка доступности AI API
export async function checkAIAvailability(config: AIParserConfig): Promise<{
  available: boolean
  error?: string
  model?: string
}> {
  if (!config.enabled || !config.apiEndpoint || !config.apiKey) {
    return { available: false, error: "AI API не настроен" }
  }

  try {
    // Пробный запрос для проверки токена
    const response = await fetch(config.apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "gpt-3.5-turbo",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 5,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return {
        available: true,
        model: data.model || config.model,
      }
    }

    const error = await response.text()
    return {
      available: false,
      error: `API вернул ошибку: ${response.status} - ${error.substring(0, 100)}`,
    }
  } catch (e) {
    return {
      available: false,
      error: `Ошибка соединения: ${e instanceof Error ? e.message : "unknown"}`,
    }
  }
}

// Парсинг через AI
export async function parseWithAI(
  content: string,
  config: AIParserConfig
): Promise<ParseResult> {
  const warnings: string[] = []
  const errors: string[] = []

  if (!config.enabled || !config.apiEndpoint || !config.apiKey) {
    errors.push("AI API не настроен")
    return { success: false, trails: [], warnings, errors, parseMethod: "ai" }
  }

  try {
    const response = await fetch(config.apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "gpt-3.5-turbo",
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: AI_USER_PROMPT.replace("{content}", content) },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      errors.push(`AI API ошибка: ${response.status} - ${errorText.substring(0, 200)}`)
      return { success: false, trails: [], warnings, errors, parseMethod: "ai" }
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content

    if (!aiResponse) {
      errors.push("AI не вернул ответ")
      return { success: false, trails: [], warnings, errors, parseMethod: "ai" }
    }

    // Извлечение JSON из ответа
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      errors.push("AI вернул невалидный JSON")
      warnings.push(`AI ответ: ${aiResponse.substring(0, 200)}...`)
      return { success: false, trails: [], warnings, errors, parseMethod: "ai" }
    }

    const parsed = JSON.parse(jsonMatch[0])
    const trails = parsed.trails || [parsed]

    // Валидация результата
    const validatedTrails = validateAndFixTrails(trails, warnings)

    return {
      success: validatedTrails.length > 0,
      trails: validatedTrails,
      warnings,
      errors,
      parseMethod: "ai",
    }
  } catch (e) {
    errors.push(`Ошибка AI парсинга: ${e instanceof Error ? e.message : "unknown"}`)
    return { success: false, trails: [], warnings, errors, parseMethod: "ai" }
  }
}

// Валидация и исправление результатов AI
function validateAndFixTrails(trails: any[], warnings: string[]): ParsedTrail[] {
  const result: ParsedTrail[] = []

  for (const trail of trails) {
    if (!trail || typeof trail !== "object") continue

    const validTrail: ParsedTrail = {
      title: trail.title || trail.name || "Без названия",
      slug: trail.slug || generateSlugFromTitle(trail.title || "untitled"),
      subtitle: trail.subtitle || trail.description?.substring(0, 100) || "",
      description: trail.description || "",
      icon: trail.icon || "📚",
      color: isValidColor(trail.color) ? trail.color : "#6366f1",
      modules: [],
    }

    if (!trail.title) {
      warnings.push("AI не определил название trail")
    }

    // Валидация модулей
    const modules = trail.modules || trail.lessons || []
    for (const mod of modules) {
      if (!mod || typeof mod !== "object") continue

      const validModule = {
        title: mod.title || mod.name || "Без названия",
        slug: mod.slug || generateSlugFromTitle(mod.title || "module"),
        type: validateType(mod.type),
        points: typeof mod.points === "number" ? mod.points : 50,
        description: mod.description || "",
        content: mod.content || "",
        questions: validateQuestions(mod.questions || [], warnings),
        level: mod.level,
        duration: mod.duration,
      }

      validTrail.modules.push(validModule)
    }

    if (validTrail.modules.length === 0) {
      warnings.push(`Trail "${validTrail.title}" не имеет модулей`)
    }

    result.push(validTrail)
  }

  return result
}

// Валидация типа модуля
function validateType(type: any): "THEORY" | "PRACTICE" | "PROJECT" {
  const upperType = String(type || "").toUpperCase()
  if (upperType === "THEORY" || upperType === "PRACTICE" || upperType === "PROJECT") {
    return upperType
  }
  return "THEORY"
}

// Валидация вопросов
function validateQuestions(questions: any[], warnings: string[]): Array<{
  question: string
  options: string[]
  correctAnswer: number
}> {
  const result: Array<{
    question: string
    options: string[]
    correctAnswer: number
  }> = []

  for (const q of questions) {
    if (!q || typeof q !== "object") continue

    const question = q.question || q.text || ""
    const options = Array.isArray(q.options) ? q.options.filter((o: any) => typeof o === "string") : []
    const correctAnswer = typeof q.correctAnswer === "number" ? q.correctAnswer : 0

    if (question && options.length >= 2) {
      result.push({
        question,
        options,
        correctAnswer: Math.min(correctAnswer, options.length - 1),
      })
    } else if (question) {
      warnings.push(`Вопрос "${question.substring(0, 30)}..." имеет недостаточно вариантов`)
    }
  }

  return result
}

// Генерация slug
function generateSlugFromTitle(title: string): string {
  const translitMap: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
    з: "z", и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c",
    ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  }

  return title
    .toLowerCase()
    .split("")
    .map((char) => translitMap[char] || char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50)
}

// Проверка валидности цвета
function isValidColor(color: any): boolean {
  if (typeof color !== "string") return false
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

// Получение конфигурации AI из переменных окружения
export function getAIConfig(): AIParserConfig {
  return {
    enabled: process.env.AI_PARSER_ENABLED === "true",
    apiEndpoint: process.env.AI_API_ENDPOINT || process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions",
    apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY,
    model: process.env.AI_MODEL || "gpt-3.5-turbo",
  }
}
