import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAnyAdmin, getAdminTrailFilter } from "@/lib/admin-access"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // CO_ADMIN can only export their assigned trails
    const trailFilter = await getAdminTrailFilter(session.user.id, session.user.role)

    const { searchParams } = new URL(request.url)
    const trailId = searchParams.get("trailId")

    // Build where clause with access filter
    const whereClause = trailId
      ? { id: trailId, ...trailFilter }
      : trailFilter

    // Get trails with modules and questions
    const trails = await prisma.trail.findMany({
      where: whereClause,
      orderBy: { order: "asc" },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    })

    // Generate text format (same as import format)
    let content = ""

    for (const trail of trails) {
      content += `=== TRAIL ===\n`
      content += `название: ${trail.title}\n`
      content += `slug: ${trail.slug}\n`
      content += `подзаголовок: ${trail.subtitle}\n`
      content += `описание: ${trail.description}\n`
      content += `иконка: ${trail.icon}\n`
      content += `цвет: ${trail.color}\n`
      content += `длительность: ${trail.duration}\n`
      content += `опубликован: ${trail.isPublished ? "да" : "нет"}\n`
      content += `\n`

      for (const module of trail.modules) {
        content += `=== MODULE ===\n`
        content += `название: ${module.title}\n`
        content += `slug: ${module.slug}\n`
        content += `тип: ${module.type === "THEORY" ? "урок" : module.type === "PRACTICE" ? "тест" : "проект"}\n`
        content += `уровень: ${module.level}\n`
        content += `очки: ${module.points}\n`
        content += `длительность: ${module.duration}\n`
        content += `описание: ${module.description}\n`
        if (module.requiresSubmission) {
          content += `требует_сдачу: да\n`
        }
        content += `---\n`
        content += module.content || ""
        content += `\n---\n`

        if (module.requirements) {
          content += `\n=== ТРЕБОВАНИЯ ===\n`
          content += module.requirements
          content += `\n`
        }

        if (module.questions.length > 0) {
          content += `\n=== ВОПРОСЫ ===\n`
          for (const question of module.questions) {
            const questionType = question.type || "SINGLE_CHOICE"

            // Добавляем маркер типа вопроса для MATCHING и ORDERING
            // Формат: "В: текст вопроса [MATCHING]" или "В: текст вопроса [ORDERING]"
            if (questionType === "MATCHING") {
              content += `В: ${question.question} [MATCHING]\n`
            } else if (questionType === "ORDERING") {
              content += `В: ${question.question} [ORDERING]\n`
            } else if (questionType === "CASE_ANALYSIS") {
              content += `В: ${question.question} [CASE_ANALYSIS]\n`
            } else {
              content += `В: ${question.question}\n`
            }

            // Для MATCHING экспортируем данные из поля data
            if (questionType === "MATCHING") {
              let hasExportedData = false
              if (question.data) {
                try {
                  const data = typeof question.data === "string" ? JSON.parse(question.data) : question.data
                  if (data.leftItems && data.rightItems && data.correctPairs) {
                    // Экспортируем в формате "термин -> определение"
                    for (let i = 0; i < data.leftItems.length; i++) {
                      const left = data.leftItems[i]
                      // Находим правильную пару
                      const rightId = data.correctPairs[left.id]
                      const right = data.rightItems.find((r: { id: string; text: string }) => r.id === rightId)
                      // Экспортируем даже если текст пустой (используем placeholder)
                      const leftText = left.text || `[Термин ${i + 1}]`
                      const rightText = right?.text || `[Определение ${i + 1}]`
                      content += `- ${leftText} -> ${rightText}\n`
                      hasExportedData = true
                    }
                  }
                } catch {
                  // data невалидна - продолжаем к fallback
                }
              }
              // Если данные не экспортированы, добавляем шаблон
              if (!hasExportedData) {
                content += `- [Термин 1] -> [Определение 1]\n`
                content += `- [Термин 2] -> [Определение 2]\n`
                content += `- [Термин 3] -> [Определение 3]\n`
              }
            } else if (questionType === "ORDERING") {
              let hasExportedData = false
              if (question.data) {
                try {
                  const data = typeof question.data === "string" ? JSON.parse(question.data) : question.data
                  if (data.items && data.correctOrder) {
                    // Экспортируем в правильном порядке
                    for (let idx = 0; idx < data.correctOrder.length; idx++) {
                      const id = data.correctOrder[idx]
                      const item = data.items.find((i: { id: string; text: string }) => i.id === id)
                      // Экспортируем даже если текст пустой (используем placeholder)
                      const itemText = item?.text || `[Шаг ${idx + 1}]`
                      content += `- ${itemText}\n`
                      hasExportedData = true
                    }
                  }
                } catch {
                  // data невалидна - продолжаем к fallback
                }
              }
              // Если данные не экспортированы, добавляем шаблон
              if (!hasExportedData) {
                content += `- [Шаг 1]\n`
                content += `- [Шаг 2]\n`
                content += `- [Шаг 3]\n`
                content += `- [Шаг 4]\n`
              }
            } else if (questionType === "CASE_ANALYSIS") {
              // CASE_ANALYSIS - экспортируем кейс и опции
              if (question.data) {
                try {
                  const data = typeof question.data === "string" ? JSON.parse(question.data) : question.data
                  if (data.caseContent) {
                    content += `кейс: ${data.caseContent}\n`
                  }
                  if (data.options && Array.isArray(data.options)) {
                    for (const opt of data.options) {
                      const marker = opt.isCorrect ? " *" : ""
                      content += `- ${opt.text || "[Вариант]"}${marker}\n`
                    }
                  }
                } catch {
                  content += `- [Вариант 1]\n`
                  content += `- [Вариант 2]\n`
                }
              } else {
                content += `- [Вариант 1]\n`
                content += `- [Вариант 2]\n`
              }
            } else {
              // SINGLE_CHOICE - стандартный формат
              try {
                const options = JSON.parse(question.options)
                if (options.length > 0) {
                  options.forEach((opt: string, idx: number) => {
                    const isCorrect = idx === question.correctAnswer
                    content += `- ${opt || `[Вариант ${idx + 1}]`}${isCorrect ? " *" : ""}\n`
                  })
                } else {
                  content += `- [Вариант A] *\n`
                  content += `- [Вариант B]\n`
                  content += `- [Вариант C]\n`
                  content += `- [Вариант D]\n`
                }
              } catch {
                content += `- [Вариант A] *\n`
                content += `- [Вариант B]\n`
              }
            }
            content += `\n`
          }
        }

        content += `\n`
      }

      content += `\n`
    }

    // Add BOM for UTF-8
    const bom = "\uFEFF"
    const contentWithBom = bom + content

    const filename = trailId
      ? `trail-export-${new Date().toISOString().split("T")[0]}.txt`
      : `all-content-${new Date().toISOString().split("T")[0]}.txt`

    return new NextResponse(contentWithBom, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error exporting content:", error)
    return NextResponse.json({ error: "Ошибка экспорта" }, { status: 500 })
  }
}
