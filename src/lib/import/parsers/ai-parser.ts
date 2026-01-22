// AI парсер для умного определения структуры через Claude (Anthropic)

import {
  ParsedTrail,
  ParsedModule,
  ParsedQuestion,
  ParseResult,
  AIParserConfig,
  QuestionType,
  MatchingData,
  OrderingData,
  CaseAnalysisData,
} from "../types"

// Claude API version
const ANTHROPIC_VERSION = "2023-06-01"

// Таймауты для API запросов
const API_CHECK_TIMEOUT_MS = 15000   // 15 сек для проверки доступности
const API_PARSE_TIMEOUT_MS = 120000  // 2 мин для парсинга больших текстов

// Детальный промпт для AI парсинга с поддержкой всех типов вопросов
const AI_SYSTEM_PROMPT = `Ты - AI-ассистент для парсинга и улучшения образовательного контента.
Твоя задача - преобразовать текст в структурированный формат курса.

ВАЖНО: Если исходный текст слишком краткий или бедный по содержанию:
- Дополни его релевантной информацией по теме
- Добавь примеры и пояснения
- Сохрани исходную структуру, но обогати контент
- Убедись, что каждый модуль содержит достаточно материала для изучения

## ТИПЫ ВОПРОСОВ

Поддерживаются 4 типа вопросов:

### 1. SINGLE_CHOICE - Один правильный ответ
Стандартный тест с одним правильным вариантом.
\`\`\`json
{
  "question": "Какой тег используется для заголовка?",
  "type": "SINGLE_CHOICE",
  "options": ["<header>", "<h1>", "<title>", "<heading>"],
  "correctAnswer": 1,
  "explanation": "Тег <h1> - это заголовок первого уровня в HTML"
}
\`\`\`

### 2. MATCHING - Сопоставление
Соединение элементов из двух колонок.
\`\`\`json
{
  "question": "Сопоставьте термины с их определениями",
  "type": "MATCHING",
  "options": [],
  "correctAnswer": 0,
  "data": {
    "leftLabel": "Термин",
    "rightLabel": "Определение",
    "leftItems": [
      {"id": "l1", "text": "HTML"},
      {"id": "l2", "text": "CSS"},
      {"id": "l3", "text": "JavaScript"}
    ],
    "rightItems": [
      {"id": "r1", "text": "Язык разметки"},
      {"id": "r2", "text": "Язык стилей"},
      {"id": "r3", "text": "Язык программирования"}
    ],
    "correctPairs": {"l1": "r1", "l2": "r2", "l3": "r3"}
  }
}
\`\`\`

### 3. ORDERING - Порядок действий
Расположить элементы в правильном порядке.
\`\`\`json
{
  "question": "Расположите этапы разработки в правильном порядке",
  "type": "ORDERING",
  "options": [],
  "correctAnswer": 0,
  "data": {
    "items": [
      {"id": "s1", "text": "Анализ требований"},
      {"id": "s2", "text": "Проектирование"},
      {"id": "s3", "text": "Разработка"},
      {"id": "s4", "text": "Тестирование"}
    ],
    "correctOrder": ["s1", "s2", "s3", "s4"]
  }
}
\`\`\`

### 4. CASE_ANALYSIS - Анализ кейса
Анализ ситуации с множественным выбором правильных ответов.
\`\`\`json
{
  "question": "Проанализируйте код и найдите ошибки",
  "type": "CASE_ANALYSIS",
  "options": [],
  "correctAnswer": 0,
  "data": {
    "caseContent": "function sum(a, b) { return a - b; }",
    "caseLabel": "Код для анализа",
    "options": [
      {"id": "o1", "text": "Неправильная операция (минус вместо плюса)", "isCorrect": true, "explanation": "Функция называется sum, но использует вычитание"},
      {"id": "o2", "text": "Отсутствует проверка типов", "isCorrect": true, "explanation": "Нет валидации входных данных"},
      {"id": "o3", "text": "Неправильное имя функции", "isCorrect": false, "explanation": "Имя функции корректное"}
    ],
    "minCorrectRequired": 2
  }
}
\`\`\`

## ФОРМАТ ВЫВОДА

\`\`\`json
{
  "trails": [{
    "title": "Название курса",
    "slug": "nazvanie-kursa",
    "subtitle": "Краткое описание (1-2 предложения)",
    "description": "Полное описание курса (что изучим, для кого)",
    "icon": "📚",
    "color": "#6366f1",
    "modules": [{
      "title": "Название модуля",
      "slug": "nazvanie-modulya",
      "type": "THEORY | PRACTICE | PROJECT",
      "points": 50,
      "description": "Краткое описание модуля",
      "content": "Полный контент в Markdown с заголовками, списками, примерами кода",
      "level": "Beginner | Middle | Advanced",
      "duration": "15 мин",
      "requiresSubmission": false,
      "questions": [/* массив вопросов разных типов */]
    }]
  }]
}
\`\`\`

## ПРАВИЛА

1. **Структура**: заголовки верхнего уровня -> trail, подзаголовки -> module
2. **Типы модулей**:
   - THEORY (50 points) - теоретический материал без тестов
   - PRACTICE (75 points) - материал с вопросами/тестами
   - PROJECT (100 points) - практическое задание на создание чего-то
3. **Slug**: транслитерация кириллицы, lowercase, дефисы вместо пробелов
4. **Иконка**: подбери релевантный emoji по теме
5. **Цвет**: подбери hex-цвет по тематике (#6366f1 - tech, #ec4899 - design, #10b981 - data)
6. **Контент**: сохраняй и обогащай в Markdown (заголовки ##, списки, \`код\`, **жирный**)
7. **Вопросы**: создавай разнообразные типы вопросов (не только SINGLE_CHOICE)
8. **Улучшение**: если контент бедный - дополни примерами, пояснениями, деталями
9. **requiresSubmission**: true для PROJECT, true для PRACTICE с практическими заданиями
10. **Возврат**: ТОЛЬКО валидный JSON без комментариев и markdown-разметки вокруг`

