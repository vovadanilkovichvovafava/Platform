import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  smartImport,
  ParsedTrail,
  ImportResult,
  getAIConfig,
  checkAIAvailability,
  SUPPORTED_FORMATS,
  requiresAIParser,
} from "@/lib/import"
import { isAnyAdmin } from "@/lib/admin-access"

// Увеличиваем лимит времени выполнения функции для AI парсинга
// Vercel: Hobby = 10s, Pro = 60s (можно до 300s), Enterprise = 900s
// Для Pro плана можно увеличить до 300 секунд в настройках проекта
export const maxDuration = 300 // 5 минут (требует Pro план на Vercel)

// POST - парсинг файла (без сохранения) или сохранение
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentType = request.headers.get("content-type") || ""

    // Если JSON - это запрос на сохранение уже распарсенных данных
    if (contentType.includes("application/json")) {
      const body = await request.json()

      if (body.action === "save" && body.trails) {
        const result = await importToDatabase(body.trails, session.user.id)
        return NextResponse.json(result)
      }

      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Если FormData - это запрос на парсинг файла
    const formData = await request.formData()
    const file = formData.get("file") as File
    const useAI = formData.get("useAI") === "true"
    const forceAI = formData.get("forceAI") === "true" // Для перегенерации

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Проверка расширения файла - поддерживаем все форматы из SUPPORTED_FORMATS
    const filename = file.name.toLowerCase()
    const supportedExtensions = SUPPORTED_FORMATS.map(f => f.ext)
    const hasValidExtension = supportedExtensions.some(ext => filename.endsWith(ext))

    if (!hasValidExtension) {
      return NextResponse.json({
        error: `Неподдерживаемый формат файла. Поддерживаются: ${supportedExtensions.slice(0, 10).join(", ")} и другие`,
      }, { status: 400 })
    }

    // Для форматов требующих AI, автоматически включаем AI
    const needsAI = requiresAIParser(filename)

    // Лимит размера файла: 10MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `Файл слишком большой. Максимальный размер: 10MB, ваш файл: ${Math.round(file.size / 1024 / 1024)}MB`,
      }, { status: 400 })
    }

    // Проверка PDF без AI
    const aiConfig = getAIConfig()
    const isPdf = filename.endsWith(".pdf")
    if (isPdf && (!aiConfig.enabled || !aiConfig.apiKey)) {
      return NextResponse.json({
        error: "PDF формат требует AI-парсер для извлечения текста. AI-парсер не настроен. Сконвертируйте файл в .txt или .md, либо включите AI-парсер.",
        details: ["PDF — бинарный формат, для извлечения текста требуется AI"],
      }, { status: 400 })
    }

    const text = await file.text()

    if (!text.trim()) {
      return NextResponse.json({ error: "Файл пуст" }, { status: 400 })
    }

    // Парсинг файла (БЕЗ сохранения в БД)
    let parseResult

    // Порог для использования chunked parsing (2KB)
    const CHUNKED_PARSING_THRESHOLD = 2000

    // Если forceAI - используем AI парсер, но с fallback на кодовый парсер при ошибке
    if (forceAI && aiConfig.enabled && aiConfig.apiKey) {
      const { parseWithAI, parseWithAIChunked } = await import("@/lib/import/parsers/ai-parser")
      const { detectFileFormat, analyzeStructure } = await import("@/lib/import/smart-detector")

      const detectedFormat = detectFileFormat(file.name, text)
      const structureAnalysis = analyzeStructure(text)

      // Для больших файлов используем chunked parsing
      const useChunked = text.length > CHUNKED_PARSING_THRESHOLD
      console.log(`Размер файла: ${text.length} символов, chunked: ${useChunked}`)

      console.log("Запуск AI парсера...")
      const aiResult = useChunked
        ? await parseWithAIChunked(text, aiConfig)
        : await parseWithAI(text, aiConfig)
      console.log("AI парсер завершён:", aiResult.success ? "успешно" : "с ошибками", aiResult.errors)

      // Если AI парсер не справился, пробуем кодовый парсер как fallback
      if (!aiResult.success || aiResult.trails.length === 0) {
        console.log("AI парсер не справился, пробуем кодовый парсер...", aiResult.errors)
        const codeResult = await smartImport(text, file.name, { useAI: false })

        if (codeResult.success && codeResult.trails.length > 0) {
          // Кодовый парсер справился - возвращаем его результат с пометкой
          // Формируем информативное сообщение с причиной ошибки AI
          const aiErrorDetail = aiResult.errors?.length > 0
            ? ` (${aiResult.errors[0]})`
            : ""
          parseResult = {
            ...codeResult,
            detectedFormat,
            structureConfidence: structureAnalysis.confidence,
            confidenceDetails: structureAnalysis.confidenceDetails,
            parseMethod: "code",
            warnings: [
              ...(codeResult.warnings || []),
              `AI парсер недоступен${aiErrorDetail}. Использован кодовый парсер.`
            ],
          }
        } else {
          // Ни один парсер не справился - возвращаем ошибку AI с деталями
          parseResult = {
            ...aiResult,
            detectedFormat,
            structureConfidence: structureAnalysis.confidence,
            confidenceDetails: structureAnalysis.confidenceDetails,
            parseMethod: "ai",
            errors: [
              ...(aiResult.errors || []),
              ...(codeResult.errors || []),
            ],
          }
        }
      } else {
        parseResult = {
          ...aiResult,
          detectedFormat,
          structureConfidence: structureAnalysis.confidence,
          confidenceDetails: structureAnalysis.confidenceDetails,
          parseMethod: "ai",
        }
      }
    } else if (forceAI && (!aiConfig.enabled || !aiConfig.apiKey)) {
      // AI отключен, но запрошен forceAI - используем кодовый парсер
      console.log("AI парсер отключен, используем кодовый парсер...")
      const { detectFileFormat, analyzeStructure } = await import("@/lib/import/smart-detector")

      const detectedFormat = detectFileFormat(file.name, text)
      const structureAnalysis = analyzeStructure(text)

      const codeResult = await smartImport(text, file.name, { useAI: false })
      parseResult = {
        ...codeResult,
        detectedFormat,
        structureConfidence: structureAnalysis.confidence,
        confidenceDetails: structureAnalysis.confidenceDetails,
        warnings: [
          ...(codeResult.warnings || []),
          "AI парсер не настроен. Использован кодовый парсер."
        ],
      }
    } else if ((useAI || needsAI) && aiConfig.enabled) {
      // Для AI-only форматов или явного запроса AI - используем AI
      parseResult = await smartImport(text, file.name, {
        useAI: true,
        aiConfig,
      })
    } else if (needsAI && !aiConfig.enabled) {
      // Формат требует AI, но AI недоступен - пробуем как текст с предупреждением
      parseResult = await smartImport(text, file.name, {
        useAI: false,
      })
      parseResult.warnings = [
        ...(parseResult.warnings || []),
        `Формат файла ${file.name.split('.').pop()?.toUpperCase()} лучше обрабатывается с AI-парсером, но он не настроен.`
      ]
    } else {
      parseResult = await smartImport(text, file.name, {
        useAI: false,
      })
    }

    if (!parseResult.success || parseResult.trails.length === 0) {
      // Формируем понятное сообщение об ошибке
      let errorMessage = "Не удалось распарсить файл"

      if (parseResult.errors && parseResult.errors.length > 0) {
        // Если есть ошибки AI API - показываем их
        const aiErrors = parseResult.errors.filter(e =>
          e.includes("AI API") || e.includes("AI не") || e.includes("API вернул")
        )
        if (aiErrors.length > 0) {
          errorMessage = aiErrors[0]
        }
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        details: parseResult.errors,
        warnings: parseResult.warnings,
        parseMethod: parseResult.parseMethod,
        detectedFormat: parseResult.detectedFormat,
        structureConfidence: parseResult.structureConfidence,
        confidenceDetails: parseResult.confidenceDetails,
        // Возвращаем пустой результат для отображения
        trails: [],
      }, { status: 200 }) // 200 чтобы клиент мог показать ошибку
    }

    // Возвращаем распарсенные данные БЕЗ сохранения
    return NextResponse.json({
      success: true,
      trails: parseResult.trails,
      warnings: parseResult.warnings,
      parseMethod: parseResult.parseMethod,
      detectedFormat: parseResult.detectedFormat,
      structureConfidence: parseResult.structureConfidence,
      confidenceDetails: parseResult.confidenceDetails,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    )
  }
}

