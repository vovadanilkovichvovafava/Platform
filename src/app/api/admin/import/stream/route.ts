import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getAIConfig,
  SUPPORTED_FORMATS,
} from "@/lib/import"
import { isAnyAdmin } from "@/lib/admin-access"

// Увеличиваем лимит времени выполнения для AI парсинга
export const maxDuration = 300 // 5 минут

// Интерфейс для прогресса
interface ProgressEvent {
  type: "progress" | "complete" | "error"
  current?: number
  total?: number
  status?: string
  phase?: string // 'analyzing' | 'metadata' | 'parsing' | 'merging'
  result?: any
  error?: string
}

// Функция для отправки SSE сообщения
function sendSSE(controller: ReadableStreamDefaultController, event: ProgressEvent) {
  const data = JSON.stringify(event)
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
}

// POST - парсинг файла со стримингом прогресса
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File
  const useAI = formData.get("useAI") === "true"
  const forceAI = formData.get("forceAI") === "true"

  if (!file) {
    return new Response(JSON.stringify({ error: "No file provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Проверка расширения файла
  const filename = file.name.toLowerCase()
  const supportedExtensions = SUPPORTED_FORMATS.map(f => f.ext)
  const hasValidExtension = supportedExtensions.some(ext => filename.endsWith(ext))

  if (!hasValidExtension) {
    return new Response(JSON.stringify({
      error: `Неподдерживаемый формат файла. Поддерживаются: ${supportedExtensions.slice(0, 10).join(", ")} и другие`,
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Лимит размера файла: 10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    return new Response(JSON.stringify({
      error: `Файл слишком большой. Максимальный размер: 10MB, ваш файл: ${Math.round(file.size / 1024 / 1024)}MB`,
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Проверка PDF без AI
  const aiConfig = getAIConfig()
  const isPdf = filename.endsWith(".pdf")
  if (isPdf && (!aiConfig.enabled || !aiConfig.apiKey)) {
    return new Response(JSON.stringify({
      error: "PDF формат требует AI-парсер для извлечения текста. AI-парсер не настроен. Сконвертируйте файл в .txt или .md.",
      details: ["PDF — бинарный формат, для извлечения текста требуется AI"],
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const text = await file.text()

  if (!text.trim()) {
    return new Response(JSON.stringify({ error: "Файл пуст" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Создаем ReadableStream для SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiConfig = getAIConfig()
        const CHUNKED_PARSING_THRESHOLD = 2000

        // Фаза 1: Анализ структуры
        sendSSE(controller, {
          type: "progress",
          current: 0,
          total: 100,
          status: "Анализ структуры документа...",
          phase: "analyzing"
        })

        if (forceAI && aiConfig.enabled && aiConfig.apiKey) {
          const { parseWithAI, parseWithAIChunked } = await import("@/lib/import/parsers/ai-parser")
          const { detectFileFormat, analyzeStructure } = await import("@/lib/import/smart-detector")

          const detectedFormat = detectFileFormat(file.name, text)
          const structureAnalysis = analyzeStructure(text)

          const useChunked = text.length > CHUNKED_PARSING_THRESHOLD
          console.log(`[Stream] Размер файла: ${text.length} символов, chunked: ${useChunked}`)

          sendSSE(controller, {
            type: "progress",
            current: 5,
            total: 100,
            status: "Структура определена, запускаем AI парсер...",
            phase: "analyzing"
          })

          let aiResult
          if (useChunked) {
            // Используем chunked parsing с callback для прогресса
            aiResult = await parseWithAIChunked(text, aiConfig, (current, total, status) => {
              // Конвертируем прогресс чанков в общий прогресс (10-90%)
              const chunkProgress = total > 0 ? Math.round(10 + (current / total) * 80) : 10

              // Определяем фазу
              let phase: string = "parsing"
              if (status.includes("метаданн")) {
                phase = "metadata"
              } else if (status.includes("Объединение")) {
                phase = "merging"
              }

              sendSSE(controller, {
                type: "progress",
                current: chunkProgress,
                total: 100,
                status: status,
                phase: phase
              })
            })
          } else {
            sendSSE(controller, {
              type: "progress",
              current: 50,
              total: 100,
              status: "Обработка через AI...",
              phase: "parsing"
            })
            aiResult = await parseWithAI(text, aiConfig)
          }

          sendSSE(controller, {
            type: "progress",
            current: 95,
            total: 100,
            status: "Финальная обработка...",
            phase: "merging"
          })

          // Если AI парсер не справился, пробуем кодовый парсер
          if (!aiResult.success || aiResult.trails.length === 0) {
            console.log("[Stream] AI парсер не справился, пробуем кодовый парсер...")
            const { smartImport } = await import("@/lib/import")
            const codeResult = await smartImport(text, file.name, { useAI: false })

            if (codeResult.success && codeResult.trails.length > 0) {
              const aiErrorDetail = aiResult.errors?.length > 0 ? ` (${aiResult.errors[0]})` : ""
              sendSSE(controller, {
                type: "complete",
                result: {
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
              })
            } else {
              sendSSE(controller, {
                type: "complete",
                result: {
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
              })
            }
          } else {
            sendSSE(controller, {
              type: "complete",
              result: {
                ...aiResult,
                detectedFormat,
                structureConfidence: structureAnalysis.confidence,
                confidenceDetails: structureAnalysis.confidenceDetails,
                parseMethod: "ai",
              }
            })
          }
        } else if (forceAI && (!aiConfig.enabled || !aiConfig.apiKey)) {
          // AI отключен - используем кодовый парсер
          console.log("[Stream] AI парсер отключен, используем кодовый парсер...")
          const { detectFileFormat, analyzeStructure } = await import("@/lib/import/smart-detector")
          const { smartImport } = await import("@/lib/import")

          const detectedFormat = detectFileFormat(file.name, text)
          const structureAnalysis = analyzeStructure(text)

          sendSSE(controller, {
            type: "progress",
            current: 50,
            total: 100,
            status: "AI недоступен, используем кодовый парсер...",
            phase: "parsing"
          })

          const codeResult = await smartImport(text, file.name, { useAI: false })

          sendSSE(controller, {
            type: "complete",
            result: {
              ...codeResult,
              detectedFormat,
              structureConfidence: structureAnalysis.confidence,
              confidenceDetails: structureAnalysis.confidenceDetails,
              parseMethod: "code",
              warnings: [
                ...(codeResult.warnings || []),
                "AI парсер недоступен. Использован кодовый парсер."
              ],
            }
          })
        } else {
          // Обычный smartImport
          sendSSE(controller, {
            type: "progress",
            current: 30,
            total: 100,
            status: "Обработка через кодовый парсер...",
            phase: "parsing"
          })

          const { smartImport } = await import("@/lib/import")
          const result = await smartImport(text, file.name, {
            useAI: useAI && aiConfig.enabled,
          })

          sendSSE(controller, {
            type: "complete",
            result
          })
        }
      } catch (e) {
        console.error("[Stream] Error:", e)
        sendSSE(controller, {
          type: "error",
          error: e instanceof Error ? e.message : "Неизвестная ошибка"
        })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