const AI_USER_PROMPT = `Преобразуй следующий образовательный контент в структурированный курс.

Если контент слишком краткий - дополни его полезной информацией по теме.
Создай разнообразные типы вопросов (SINGLE_CHOICE, MATCHING, ORDERING, CASE_ANALYSIS).

---
{content}
---

Верни ТОЛЬКО JSON согласно формату (без \`\`\`json обёртки).`

export interface AIParserResult {
  available: boolean
  trails: ParsedTrail[]
  error?: string
}

// Проверка доступности Claude AI API
export async function checkAIAvailability(config: AIParserConfig): Promise<{
  available: boolean
  error?: string
  model?: string
}> {
  if (!config.enabled || !config.apiEndpoint || !config.apiKey) {
    return { available: false, error: "AI API не настроен" }
  }

  try {
    // Создаём AbortController для таймаута
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_CHECK_TIMEOUT_MS)

    // Пробный запрос для проверки токена
    const response = await fetch(config.apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: config.model || "claude-sonnet-4-5-20241022",
        max_tokens: 10,
        messages: [{ role: "user", content: "test" }],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

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
      error: `API вернул ошибку: ${response.status} - ${error.substring(0, 200)}`,
    }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return {
        available: false,
        error: `Таймаут: AI API не ответил за ${API_CHECK_TIMEOUT_MS / 1000} секунд`,
      }
    }
    return {
      available: false,
      error: `Ошибка соединения: ${e instanceof Error ? e.message : "unknown"}`,
    }
  }
}

