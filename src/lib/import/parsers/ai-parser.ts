// AI парсер для умного определения структуры через Claude (Anthropic)
// Поддерживает chunked parsing для больших файлов

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
  TrueFalseData,
  FillBlankData,
} from "../types"

// Claude API version
const ANTHROPIC_VERSION = "2023-06-01"

// Таймауты для API запросов (настраиваемые через env)
const API_CHECK_TIMEOUT_MS = parseInt(process.env.AI_CHECK_TIMEOUT_MS || "15000")   // 15 сек
const API_PARSE_TIMEOUT_MS = parseInt(process.env.AI_PARSE_TIMEOUT_MS || "900000")  // 15 мин по умолчанию (для 64k токенов)

// Лимиты контента (примерно 4 символа = 1 токен для русского текста)
const MAX_CONTENT_CHARS = parseInt(process.env.AI_MAX_CONTENT_CHARS || "100000")    // ~25k токенов
const CHARS_PER_TOKEN_ESTIMATE = 4  // Примерная оценка для русского текста

// Константы для chunked parsing (оптимизированы для надёжности + скорости)
const MAX_CHUNK_SIZE = 3000 // ~3KB - уменьшен для надёжности (меньше потерь при ошибке)
const MIN_CHUNK_SIZE = 500 // Минимальный размер chunk
const MAX_CONCURRENT_REQUESTS = 6 // Для файла ~15KB все 6 чанков обрабатываются одновременно

// Функция для логирования (можно отключить в production)
const DEBUG_AI = process.env.AI_DEBUG === "true"
function debugLog(...args: any[]) {
  if (DEBUG_AI) {
    console.log("[AI-Parser]", ...args)
  }
}

// Детальный промпт для AI парсинга с поддержкой всех типов вопросов
const AI_SYSTEM_PROMPT = `Ты - AI-ассистент для парсинга и улучшения образовательного контента.
Твоя задача - преобразовать текст в структурированный формат курса.

ВАЖНО: Если исходный текст слишком краткий или бедный по содержанию:
- Дополни его релевантной информацией по теме
- Добавь примеры и пояснения
- Сохрани исходную структуру, но обогати контент
- Убедись, что каждый модуль содержит достаточно материала для изучения

## ТИПЫ ВОПРОСОВ

Поддерживаются 6 типов вопросов. ОБЯЗАТЕЛЬНО используй разные типы для разнообразия!

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

### 5. TRUE_FALSE - Верно/Неверно
Серия утверждений, которые нужно оценить как верные или неверные.
\`\`\`json
{
  "question": "Определите верность утверждений о JavaScript",
  "type": "TRUE_FALSE",
  "options": [],
  "correctAnswer": 0,
  "data": {
    "statements": [
      {"id": "t1", "text": "JavaScript - это язык программирования", "isTrue": true, "explanation": "JavaScript - полноценный язык программирования"},
      {"id": "t2", "text": "JavaScript работает только в браузере", "isTrue": false, "explanation": "JavaScript может работать и на сервере (Node.js)"},
      {"id": "t3", "text": "Переменные в JavaScript типизированы статически", "isTrue": false, "explanation": "JavaScript - язык с динамической типизацией"}
    ]
  }
}
\`\`\`

### 6. FILL_BLANK - Заполни пропуск
Текст с пропусками, которые нужно заполнить выбором из вариантов.
\`\`\`json
{
  "question": "Заполните пропуски в описании CSS",
  "type": "FILL_BLANK",
  "options": [],
  "correctAnswer": 0,
  "data": {
    "textWithBlanks": "CSS расшифровывается как {{1}} Style Sheets. Он используется для {{2}} веб-страниц.",
    "blanks": [
      {"id": "1", "correctAnswer": "Cascading", "options": ["Cascading", "Creative", "Computer", "Complex"]},
      {"id": "2", "correctAnswer": "стилизации", "options": ["программирования", "стилизации", "разметки", "анимации"]}
    ]
  }
}
\`\`\`

## РАСПРЕДЕЛЕНИЕ ТИПОВ ВОПРОСОВ

ОБЯЗАТЕЛЬНО используй разные типы вопросов в каждом модуле:
- Если 3-4 вопроса: минимум 2 разных типа
- Если 5-6 вопросов: минимум 3 разных типа
- Если 7+ вопросов: минимум 4 разных типа

Рекомендуемое распределение по модулю:
- 40% SINGLE_CHOICE (базовые вопросы)
- 20% MATCHING или ORDERING (структурирование знаний)
- 20% TRUE_FALSE (проверка понимания концепций)
- 20% FILL_BLANK или CASE_ANALYSIS (применение знаний)

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
7. **РАЗНООБРАЗИЕ ВОПРОСОВ**: ОБЯЗАТЕЛЬНО используй разные типы (SINGLE_CHOICE, MATCHING, ORDERING, CASE_ANALYSIS, TRUE_FALSE, FILL_BLANK). НЕ делай все вопросы одного типа!
8. **Покрытие темы**: вопросы должны охватывать разные аспекты изученного материала, а не повторять одну и ту же тему
9. **Улучшение**: если контент бедный - дополни примерами, пояснениями, деталями
10. **requiresSubmission**: true для PROJECT, true для PRACTICE с практическими заданиями
11. **Формулировки**: вопросы должны быть чёткими, однозначными и проверять понимание, а не запоминание
12. **Возврат**: ТОЛЬКО валидный JSON без комментариев и markdown-разметки вокруг`

const AI_USER_PROMPT = `Преобразуй следующий образовательный контент в структурированный курс.

Если контент слишком краткий - дополни его полезной информацией по теме.

ВАЖНО по вопросам:
- Создай РАЗНООБРАЗНЫЕ типы вопросов (SINGLE_CHOICE, MATCHING, ORDERING, CASE_ANALYSIS, TRUE_FALSE, FILL_BLANK)
- НЕ делай все вопросы типа SINGLE_CHOICE - обязательно используй минимум 2-3 разных типа
- Вопросы должны охватывать разные аспекты темы, не повторяться

---
{content}
---

Верни ТОЛЬКО JSON согласно формату (без \`\`\`json обёртки).`

// Промпт для парсинга отдельного модуля (для chunked parsing)
const AI_MODULE_SYSTEM_PROMPT = `Ты - AI-ассистент для парсинга части образовательного контента.
Твоя задача - преобразовать текст в один или несколько модулей курса.

Формат вывода (JSON):
{
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
}

Правила:
1. Если есть вопросы с вариантами ответов - тип PRACTICE
2. Если есть задание на создание чего-то - тип PROJECT
3. Остальное - THEORY
4. Slug генерируй из названия (транслитерация, lowercase, дефисы)
5. points: THEORY=50, PRACTICE=75, PROJECT=100
6. Сохрани весь контент в формате Markdown
7. Верни ТОЛЬКО валидный JSON без комментариев`

