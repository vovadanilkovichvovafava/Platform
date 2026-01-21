import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  smartImport,
  hybridImport,
  ParsedTrail,
  ImportResult,
  getAIConfig,
  checkAIAvailability,
  SUPPORTED_FORMATS,
  requiresAIParser,
} from "@/lib/import"

// POST - парсинг файла (без сохранения) или сохранение
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentType = request.headers.get("content-type") || ""

    // Если JSON - это запрос на сохранение уже распарсенных данных
    if (contentType.includes("application/json")) {
      const body = await request.json()

      if (body.action === "save" && body.trails) {
        const result = await importToDatabase(body.trails)
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

    const text = await file.text()

    if (!text.trim()) {
      return NextResponse.json({ error: "Файл пуст" }, { status: 400 })
    }

    // Парсинг файла (БЕЗ сохранения в БД)
    const aiConfig = getAIConfig()
    let parseResult

    // Если forceAI - используем AI парсер, но с fallback на кодовый парсер при ошибке
    if (forceAI && aiConfig.enabled && aiConfig.apiKey) {
      const { parseWithAI } = await import("@/lib/import/parsers/ai-parser")
      const { detectFileFormat, analyzeStructure } = await import("@/lib/import/smart-detector")

      const detectedFormat = detectFileFormat(file.name, text)
      const structureAnalysis = analyzeStructure(text)

      const aiResult = await parseWithAI(text, aiConfig)

      // Если AI парсер не справился, пробуем кодовый парсер как fallback
      if (!aiResult.success || aiResult.trails.length === 0) {
        console.log("AI парсер не справился, пробуем кодовый парсер...")
        const codeResult = await smartImport(text, file.name, { useAI: false })

        if (codeResult.success && codeResult.trails.length > 0) {
          // Кодовый парсер справился - возвращаем его результат с пометкой
          parseResult = {
            ...codeResult,
            detectedFormat,
            structureConfidence: structureAnalysis.confidence,
            confidenceDetails: structureAnalysis.confidenceDetails,
            parseMethod: "code",
            warnings: [
              ...(codeResult.warnings || []),
              "AI парсер недоступен или не смог обработать файл. Использован кодовый парсер."
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
    if (!session?.user?.id || session.user.role !== "ADMIN") {
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
async function importToDatabase(trails: ParsedTrail[]): Promise<ImportResult> {
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
        isPublished: true,
      },
    })
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
              question: q.question,
              options: JSON.stringify(q.options),
              correctAnswer: q.correctAnswer,
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