// Парсинг через Claude AI
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
    // Создаём AbortController для таймаута (60 секунд для парсинга, т.к. AI может работать дольше)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_PARSE_TIMEOUT_MS)

    const response = await fetch(config.apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: config.model || "claude-sonnet-4-5-20241022",
        max_tokens: 16000,
        system: AI_SYSTEM_PROMPT,
        messages: [
          { role: "user", content: AI_USER_PROMPT.replace("{content}", content) },
        ],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      errors.push(`AI API ошибка: ${response.status} - ${errorText.substring(0, 200)}`)
      return { success: false, trails: [], warnings, errors, parseMethod: "ai" }
    }

    const data = await response.json()
    // Claude API response format: content[0].text
    const aiResponse = data.content?.[0]?.text

    if (!aiResponse) {
      errors.push("AI не вернул ответ")
      return { success: false, trails: [], warnings, errors, parseMethod: "ai" }
    }

    // Извлечение JSON из ответа (убираем возможные ```json обёртки)
    let jsonStr = aiResponse.trim()

    // Удаляем markdown code block если есть
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
    }

    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      errors.push("AI вернул невалидный JSON")
      warnings.push(`AI ответ: ${aiResponse.substring(0, 300)}...`)
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
    if (e instanceof Error && e.name === "AbortError") {
      errors.push(`Таймаут: AI парсер не ответил за ${API_PARSE_TIMEOUT_MS / 1000} секунд. Проверьте подключение к интернету.`)
    } else {
      errors.push(`Ошибка AI парсинга: ${e instanceof Error ? e.message : "unknown"}`)
    }
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

      const validModule: ParsedModule = {
        title: mod.title || mod.name || "Без названия",
        slug: mod.slug || generateSlugFromTitle(mod.title || "module"),
        type: validateModuleType(mod.type),
        points: typeof mod.points === "number" ? mod.points : getDefaultPoints(mod.type),
        description: mod.description || "",
        content: mod.content || "",
        questions: validateQuestions(mod.questions || [], warnings),
        level: mod.level,
        duration: mod.duration,
        requiresSubmission: mod.requiresSubmission ?? (mod.type === "PROJECT"),
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
function validateModuleType(type: any): "THEORY" | "PRACTICE" | "PROJECT" {
  const upperType = String(type || "").toUpperCase()
  if (upperType === "THEORY" || upperType === "PRACTICE" || upperType === "PROJECT") {
    return upperType
  }
  return "THEORY"
}

// Получение баллов по умолчанию
function getDefaultPoints(type: string): number {
  switch (String(type).toUpperCase()) {
    case "PRACTICE": return 75
    case "PROJECT": return 100
    default: return 50
  }
}

// Валидация типа вопроса
function validateQuestionType(type: any): QuestionType {
  const validTypes: QuestionType[] = ["SINGLE_CHOICE", "MATCHING", "ORDERING", "CASE_ANALYSIS"]
  const upperType = String(type || "").toUpperCase() as QuestionType
  return validTypes.includes(upperType) ? upperType : "SINGLE_CHOICE"
}

// Валидация вопросов с поддержкой всех типов
function validateQuestions(questions: any[], warnings: string[]): ParsedQuestion[] {
  const result: ParsedQuestion[] = []

  for (const q of questions) {
    if (!q || typeof q !== "object") continue

    const questionText = q.question || q.text || ""
    if (!questionText) continue

    const questionType = validateQuestionType(q.type)

    const validQuestion: ParsedQuestion = {
      question: questionText,
      type: questionType,
      options: [],
      correctAnswer: 0,
      explanation: q.explanation || undefined,
    }

    // Валидация в зависимости от типа вопроса
    switch (questionType) {
      case "MATCHING":
        validQuestion.data = validateMatchingData(q.data, warnings)
        break

      case "ORDERING":
        validQuestion.data = validateOrderingData(q.data, warnings)
        break

      case "CASE_ANALYSIS":
        validQuestion.data = validateCaseAnalysisData(q.data, warnings)
        break

      case "SINGLE_CHOICE":
      default:
        const options = Array.isArray(q.options)
          ? q.options.filter((o: any) => typeof o === "string")
          : []

        if (options.length < 2) {
          warnings.push(`Вопрос "${questionText.substring(0, 30)}..." имеет недостаточно вариантов`)
          continue
        }

        validQuestion.options = options
        validQuestion.correctAnswer = typeof q.correctAnswer === "number"
          ? Math.min(q.correctAnswer, options.length - 1)
          : 0
        break
    }

    result.push(validQuestion)
  }

  return result
}

// Валидация данных MATCHING
function validateMatchingData(data: any, warnings: string[]): MatchingData {
  if (!data || typeof data !== "object") {
    return createDefaultMatchingData()
  }

  const leftItems = Array.isArray(data.leftItems)
    ? data.leftItems.filter((i: any) => i && i.id && i.text)
    : []

  const rightItems = Array.isArray(data.rightItems)
    ? data.rightItems.filter((i: any) => i && i.id && i.text)
    : []

  if (leftItems.length < 2 || rightItems.length < 2) {
    warnings.push("MATCHING вопрос имеет недостаточно элементов")
    return createDefaultMatchingData()
  }

  return {
    leftLabel: data.leftLabel || "Термин",
    rightLabel: data.rightLabel || "Определение",
    leftItems,
    rightItems,
    correctPairs: data.correctPairs || {},
  }
}

function createDefaultMatchingData(): MatchingData {
  return {
    leftLabel: "Термин",
    rightLabel: "Определение",
    leftItems: [
      { id: "l1", text: "Элемент 1" },
      { id: "l2", text: "Элемент 2" },
      { id: "l3", text: "Элемент 3" },
    ],
    rightItems: [
      { id: "r1", text: "Описание 1" },
      { id: "r2", text: "Описание 2" },
      { id: "r3", text: "Описание 3" },
    ],
    correctPairs: { l1: "r1", l2: "r2", l3: "r3" },
  }
}

// Валидация данных ORDERING
function validateOrderingData(data: any, warnings: string[]): OrderingData {
  if (!data || typeof data !== "object") {
    return createDefaultOrderingData()
  }

  const items = Array.isArray(data.items)
    ? data.items.filter((i: any) => i && i.id && i.text)
    : []

  if (items.length < 2) {
    warnings.push("ORDERING вопрос имеет недостаточно элементов")
    return createDefaultOrderingData()
  }

  const correctOrder = Array.isArray(data.correctOrder)
    ? data.correctOrder
    : items.map((i: any) => i.id)

  return { items, correctOrder }
}

function createDefaultOrderingData(): OrderingData {
  return {
    items: [
      { id: "s1", text: "Шаг 1" },
      { id: "s2", text: "Шаг 2" },
      { id: "s3", text: "Шаг 3" },
      { id: "s4", text: "Шаг 4" },
    ],
    correctOrder: ["s1", "s2", "s3", "s4"],
  }
}

// Валидация данных CASE_ANALYSIS
function validateCaseAnalysisData(data: any, warnings: string[]): CaseAnalysisData {
  if (!data || typeof data !== "object") {
    return createDefaultCaseAnalysisData()
  }

  const options = Array.isArray(data.options)
    ? data.options.filter((o: any) => o && o.id && o.text !== undefined)
        .map((o: any) => ({
          id: o.id,
          text: o.text,
          isCorrect: Boolean(o.isCorrect),
          explanation: o.explanation || "",
        }))
    : []

  if (options.length < 2) {
    warnings.push("CASE_ANALYSIS вопрос имеет недостаточно вариантов")
    return createDefaultCaseAnalysisData()
  }

  const correctCount = options.filter((o: any) => o.isCorrect).length

  return {
    caseContent: data.caseContent || "",
    caseLabel: data.caseLabel || "Кейс для анализа",
    options,
    minCorrectRequired: data.minCorrectRequired || Math.max(1, correctCount),
  }
}

function createDefaultCaseAnalysisData(): CaseAnalysisData {
  return {
    caseContent: "",
    caseLabel: "Кейс для анализа",
    options: [
      { id: "o1", text: "Вариант 1", isCorrect: false, explanation: "" },
      { id: "o2", text: "Вариант 2", isCorrect: false, explanation: "" },
      { id: "o3", text: "Вариант 3", isCorrect: false, explanation: "" },
    ],
    minCorrectRequired: 1,
  }
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

// Получение конфигурации Claude AI из переменных окружения
export function getAIConfig(): AIParserConfig {
  return {
    enabled: process.env.AI_PARSER_ENABLED === "true",
    apiEndpoint: process.env.AI_API_ENDPOINT || "https://api.anthropic.com/v1/messages",
    apiKey: process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY,
    model: process.env.AI_MODEL || "claude-sonnet-4-5-20241022",
  }
}