const AI_MODULE_USER_PROMPT = `Преобразуй следующий фрагмент в модули:

---
{content}
---

Это часть {chunkIndex} из {totalChunks}. Верни JSON с модулями.`

// Промпт для определения метаданных курса
const AI_METADATA_PROMPT = `Проанализируй начало документа и определи метаданные курса:

---
{content}
---

Верни ТОЛЬКО JSON:
{
  "title": "Название курса",
  "slug": "nazvanie-kursa",
  "subtitle": "Краткое описание",
  "description": "Полное описание курса",
  "icon": "📚",
  "color": "#6366f1"
}`

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
    // Обработка таймаута
    if (e instanceof Error && e.name === "AbortError") {
      return {
        available: false,
        error: `Таймаут: AI API не ответил за ${API_CHECK_TIMEOUT_MS / 1000} секунд`,
      }
    }

    // Улучшаем сообщения об ошибках для более понятного отображения
    let errorMessage = e instanceof Error ? e.message : "unknown"

    if (errorMessage === "fetch failed" || errorMessage.includes("ECONNREFUSED")) {
      errorMessage = "Не удалось подключиться к AI API. Проверьте настройки сети и доступность сервера."
    } else if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timeout")) {
      errorMessage = "Превышено время ожидания ответа."
    } else if (errorMessage.includes("ENOTFOUND")) {
      errorMessage = "AI API endpoint не найден. Проверьте URL."
    }

    return {
      available: false,
      error: `Ошибка соединения: ${errorMessage}`,
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

  // Проверка и ограничение размера контента
  const contentLength = content.length
  const estimatedTokens = Math.ceil(contentLength / CHARS_PER_TOKEN_ESTIMATE)

  debugLog(`Размер контента: ${contentLength} символов (~${estimatedTokens} токенов)`)
  console.log(`[AI-Parser] Размер контента: ${contentLength} символов (~${estimatedTokens} токенов)`)

  let processedContent = content
  if (contentLength > MAX_CONTENT_CHARS) {
    console.log(`[AI-Parser] Контент слишком большой (${contentLength} > ${MAX_CONTENT_CHARS}), обрезаем...`)
    processedContent = content.substring(0, MAX_CONTENT_CHARS)
    warnings.push(`Контент обрезан с ${contentLength} до ${MAX_CONTENT_CHARS} символов (лимит API)`)
  }

  try {
    console.log(`[AI-Parser] Отправка запроса к ${config.apiEndpoint}...`)
    console.log(`[AI-Parser] Модель: ${config.model || "claude-sonnet-4-5-20241022"}`)
    console.log(`[AI-Parser] Таймаут: ${API_PARSE_TIMEOUT_MS / 1000} секунд`)

    const startTime = Date.now()

    // Создаём AbortController для таймаута
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.log(`[AI-Parser] Таймаут! Прошло ${API_PARSE_TIMEOUT_MS / 1000} секунд, отменяем запрос...`)
      controller.abort()
    }, API_PARSE_TIMEOUT_MS)

    // Используем максимальный лимит токенов для полноценного обогащения контента
    // Claude Sonnet 4.5 поддерживает до 64k output tokens
    const maxTokens = parseInt(process.env.AI_MAX_OUTPUT_TOKENS || "64000")
    console.log(`[AI-Parser] max_tokens: ${maxTokens}, контент: ${processedContent.length} символов`)

    const requestBody = {
      model: config.model || "claude-sonnet-4-5-20241022",
      max_tokens: maxTokens,
      system: AI_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: AI_USER_PROMPT.replace("{content}", processedContent) },
      ],
    }

    debugLog("Размер тела запроса:", JSON.stringify(requestBody).length, "байт")

    const response = await fetch(config.apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const elapsedTime = Date.now() - startTime
    console.log(`[AI-Parser] Ответ получен за ${(elapsedTime / 1000).toFixed(1)} секунд`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[AI-Parser] Ошибка API: ${response.status}`, errorText.substring(0, 500))
      errors.push(`AI API ошибка: ${response.status} - ${errorText.substring(0, 200)}`)
      return { success: false, trails: [], warnings, errors, parseMethod: "ai" }
    }

    console.log(`[AI-Parser] Читаем JSON ответ...`)
    const data = await response.json()

    // Claude API response format: content[0].text
    const aiResponse = data.content?.[0]?.text

    if (!aiResponse) {
      console.log(`[AI-Parser] Пустой ответ от AI:`, JSON.stringify(data).substring(0, 500))
      errors.push("AI не вернул ответ")
      return { success: false, trails: [], warnings, errors, parseMethod: "ai" }
    }

    console.log(`[AI-Parser] Получен ответ: ${aiResponse.length} символов`)
    console.log(`[AI-Parser] Stop reason: ${data.stop_reason}`)
    console.log(`[AI-Parser] Usage: input=${data.usage?.input_tokens}, output=${data.usage?.output_tokens}`)

    // Проверяем, был ли ответ обрезан из-за лимита токенов
    const wasTruncated = data.stop_reason === "max_tokens"
    if (wasTruncated) {
      console.log(`[AI-Parser] ВНИМАНИЕ: Ответ был обрезан из-за лимита токенов!`)
      warnings.push("Ответ AI был обрезан из-за лимита токенов. Пытаемся восстановить данные.")
    }

    // Извлечение JSON из ответа (убираем возможные ```json обёртки)
    let jsonStr = aiResponse.trim()

    // Удаляем markdown code block если есть
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
    }

    // Находим начало JSON
    const jsonStartIndex = jsonStr.indexOf("{")
    if (jsonStartIndex === -1) {
      errors.push("AI вернул невалидный JSON")
      warnings.push(`AI ответ: ${aiResponse.substring(0, 300)}...`)
      return { success: false, trails: [], warnings, errors, parseMethod: "ai" }
    }

    // Берём всё от первой { до конца (без поиска закрывающей - она может быть обрезана)
    let jsonCandidate = jsonStr.substring(jsonStartIndex)

    // Пытаемся распарсить JSON, при ошибке - пробуем починить
    let parsed: any
    try {
      parsed = JSON.parse(jsonCandidate)
    } catch (parseError) {
      console.log(`[AI-Parser] JSON невалиден (${parseError instanceof Error ? parseError.message : parseError}), пытаемся починить...`)

      // Если ответ был обрезан - используем агрессивный ремонт
      if (wasTruncated) {
        console.log(`[AI-Parser] Ответ обрезан, применяем агрессивное восстановление...`)
      }

      const repaired = repairJSON(jsonCandidate)
      if (repaired) {
        try {
          parsed = JSON.parse(repaired)
          warnings.push("JSON от AI был повреждён и автоматически восстановлен")
          console.log(`[AI-Parser] JSON успешно восстановлен`)
        } catch (repairError) {
          // Если ремонт не помог - пробуем извлечь частичные данные
          console.log(`[AI-Parser] Ремонт JSON не помог (${repairError instanceof Error ? repairError.message : repairError}), пытаемся извлечь частичные данные...`)
          const partialData = extractPartialJSON(jsonCandidate)
          if (partialData) {
            parsed = partialData
            warnings.push("JSON от AI был сильно повреждён, извлечены частичные данные")
            console.log(`[AI-Parser] Извлечены частичные данные`)
          } else {
            // Последняя попытка - ищем завершённые trail'ы
            console.log(`[AI-Parser] Пробуем найти завершённые trail'ы...`)
            const recoveredTrails = recoverCompletedTrails(jsonCandidate)
            if (recoveredTrails.length > 0) {
              parsed = { trails: recoveredTrails }
              warnings.push(`Восстановлено ${recoveredTrails.length} trail(ов) из обрезанного ответа`)
              console.log(`[AI-Parser] Восстановлено ${recoveredTrails.length} trail(ов)`)
            } else {
              throw parseError
            }
          }
        }
      } else {
        // repairJSON вернул null - пробуем extractPartialJSON напрямую
        console.log(`[AI-Parser] repairJSON вернул null, пробуем extractPartialJSON...`)
        const partialData = extractPartialJSON(jsonCandidate)
        if (partialData) {
          parsed = partialData
          warnings.push("JSON от AI был сильно повреждён, извлечены частичные данные")
        } else {
          const recoveredTrails = recoverCompletedTrails(jsonCandidate)
          if (recoveredTrails.length > 0) {
            parsed = { trails: recoveredTrails }
            warnings.push(`Восстановлено ${recoveredTrails.length} trail(ов) из обрезанного ответа`)
          } else {
            throw parseError
          }
        }
      }
    }
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
    // Обработка таймаута
    if (e instanceof Error && e.name === "AbortError") {
      console.log(`[AI-Parser] Таймаут после ${API_PARSE_TIMEOUT_MS / 1000} секунд`)
      errors.push(`Таймаут: AI парсер не ответил за ${API_PARSE_TIMEOUT_MS / 1000} секунд. Попробуйте файл меньшего размера или увеличьте AI_PARSE_TIMEOUT_MS.`)
    } else {
      // Улучшаем сообщения об ошибках для более понятного отображения пользователю
      let errorMessage = e instanceof Error ? e.message : "unknown"

      // Расшифровываем типичные ошибки сети
      if (errorMessage === "fetch failed" || errorMessage.includes("ECONNREFUSED")) {
        errorMessage = "Не удалось подключиться к AI API. Проверьте настройки сети и доступность API."
      } else if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timeout")) {
        errorMessage = "Превышено время ожидания ответа от AI API."
      } else if (errorMessage.includes("ENOTFOUND")) {
        errorMessage = "AI API endpoint не найден. Проверьте URL в настройках."
      }

      console.log(`[AI-Parser] Ошибка:`, errorMessage)
      errors.push(`Ошибка AI парсинга: ${errorMessage}`)
    }
    return { success: false, trails: [], warnings, errors, parseMethod: "ai" }
  }
}

