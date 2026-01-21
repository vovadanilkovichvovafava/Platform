import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const trailId = searchParams.get("trailId")

    // Get trails with modules and questions
    const trails = await prisma.trail.findMany({
      where: trailId ? { id: trailId } : undefined,
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
            content += `В: ${question.question}\n`

            const questionType = question.type || "SINGLE_CHOICE"

            // Для MATCHING и ORDERING экспортируем данные из поля data
            if (questionType === "MATCHING" && question.data) {
              try {
                const data = typeof question.data === "string" ? JSON.parse(question.data) : question.data
                if (data.leftItems && data.rightItems) {
                  // Экспортируем в формате "термин -> определение"
                  for (let i = 0; i < data.leftItems.length; i++) {
                    const left = data.leftItems[i]
                    // Находим правильную пару
                    const rightId = data.correctPairs?.[left.id]
                    const right = data.rightItems.find((r: { id: string; text: string }) => r.id === rightId)
                    if (left.text && right?.text) {
                      content += `- ${left.text} -> ${right.text}\n`
                    }
                  }
                }
              } catch {
                // Если data невалидна, пробуем options
                try {
                  const options = JSON.parse(question.options)
                  options.forEach((opt: string) => {
                    content += `- ${opt}\n`
                  })
                } catch {
                  content += `- ${question.options}\n`
                }
              }
            } else if (questionType === "ORDERING" && question.data) {
              try {
                const data = typeof question.data === "string" ? JSON.parse(question.data) : question.data
                if (data.items && data.correctOrder) {
                  // Экспортируем в правильном порядке
                  for (const id of data.correctOrder) {
                    const item = data.items.find((i: { id: string; text: string }) => i.id === id)
                    if (item?.text) {
                      content += `- ${item.text}\n`
                    }
                  }
                }
              } catch {
                // Если data невалидна, пробуем options
                try {
                  const options = JSON.parse(question.options)
                  options.forEach((opt: string) => {
                    content += `- ${opt}\n`
                  })
                } catch {
                  content += `- ${question.options}\n`
                }
              }
            } else {
              // SINGLE_CHOICE - стандартный формат
              try {
                const options = JSON.parse(question.options)
                options.forEach((opt: string, idx: number) => {
                  const isCorrect = idx === question.correctAnswer
                  content += `- ${opt}${isCorrect ? " *" : ""}\n`
                })
              } catch {
                content += `- ${question.options}\n`
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