// GET - проверка статуса AI
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    // Проверка статуса AI
    if (action === "check-ai") {
      const aiConfig = getAIConfig()
      if (!aiConfig.enabled) {
        return NextResponse.json({
          available: false,
          error: "AI парсер отключен в настройках",
        })
      }

      const status = await checkAIAvailability(aiConfig)
      return NextResponse.json(status)
    }

    // Детальный тест AI API с реальным запросом
    // SECURITY: Не возвращаем конфигурацию (endpoint, apiKey, model) в ответе
    if (action === "test-ai") {
      const aiConfig = getAIConfig()
      const startTime = Date.now()

      if (!aiConfig.enabled) {
        return NextResponse.json({
          success: false,
          message: "AI парсер отключен",
          duration: Date.now() - startTime,
        })
      }

      if (!aiConfig.apiKey) {
        return NextResponse.json({
          success: false,
          message: "API ключ не настроен",
          duration: Date.now() - startTime,
        })
      }

      try {
        const controller = new AbortController()
        const timeoutMs = 30000 // 30 секунд для теста
        const timeoutId = setTimeout(() => {
          controller.abort()
        }, timeoutMs)

        const response = await fetch(aiConfig.apiEndpoint || "https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": aiConfig.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: aiConfig.model || "claude-sonnet-4-5-20241022",
            max_tokens: 100,
            messages: [{ role: "user", content: "Ответь одним словом: Привет" }],
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const responseTime = Date.now() - startTime

        if (!response.ok) {
          // Логируем детали ошибки только на сервере
          const errorText = await response.text()
          console.error("AI API test failed:", response.status, errorText.substring(0, 200))

          return NextResponse.json({
            success: false,
            message: `Ошибка API: ${response.status}`,
            duration: responseTime,
          })
        }

        const data = await response.json()

        return NextResponse.json({
          success: true,
          message: "AI API работает корректно",
          duration: responseTime,
        })
      } catch (e) {
        const responseTime = Date.now() - startTime

        // Логируем детали только на сервере
        console.error("AI API test error:", e instanceof Error ? e.message : String(e))

        if (e instanceof Error && e.name === "AbortError") {
          return NextResponse.json({
            success: false,
            message: "Таймаут: API не ответил за 30 секунд",
            duration: responseTime,
          })
        }

        return NextResponse.json({
          success: false,
          message: "Ошибка подключения к API",
          duration: responseTime,
        })
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("Import API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    )
  }
}

// Импорт в базу данных
async function importToDatabase(trails: ParsedTrail[], createdById: string): Promise<ImportResult> {
  const imported = {
    trails: 0,
    modules: 0,
    questions: 0,
  }

  for (const trailData of trails) {
    // Валидация slug
    const slug = trailData.slug || generateSlug(trailData.title)

    // Создание или обновление trail
    const trail = await prisma.trail.upsert({
      where: { slug },
      update: {
        title: trailData.title,
        subtitle: trailData.subtitle,
        description: trailData.description,
        icon: trailData.icon,
        color: trailData.color,
      },
      create: {
        title: trailData.title,
        slug,
        subtitle: trailData.subtitle,
        description: trailData.description,
        icon: trailData.icon,
        color: trailData.color,
        duration: "4 недели",
        isPublished: false, // New trails are HIDDEN by default - admin must explicitly publish
        isRestricted: true, // New trails are restricted by default - students need explicit access
        createdById, // Set importing user as creator
      },
    })

    // Backfill createdById for existing trails without a creator (legacy import fix)
    if (!trail.createdById) {
      await prisma.trail.update({
        where: { id: trail.id },
        data: { createdById },
      })
    }

    imported.trails++

    // Создание модулей
    for (let order = 0; order < trailData.modules.length; order++) {
      const moduleData = trailData.modules[order]
      const moduleSlug = moduleData.slug || generateSlug(moduleData.title)

      const createdModule = await prisma.module.upsert({
        where: { slug: moduleSlug },
        update: {
          title: moduleData.title,
          description: moduleData.description,
          content: moduleData.content,
          type: moduleData.type,
          points: moduleData.points,
          order: order,
          trailId: trail.id,
          level: moduleData.level || (moduleData.type === "PROJECT" ? "Middle" : "Beginner"),
          duration: moduleData.duration || (moduleData.type === "PROJECT" ? "1-2 дня" : "20 мин"),
          requiresSubmission: moduleData.requiresSubmission ?? (moduleData.type !== "THEORY"),
        },
        create: {
          title: moduleData.title,
          slug: moduleSlug,
          description: moduleData.description,
          content: moduleData.content,
          type: moduleData.type,
          points: moduleData.points,
          order: order,
          duration: moduleData.duration || (moduleData.type === "PROJECT" ? "1-2 дня" : "20 мин"),
          level: moduleData.level || (moduleData.type === "PROJECT" ? "Middle" : "Beginner"),
          trailId: trail.id,
          requiresSubmission: moduleData.requiresSubmission ?? (moduleData.type !== "THEORY"),
        },
      })
      imported.modules++

      // Удаление существующих вопросов и создание новых
      if (moduleData.questions.length > 0) {
        await prisma.question.deleteMany({
          where: { moduleId: createdModule.id },
        })

        for (let qOrder = 0; qOrder < moduleData.questions.length; qOrder++) {
          const q = moduleData.questions[qOrder]
          await prisma.question.create({
            data: {
              moduleId: createdModule.id,
              type: q.type || "SINGLE_CHOICE",
              question: q.question,
              options: JSON.stringify(q.options),
              correctAnswer: q.correctAnswer,
              data: q.data ? JSON.stringify(q.data) : null,
              order: qOrder,
            },
          })
          imported.questions++
        }
      }
    }
  }

  return {
    success: true,
    imported,
    message: `Добавлено: ${imported.trails} трейлов, ${imported.modules} модулей, ${imported.questions} вопросов`,
  }
}

// Генератор slug
function generateSlug(text: string): string {
  const translitMap: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
    з: "z", и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c",
    ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  }

  return text
    .toLowerCase()
    .split("")
    .map((char) => translitMap[char] || char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50)
}