// ============================================
// CHUNKED PARSING - для больших файлов
// ============================================

interface ContentChunk {
  index: number
  content: string
  isFirst: boolean
  isLast: boolean
}

// Разделение контента на логические части
function splitContentIntoChunks(content: string): ContentChunk[] {
  const chunks: ContentChunk[] = []

  console.log(`[AI-Parser] splitContentIntoChunks: входной размер ${content.length} символов`)

  // Если контент маленький - возвращаем как есть
  if (content.length <= MAX_CHUNK_SIZE) {
    console.log(`[AI-Parser] Контент меньше MAX_CHUNK_SIZE, возвращаем как один chunk`)
    return [{
      index: 0,
      content,
      isFirst: true,
      isLast: true,
    }]
  }

  // Паттерны для определения СИЛЬНЫХ границ секций (предпочтительные точки разбиения)
  const strongBoundaryPatterns = [
    /^#{1,2}\s+.+$/gm, // Markdown заголовки h1, h2
    /^[А-ЯA-Z][А-Яа-яA-Za-z\s]{5,80}$/gm, // Заголовки на отдельной строке (капитализированные)
    /^\d+\.\s+[А-ЯA-Z].+$/gm, // Нумерованные заголовки типа "1. Введение"
  ]

  // Паттерны для СЛАБЫХ границ (используем если нет сильных)
  const weakBoundaryPatterns = [
    /^#{3,6}\s+.+$/gm, // Markdown заголовки h3-h6
    /^[-*]\s+\*\*[^*]+\*\*/gm, // Жирные пункты списка
    /^---+$/gm, // Горизонтальные разделители
  ]

  // Собираем все границы с приоритетами
  interface Boundary {
    pos: number
    priority: number // 1 = сильная, 2 = слабая, 3 = параграф
  }

  const boundaries: Boundary[] = [{ pos: 0, priority: 1 }]

  // Сильные границы
  for (const pattern of strongBoundaryPatterns) {
    let match
    const patternCopy = new RegExp(pattern.source, pattern.flags)
    while ((match = patternCopy.exec(content)) !== null) {
      boundaries.push({ pos: match.index, priority: 1 })
    }
  }

  // Слабые границы
  for (const pattern of weakBoundaryPatterns) {
    let match
    const patternCopy = new RegExp(pattern.source, pattern.flags)
    while ((match = patternCopy.exec(content)) !== null) {
      boundaries.push({ pos: match.index, priority: 2 })
    }
  }

  // Границы по двойным переносам строк (параграфы)
  let pos = 0
  while ((pos = content.indexOf("\n\n", pos)) !== -1) {
    boundaries.push({ pos: pos + 2, priority: 3 }) // +2 чтобы начать после переноса
    pos += 2
  }

  // Сортируем по позиции
  boundaries.sort((a, b) => a.pos - b.pos)

  // Удаляем дубликаты (оставляем с наименьшим priority = наивысшим приоритетом)
  const uniqueBoundaries: Boundary[] = []
  for (const b of boundaries) {
    const existing = uniqueBoundaries.find(ub => Math.abs(ub.pos - b.pos) < 10)
    if (!existing) {
      uniqueBoundaries.push(b)
    } else if (b.priority < existing.priority) {
      existing.priority = b.priority
      existing.pos = b.pos
    }
  }

  console.log(`[AI-Parser] Найдено ${uniqueBoundaries.length} потенциальных границ`)

  // Группируем в chunks
  let currentChunkStart = 0

  while (currentChunkStart < content.length) {
    // Ищем лучшую границу для следующего chunk
    let bestBoundary: Boundary | null = null

    for (const boundary of uniqueBoundaries) {
      if (boundary.pos <= currentChunkStart) continue

      const chunkSize = boundary.pos - currentChunkStart

      // Пропускаем слишком маленькие chunks
      if (chunkSize < MIN_CHUNK_SIZE) continue

      // Если размер в пределах допустимого - это кандидат
      if (chunkSize <= MAX_CHUNK_SIZE) {
        // Предпочитаем границы с более высоким приоритетом
        if (!bestBoundary ||
            boundary.priority < bestBoundary.priority ||
            (boundary.priority === bestBoundary.priority && chunkSize > (bestBoundary.pos - currentChunkStart))) {
          bestBoundary = boundary
        }
      }

      // Если уже превысили MAX_CHUNK_SIZE - используем последнюю хорошую границу
      if (chunkSize > MAX_CHUNK_SIZE) {
        break
      }
    }

    if (bestBoundary) {
      const chunkContent = content.slice(currentChunkStart, bestBoundary.pos).trim()
      if (chunkContent.length > 0) {
        chunks.push({
          index: chunks.length,
          content: chunkContent,
          isFirst: currentChunkStart === 0,
          isLast: false,
        })
      }
      currentChunkStart = bestBoundary.pos
    } else {
      // Нет подходящей границы - разбиваем принудительно
      const remaining = content.slice(currentChunkStart).trim()
      if (remaining.length > 0) {
        if (remaining.length > MAX_CHUNK_SIZE) {
          console.log(`[AI-Parser] Принудительное разбиение оставшихся ${remaining.length} символов`)
          const parts = splitLargeChunk(remaining)
          for (const part of parts) {
            chunks.push({
              index: chunks.length,
              content: part,
              isFirst: chunks.length === 0,
              isLast: false,
            })
          }
        } else {
          chunks.push({
            index: chunks.length,
            content: remaining,
            isFirst: chunks.length === 0,
            isLast: true,
          })
        }
      }
      break
    }
  }

  // Обновляем флаги isFirst/isLast
  if (chunks.length > 0) {
    chunks[0].isFirst = true
    chunks[chunks.length - 1].isLast = true
  }

  console.log(`[AI-Parser] Создано ${chunks.length} chunks: ${chunks.map(c => c.content.length).join(', ')} символов`)

  return chunks
}

// Принудительное разделение большого блока
function splitLargeChunk(content: string): string[] {
  const parts: string[] = []
  let start = 0

  while (start < content.length) {
    let end = Math.min(start + MAX_CHUNK_SIZE, content.length)

    // Пытаемся найти хорошую точку разрыва (только если не в конце)
    if (end < content.length) {
      const searchStart = start + MIN_CHUNK_SIZE
      const searchArea = content.slice(searchStart, end + 200) // +200 для поиска рядом с границей

      // Приоритеты точек разрыва (от лучшего к худшему)
      const breakPoints = [
        // 1. Двойной перенос (конец абзаца)
        { pattern: /\n\n/g, offset: 2 },
        // 2. Markdown заголовок
        { pattern: /\n#{1,6}\s+/g, offset: 1 },
        // 3. Нумерованный список
        { pattern: /\n\d+\.\s+/g, offset: 1 },
        // 4. Маркированный список
        { pattern: /\n[-*]\s+/g, offset: 1 },
        // 5. Конец предложения с переносом
        { pattern: /[.!?]\s*\n/g, offset: 0 },
        // 6. Конец предложения
        { pattern: /[.!?]\s+/g, offset: 0 },
      ]

      let bestBreak = -1

      for (const bp of breakPoints) {
        let match
        let lastMatch = -1
        while ((match = bp.pattern.exec(searchArea)) !== null) {
          const absolutePos = searchStart + match.index + match[0].length - bp.offset
          if (absolutePos <= end && absolutePos > start + MIN_CHUNK_SIZE) {
            lastMatch = absolutePos
          }
        }
        if (lastMatch > 0) {
          bestBreak = lastMatch
          break // Нашли хорошую точку разрыва
        }
      }

      if (bestBreak > 0) {
        end = bestBreak
      }
    }

    const part = content.slice(start, end).trim()
    if (part.length > 0) {
      parts.push(part)
    }
    start = end

    // Пропускаем пробелы в начале следующего chunk
    while (start < content.length && /\s/.test(content[start])) {
      start++
    }
  }

  return parts.filter(p => p.length > 0)
}

// Парсинг одного chunk через AI
async function parseChunkWithAI(
  chunk: ContentChunk,
  totalChunks: number,
  config: AIParserConfig
): Promise<{ modules: any[]; error?: string }> {
  try {
    console.log(`[AI-Parser] Обработка части ${chunk.index + 1}/${totalChunks}, размер: ${chunk.content.length} символов`)

    const response = await fetch(config.apiEndpoint!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey!,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: config.model || "claude-sonnet-4-5-20241022",
        max_tokens: 16000, // Увеличен лимит для более полных ответов
        system: AI_MODULE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: AI_MODULE_USER_PROMPT
              .replace("{content}", chunk.content)
              .replace("{chunkIndex}", String(chunk.index + 1))
              .replace("{totalChunks}", String(totalChunks))
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[AI-Parser] Часть ${chunk.index + 1}: API ошибка ${response.status}`)
      return { modules: [], error: `API ошибка: ${response.status}` }
    }

    const data = await response.json()
    // Anthropic API format: content[0].text
    const aiResponse = data.content?.[0]?.text

    if (!aiResponse) {
      console.log(`[AI-Parser] Часть ${chunk.index + 1}: пустой ответ от AI`)
      return { modules: [], error: "AI не вернул ответ" }
    }

    console.log(`[AI-Parser] Часть ${chunk.index + 1}: получен ответ ${aiResponse.length} символов, stop_reason: ${data.stop_reason}`)

    // Проверяем, был ли ответ обрезан
    const wasTruncated = data.stop_reason === "max_tokens"
    if (wasTruncated) {
      console.log(`[AI-Parser] Часть ${chunk.index + 1}: ВНИМАНИЕ - ответ обрезан!`)
    }

    // Извлечение JSON с удалением markdown обёртки
    let jsonStr = aiResponse.trim()

    // Удаляем markdown code block если есть
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
    }

    // Находим начало JSON
    const jsonStartIndex = jsonStr.indexOf("{")
    if (jsonStartIndex === -1) {
      console.log(`[AI-Parser] Часть ${chunk.index + 1}: не найден JSON в ответе`)
      return { modules: [], error: "Невалидный JSON - не найдена открывающая скобка" }
    }

    let jsonCandidate = jsonStr.substring(jsonStartIndex)

    // Пытаемся распарсить JSON
    let parsed: any
    try {
      parsed = JSON.parse(jsonCandidate)
    } catch (parseError) {
      const errorMsg = parseError instanceof Error ? parseError.message : String(parseError)
      console.log(`[AI-Parser] Часть ${chunk.index + 1}: ошибка парсинга JSON: ${errorMsg}`)
      console.log(`[AI-Parser] Часть ${chunk.index + 1}: пытаемся восстановить JSON...`)

      // Пробуем восстановить JSON
      const repaired = repairJSON(jsonCandidate)
      if (repaired) {
        try {
          parsed = JSON.parse(repaired)
          console.log(`[AI-Parser] Часть ${chunk.index + 1}: JSON успешно восстановлен`)
        } catch (repairError) {
          // Пробуем извлечь модули напрямую из текста
          console.log(`[AI-Parser] Часть ${chunk.index + 1}: repairJSON не помог, пробуем extractModulesFromText...`)
          const extractedModules = extractModulesFromText(jsonCandidate)
          if (extractedModules.length > 0) {
            console.log(`[AI-Parser] Часть ${chunk.index + 1}: извлечено ${extractedModules.length} модулей из текста`)
            return { modules: extractedModules }
          }
          return { modules: [], error: errorMsg }
        }
      } else {
        // repairJSON вернул null, пробуем extractModulesFromText
        console.log(`[AI-Parser] Часть ${chunk.index + 1}: repairJSON вернул null, пробуем extractModulesFromText...`)
        const extractedModules = extractModulesFromText(jsonCandidate)
        if (extractedModules.length > 0) {
          console.log(`[AI-Parser] Часть ${chunk.index + 1}: извлечено ${extractedModules.length} модулей из текста`)
          return { modules: extractedModules }
        }
        return { modules: [], error: errorMsg }
      }
    }

    const modules = parsed.modules || []
    console.log(`[AI-Parser] Часть ${chunk.index + 1}: успешно получено ${modules.length} модулей`)
    return { modules }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "unknown"
    console.log(`[AI-Parser] Часть ${chunk.index + 1}: исключение: ${errorMsg}`)
    return {
      modules: [],
      error: errorMsg
    }
  }
}

// Извлечение модулей из повреждённого JSON текста
function extractModulesFromText(jsonStr: string): any[] {
  const modules: any[] = []

  try {
    // Ищем паттерн "modules": [ и извлекаем модули по одному
    const modulesMatch = jsonStr.match(/"modules"\s*:\s*\[/)
    if (!modulesMatch || modulesMatch.index === undefined) {
      // Пробуем найти отдельные объекты модулей
      return extractIndividualModules(jsonStr)
    }

    const startPos = modulesMatch.index + modulesMatch[0].length
    const content = jsonStr.substring(startPos)

    let depth = 0
    let inString = false
    let prevChar = ""
    let moduleStart = -1

    for (let i = 0; i < content.length; i++) {
      const char = content[i]

      if (char === '"' && prevChar !== "\\") {
        inString = !inString
      }

      if (!inString) {
        if (char === "{") {
          if (depth === 0) {
            moduleStart = i
          }
          depth++
        } else if (char === "}") {
          depth--
          if (depth === 0 && moduleStart !== -1) {
            const moduleJson = content.substring(moduleStart, i + 1)
            try {
              const mod = JSON.parse(moduleJson)
              if (mod.title || mod.content) {
                modules.push(mod)
              }
            } catch {
              // Пробуем починить этот отдельный модуль
              const repairedModule = repairJSON(moduleJson)
              if (repairedModule) {
                try {
                  const mod = JSON.parse(repairedModule)
                  if (mod.title || mod.content) {
                    modules.push(mod)
                  }
                } catch {
                  // Модуль слишком повреждён
                }
              }
            }
            moduleStart = -1
          }
        } else if (char === "]" && depth === 0) {
          break
        }
      }
      prevChar = char
    }
  } catch (e) {
    console.log(`[AI-Parser] extractModulesFromText error:`, e)
  }

  return modules
}

// Извлечение отдельных модулей без массива modules
function extractIndividualModules(jsonStr: string): any[] {
  const modules: any[] = []

  // Ищем объекты с полем "title"
  const titlePattern = /\{\s*"title"\s*:/g
  let match

  while ((match = titlePattern.exec(jsonStr)) !== null) {
    const startPos = match.index
    let depth = 0
    let inString = false
    let prevChar = ""

    for (let i = startPos; i < jsonStr.length; i++) {
      const char = jsonStr[i]

      if (char === '"' && prevChar !== "\\") {
        inString = !inString
      }

      if (!inString) {
        if (char === "{") depth++
        else if (char === "}") {
          depth--
          if (depth === 0) {
            const moduleJson = jsonStr.substring(startPos, i + 1)
            try {
              const mod = JSON.parse(moduleJson)
              if (mod.title && (mod.content !== undefined || mod.type !== undefined)) {
                modules.push(mod)
              }
            } catch {
              const repaired = repairJSON(moduleJson)
              if (repaired) {
                try {
                  const mod = JSON.parse(repaired)
                  if (mod.title) {
                    modules.push(mod)
                  }
                } catch {
                  // Пропускаем
                }
              }
            }
            break
          }
        }
      }
      prevChar = char
    }
  }

  return modules
}

// Получение метаданных курса из первой части
async function parseMetadataWithAI(
  content: string,
  config: AIParserConfig
): Promise<{ metadata: Partial<ParsedTrail>; error?: string }> {
  try {
    // Берём первые 500 символов для определения метаданных
    const preview = content.slice(0, 500)

    const response = await fetch(config.apiEndpoint!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey!,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: config.model || "claude-sonnet-4-5-20241022",
        max_tokens: 1000,
        messages: [
          { role: "user", content: AI_METADATA_PROMPT.replace("{content}", preview) },
        ],
      }),
    })

    if (!response.ok) {
      return { metadata: {}, error: "Не удалось получить метаданные" }
    }

    const data = await response.json()
    // Anthropic API format: content[0].text
    const aiResponse = data.content?.[0]?.text

    const jsonMatch = aiResponse?.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { metadata: {}, error: "Невалидный JSON метаданных" }
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      metadata: {
        title: parsed.title,
        slug: parsed.slug || generateSlugFromTitle(parsed.title || "course"),
        subtitle: parsed.subtitle,
        description: parsed.description,
        icon: parsed.icon || "📚",
        color: isValidColor(parsed.color) ? parsed.color : "#6366f1",
      }
    }
  } catch (e) {
    return { metadata: {}, error: e instanceof Error ? e.message : "unknown" }
  }
}

// Основная функция chunked parsing
export async function parseWithAIChunked(
  content: string,
  config: AIParserConfig,
  onProgress?: (current: number, total: number, status: string) => void
): Promise<ParseResult> {
  const warnings: string[] = []
  const errors: string[] = []

  if (!config.enabled || !config.apiEndpoint || !config.apiKey) {
    errors.push("AI API не настроен")
    return { success: false, trails: [], warnings, errors, parseMethod: "ai" }
  }

  // Разбиваем на chunks
  const chunks = splitContentIntoChunks(content)
  const totalChunks = chunks.length

  onProgress?.(0, totalChunks + 1, "Анализ структуры...")

  // Если только 1 chunk - используем обычный парсинг
  if (totalChunks === 1) {
    onProgress?.(1, 1, "Обработка...")
    return parseWithAI(content, config)
  }

  warnings.push(`Файл разбит на ${totalChunks} частей для обработки`)

  // Параллельно: получаем метаданные и обрабатываем chunks
  onProgress?.(0, totalChunks + 1, "Определение метаданных курса...")

  const [metadataResult, chunkResults] = await Promise.all([
    parseMetadataWithAI(content, config),
    processChunksInBatches(chunks, config, totalChunks, onProgress),
  ])

  // Собираем все модули
  const allModules: any[] = []
  let successfulChunks = 0

  for (let i = 0; i < chunkResults.length; i++) {
    const result = chunkResults[i] as { modules: any[]; error?: string }
    if (result.error) {
      warnings.push(`Часть ${i + 1}: ${result.error}`)
    } else if (result.modules.length > 0) {
      allModules.push(...result.modules)
      successfulChunks++
    }
  }

  onProgress?.(totalChunks + 1, totalChunks + 1, "Объединение результатов...")

  if (allModules.length === 0) {
    errors.push("Не удалось распарсить ни одной части")
    return { success: false, trails: [], warnings, errors, parseMethod: "ai" }
  }

  // Формируем trail
  const trail: ParsedTrail = {
    title: metadataResult.metadata.title || "Импортированный курс",
    slug: metadataResult.metadata.slug || generateSlugFromTitle("imported-course"),
    subtitle: metadataResult.metadata.subtitle || "",
    description: metadataResult.metadata.description || "",
    icon: metadataResult.metadata.icon || "📚",
    color: metadataResult.metadata.color || "#6366f1",
    modules: [],
  }

  // Валидируем и добавляем модули
  for (const mod of allModules) {
    if (!mod || typeof mod !== "object") continue

    trail.modules.push({
      title: mod.title || "Без названия",
      slug: mod.slug || generateSlugFromTitle(mod.title || "module"),
      type: validateModuleType(mod.type),
      points: typeof mod.points === "number" ? mod.points : 50,
      description: mod.description || "",
      content: mod.content || "",
      questions: validateQuestions(mod.questions || [], warnings),
      level: mod.level,
      duration: mod.duration,
    })
  }

  warnings.push(`Успешно обработано ${successfulChunks} из ${totalChunks} частей`)

  return {
    success: trail.modules.length > 0,
    trails: [trail],
    warnings,
    errors,
    parseMethod: "ai",
  }
}

// Обработка chunks батчами для ограничения параллельных запросов
async function processChunksInBatches(
  chunks: ContentChunk[],
  config: AIParserConfig,
  totalChunks: number,
  onProgress?: (current: number, total: number, status: string) => void
): Promise<{ modules: any[]; error?: string }[]> {
  const results: { modules: any[]; error?: string }[] = []
  let completed = 0

  // Обрабатываем батчами
  for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_REQUESTS) {
    const batch = chunks.slice(i, i + MAX_CONCURRENT_REQUESTS)

    const batchPromises = batch.map(async (chunk) => {
      const result = await parseChunkWithAI(chunk, totalChunks, config)
      completed++
      onProgress?.(completed, totalChunks + 1, `Обработка части ${completed}/${totalChunks}...`)
      return result
    })

    // Ждём завершения батча перед следующим
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
  }

  return results
}

// ============================================
// ВАЛИДАЦИЯ
// ============================================

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
  const validTypes: QuestionType[] = ["SINGLE_CHOICE", "MATCHING", "ORDERING", "CASE_ANALYSIS", "TRUE_FALSE", "FILL_BLANK"]
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

      case "TRUE_FALSE":
        validQuestion.data = validateTrueFalseData(q.data, warnings)
        break

      case "FILL_BLANK":
        validQuestion.data = validateFillBlankData(q.data, warnings)
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

  // Проверка разнообразия типов вопросов
  if (result.length >= 3) {
    const typeCount = new Set(result.map(q => q.type)).size
    if (typeCount === 1) {
      warnings.push(`Все ${result.length} вопросов имеют один тип (${result[0].type}). Рекомендуется разнообразить типы вопросов.`)
    }
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

// Валидация данных TRUE_FALSE
function validateTrueFalseData(data: any, warnings: string[]): TrueFalseData {
  if (!data || typeof data !== "object") {
    return createDefaultTrueFalseData()
  }

  const statements = Array.isArray(data.statements)
    ? data.statements.filter((s: any) => s && s.id && typeof s.text === "string" && typeof s.isTrue === "boolean")
        .map((s: any) => ({
          id: s.id,
          text: s.text,
          isTrue: Boolean(s.isTrue),
          explanation: s.explanation || undefined,
        }))
    : []

  if (statements.length < 2) {
    warnings.push("TRUE_FALSE вопрос имеет недостаточно утверждений")
    return createDefaultTrueFalseData()
  }

  return { statements }
}

function createDefaultTrueFalseData(): TrueFalseData {
  return {
    statements: [
      { id: "t1", text: "Утверждение 1", isTrue: true, explanation: "Пояснение к утверждению 1" },
      { id: "t2", text: "Утверждение 2", isTrue: false, explanation: "Пояснение к утверждению 2" },
      { id: "t3", text: "Утверждение 3", isTrue: true, explanation: "Пояснение к утверждению 3" },
    ],
  }
}

// Валидация данных FILL_BLANK
function validateFillBlankData(data: any, warnings: string[]): FillBlankData {
  if (!data || typeof data !== "object") {
    return createDefaultFillBlankData()
  }

  const textWithBlanks = typeof data.textWithBlanks === "string" ? data.textWithBlanks : ""

  const blanks = Array.isArray(data.blanks)
    ? data.blanks.filter((b: any) => b && b.id && typeof b.correctAnswer === "string" && Array.isArray(b.options))
        .map((b: any) => ({
          id: b.id,
          correctAnswer: b.correctAnswer,
          options: b.options.filter((o: any) => typeof o === "string"),
        }))
    : []

  // Проверяем, что текст содержит метки для пропусков
  const blankMarkers = textWithBlanks.match(/\{\{\d+\}\}/g) || []

  if (!textWithBlanks || blanks.length < 1 || blankMarkers.length === 0) {
    warnings.push("FILL_BLANK вопрос имеет некорректный формат")
    return createDefaultFillBlankData()
  }

  // Проверяем, что количество меток соответствует количеству blanks
  if (blankMarkers.length !== blanks.length) {
    warnings.push(`FILL_BLANK: количество меток (${blankMarkers.length}) не совпадает с количеством blanks (${blanks.length})`)
  }

  // Проверяем, что каждый blank имеет минимум 2 варианта
  for (const blank of blanks) {
    if (blank.options.length < 2) {
      warnings.push(`FILL_BLANK: пропуск ${blank.id} имеет менее 2 вариантов`)
    }
    // Проверяем, что correctAnswer есть среди options
    if (!blank.options.includes(blank.correctAnswer)) {
      blank.options.unshift(blank.correctAnswer)
    }
  }

  return { textWithBlanks, blanks }
}

function createDefaultFillBlankData(): FillBlankData {
  return {
    textWithBlanks: "Это {{1}} текст с {{2}} пропусками.",
    blanks: [
      { id: "1", correctAnswer: "пример", options: ["пример", "образец", "шаблон", "тест"] },
      { id: "2", correctAnswer: "двумя", options: ["двумя", "тремя", "несколькими", "многими"] },
    ],
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

// Функция для ремонта битого JSON (улучшенная версия)
function repairJSON(jsonStr: string): string | null {
  try {
    let repaired = jsonStr
    console.log(`[AI-Parser] repairJSON: входная длина ${repaired.length}`)

    // 0. Если JSON обрезан посередине строки - найдём точку обрезки
    // Ищем последнюю валидную позицию (закрытый объект/массив)
    const lastValidEnd = findLastValidPosition(repaired)
    if (lastValidEnd > 0 && lastValidEnd < repaired.length - 10) {
      console.log(`[AI-Parser] Обнаружена обрезка на позиции ${lastValidEnd}, обрезаем хвост`)
      repaired = repaired.substring(0, lastValidEnd)
    }

    // 1. Удаляем trailing commas перед закрывающими скобками
    repaired = repaired.replace(/,(\s*[\]}])/g, "$1")

    // 2. Обрабатываем незакрытые строки более агрессивно
    // Ищем последнюю незавершённую строку и обрезаем её
    let inString = false
    let lastStringStart = -1
    let prevChar = ""

    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i]
      if (char === '"' && prevChar !== "\\") {
        if (!inString) {
          lastStringStart = i
          inString = true
        } else {
          inString = false
          lastStringStart = -1
        }
      }
      prevChar = char
    }

    // Если строка не закрыта - обрезаем её и закрываем
    if (inString && lastStringStart > 0) {
      console.log(`[AI-Parser] Незакрытая строка начинается на позиции ${lastStringStart}`)
      // Ищем позицию перед этой строкой (до ключа или предыдущего значения)
      const beforeString = repaired.substring(0, lastStringStart)
      // Находим последнюю запятую или открывающую скобку
      const lastSafePos = Math.max(
        beforeString.lastIndexOf(","),
        beforeString.lastIndexOf("["),
        beforeString.lastIndexOf("{")
      )
      if (lastSafePos > 0) {
        // Если это запятая - обрезаем до неё
        if (beforeString[lastSafePos] === ",") {
          repaired = beforeString.substring(0, lastSafePos)
        } else {
          // Если это скобка - оставляем её
          repaired = beforeString.substring(0, lastSafePos + 1)
        }
        console.log(`[AI-Parser] Обрезано до позиции ${lastSafePos}`)
      } else {
        // Fallback: просто закрываем строку
        repaired += '"'
      }
    }

    // 3. Балансируем скобки
    let openBraces = 0
    let openBrackets = 0
    inString = false
    prevChar = ""

    for (const char of repaired) {
      if (char === '"' && prevChar !== "\\") {
        inString = !inString
      } else if (!inString) {
        if (char === "{") openBraces++
        else if (char === "}") openBraces--
        else if (char === "[") openBrackets++
        else if (char === "]") openBrackets--
      }
      prevChar = char
    }

    // Если всё ещё в строке - закрываем
    if (inString) {
      repaired += '"'
    }

    // 4. Очищаем незавершённые элементы в конце
    // Паттерн: удаляем всё после последней закрытой структуры
    repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"}\]]*$/g, "")
    repaired = repaired.replace(/,\s*$/g, "")
    repaired = repaired.replace(/,(\s*[\]}])/g, "$1")

    // 5. Добавляем недостающие закрывающие скобки
    // Пересчитываем после очистки
    openBraces = 0
    openBrackets = 0
    inString = false
    prevChar = ""

    for (const char of repaired) {
      if (char === '"' && prevChar !== "\\") {
        inString = !inString
      } else if (!inString) {
        if (char === "{") openBraces++
        else if (char === "}") openBraces--
        else if (char === "[") openBrackets++
        else if (char === "]") openBrackets--
      }
      prevChar = char
    }

    while (openBrackets > 0) {
      repaired += "]"
      openBrackets--
    }
    while (openBraces > 0) {
      repaired += "}"
      openBraces--
    }

    console.log(`[AI-Parser] repairJSON: итоговая длина ${repaired.length}`)

    // Проверяем что получилось
    JSON.parse(repaired)
    console.log(`[AI-Parser] repairJSON: JSON валиден!`)
    return repaired
  } catch (e) {
    console.log(`[AI-Parser] repairJSON failed:`, e instanceof Error ? e.message : e)
    return null
  }
}

// Находит последнюю позицию, где JSON ещё валиден (закрытый объект в массиве trails)
function findLastValidPosition(jsonStr: string): number {
  // Ищем последний полностью закрытый модуль или trail
  // Паттерн: }] или }]} в контексте структуры

  let depth = 0
  let inString = false
  let prevChar = ""
  let lastValidModuleEnd = -1
  let lastValidTrailEnd = -1

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i]

    if (char === '"' && prevChar !== "\\") {
      inString = !inString
    }

    if (!inString) {
      if (char === "{") depth++
      else if (char === "}") {
        depth--
        // Проверяем, не является ли это концом модуля (} внутри массива modules)
        const next = jsonStr.substring(i, i + 3)
        if (next === "},") {
          lastValidModuleEnd = i + 1
        }
        // Или концом trail
        if (depth === 1 && next.startsWith("}")) {
          lastValidTrailEnd = i + 1
        }
      }
    }
    prevChar = char
  }

  // Возвращаем последнюю безопасную позицию
  if (lastValidModuleEnd > lastValidTrailEnd) {
    return lastValidModuleEnd
  }
  return lastValidTrailEnd
}

// Восстановление завершённых trail'ов из обрезанного JSON
function recoverCompletedTrails(jsonStr: string): any[] {
  const trails: any[] = []

  try {
    // Ищем начало массива trails
    const trailsMatch = jsonStr.match(/"trails"\s*:\s*\[/)
    if (!trailsMatch || trailsMatch.index === undefined) return trails

    const startPos = trailsMatch.index + trailsMatch[0].length

    // Ищем завершённые объекты trail (каждый заканчивается на }] или }, внутри массива)
    let depth = 0
    let inString = false
    let prevChar = ""
    let trailStart = -1
    let braceDepth = 0

    for (let i = startPos; i < jsonStr.length; i++) {
      const char = jsonStr[i]

      if (char === '"' && prevChar !== "\\") {
        inString = !inString
      }

      if (!inString) {
        if (char === "{") {
          if (depth === 0) {
            trailStart = i
          }
          depth++
          braceDepth++
        } else if (char === "}") {
          depth--
          braceDepth--

          if (depth === 0 && trailStart !== -1) {
            // Завершён один trail
            const trailJson = jsonStr.substring(trailStart, i + 1)
            try {
              const trail = JSON.parse(trailJson)
              if (trail.title || trail.modules) {
                trails.push(trail)
                console.log(`[AI-Parser] Восстановлен trail: "${trail.title || 'без названия'}"`)
              }
            } catch {
              // Этот trail повреждён - пробуем извлечь модули
              const partialTrail = extractPartialTrail(trailJson)
              if (partialTrail) {
                trails.push(partialTrail)
                console.log(`[AI-Parser] Частично восстановлен trail`)
              }
            }
            trailStart = -1
          }
        } else if (char === "]" && depth === 0) {
          // Конец массива trails
          break
        }
      }
      prevChar = char
    }
  } catch (e) {
    console.log(`[AI-Parser] recoverCompletedTrails error:`, e)
  }

  return trails
}

// Извлечение частичного trail с завершёнными модулями
function extractPartialTrail(trailJson: string): any | null {
  try {
    // Ищем базовые поля
    const titleMatch = trailJson.match(/"title"\s*:\s*"([^"]*)"/)
    const slugMatch = trailJson.match(/"slug"\s*:\s*"([^"]*)"/)

    if (!titleMatch) return null

    const trail: any = {
      title: titleMatch[1],
      slug: slugMatch ? slugMatch[1] : generateSlugFromTitle(titleMatch[1]),
      modules: [],
    }

    // Ищем завершённые модули
    const modulesMatch = trailJson.match(/"modules"\s*:\s*\[/)
    if (modulesMatch && modulesMatch.index !== undefined) {
      const modulesStart = modulesMatch.index + modulesMatch[0].length
      const modulesContent = trailJson.substring(modulesStart)

      let depth = 0
      let inString = false
      let prevChar = ""
      let moduleStart = -1

      for (let i = 0; i < modulesContent.length; i++) {
        const char = modulesContent[i]

        if (char === '"' && prevChar !== "\\") {
          inString = !inString
        }

        if (!inString) {
          if (char === "{") {
            if (depth === 0) moduleStart = i
            depth++
          } else if (char === "}") {
            depth--
            if (depth === 0 && moduleStart !== -1) {
              const moduleJson = modulesContent.substring(moduleStart, i + 1)
              try {
                const mod = JSON.parse(moduleJson)
                if (mod.title) {
                  trail.modules.push(mod)
                }
              } catch {
                // Модуль повреждён, пропускаем
              }
              moduleStart = -1
            }
          } else if (char === "]" && depth === 0) {
            break
          }
        }
        prevChar = char
      }
    }

    return trail.modules.length > 0 ? trail : null
  } catch {
    return null
  }
}

// Извлечение частичных данных из сильно повреждённого JSON
function extractPartialJSON(jsonStr: string): any | null {
  try {
    // Пытаемся найти и извлечь отдельные trails
    const trailsMatch = jsonStr.match(/"trails"\s*:\s*\[([\s\S]*)/i)
    if (!trailsMatch) return null

    let trailsContent = trailsMatch[1]

    // Ищем завершённые объекты trail
    const trails: any[] = []
    let depth = 0
    let currentTrail = ""
    let inString = false
    let prevChar = ""

    for (let i = 0; i < trailsContent.length; i++) {
      const char = trailsContent[i]

      if (char === '"' && prevChar !== "\\") {
        inString = !inString
      }

      if (!inString) {
        if (char === "{") {
          if (depth === 0) {
            currentTrail = ""
          }
          depth++
        } else if (char === "}") {
          depth--
          if (depth === 0) {
            currentTrail += char
            try {
              const trail = JSON.parse(currentTrail)
              trails.push(trail)
            } catch {
              // Этот trail битый, пропускаем
            }
            currentTrail = ""
            continue
          }
        }
      }

      if (depth > 0) {
        currentTrail += char
      }

      prevChar = char
    }

    if (trails.length > 0) {
      return { trails }
    }

    return null
  } catch {
    return null
  }
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
