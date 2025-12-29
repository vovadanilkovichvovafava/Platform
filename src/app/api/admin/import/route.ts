import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const text = await file.text()
    const result = await parseAndImport(text)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    )
  }
}

interface ParsedQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

interface ParsedModule {
  title: string
  slug: string
  type: "LESSON" | "QUIZ" | "PROJECT"
  points: number
  description: string
  content: string
  questions: ParsedQuestion[]
}

interface ParsedTrail {
  title: string
  slug: string
  subtitle: string
  description: string
  icon: string
  color: string
  modules: ParsedModule[]
}

async function parseAndImport(text: string) {
  const lines = text.split("\n")
  const trails: ParsedTrail[] = []

  let currentTrail: ParsedTrail | null = null
  let currentModule: ParsedModule | null = null
  let currentSection: "trail" | "module" | "questions" | "content" | null = null
  let contentBuffer: string[] = []
  let inContentBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // Section markers
    if (trimmedLine === "=== TRAIL ===" || trimmedLine === "=== ТРЕЙЛ ===") {
      // Save previous module if exists
      if (currentModule && currentTrail) {
        if (inContentBlock) {
          currentModule.content = contentBuffer.join("\n").trim()
        }
        currentTrail.modules.push(currentModule)
      }
      // Save previous trail if exists
      if (currentTrail) {
        trails.push(currentTrail)
      }

      currentTrail = {
        title: "",
        slug: "",
        subtitle: "",
        description: "",
        icon: "📚",
        color: "#6366f1",
        modules: [],
      }
      currentModule = null
      currentSection = "trail"
      inContentBlock = false
      contentBuffer = []
      continue
    }

    if (trimmedLine === "=== MODULE ===" || trimmedLine === "=== МОДУЛЬ ===") {
      // Save previous module if exists
      if (currentModule && currentTrail) {
        if (inContentBlock) {
          currentModule.content = contentBuffer.join("\n").trim()
        }
        currentTrail.modules.push(currentModule)
      }

      currentModule = {
        title: "",
        slug: "",
        type: "LESSON",
        points: 50,
        description: "",
        content: "",
        questions: [],
      }
      currentSection = "module"
      inContentBlock = false
      contentBuffer = []
      continue
    }

    if (trimmedLine === "=== QUESTIONS ===" || trimmedLine === "=== ВОПРОСЫ ===") {
      if (inContentBlock && currentModule) {
        currentModule.content = contentBuffer.join("\n").trim()
      }
      currentSection = "questions"
      inContentBlock = false
      contentBuffer = []
      continue
    }

    // Content block markers
    if (trimmedLine === "---" && currentSection === "module") {
      if (!inContentBlock) {
        inContentBlock = true
        contentBuffer = []
      } else {
        if (currentModule) {
          currentModule.content = contentBuffer.join("\n").trim()
        }
        inContentBlock = false
      }
      continue
    }

    // Inside content block
    if (inContentBlock) {
      contentBuffer.push(line)
      continue
    }

    // Parse key-value pairs
    if (trimmedLine.includes(":") && !trimmedLine.startsWith("Q:") && !trimmedLine.startsWith("В:")) {
      const colonIndex = trimmedLine.indexOf(":")
      const key = trimmedLine.slice(0, colonIndex).trim().toLowerCase()
      const value = trimmedLine.slice(colonIndex + 1).trim()

      if (currentSection === "trail" && currentTrail) {
        switch (key) {
          case "title":
          case "название":
            currentTrail.title = value
            break
          case "slug":
          case "слаг":
            currentTrail.slug = value
            break
          case "subtitle":
          case "подзаголовок":
            currentTrail.subtitle = value
            break
          case "description":
          case "описание":
            currentTrail.description = value
            break
          case "icon":
          case "иконка":
            currentTrail.icon = value
            break
          case "color":
          case "цвет":
            currentTrail.color = value
            break
        }
      } else if (currentSection === "module" && currentModule) {
        switch (key) {
          case "title":
          case "название":
            currentModule.title = value
            break
          case "slug":
          case "слаг":
            currentModule.slug = value
            break
          case "type":
          case "тип":
            const typeMap: Record<string, "LESSON" | "QUIZ" | "PROJECT"> = {
              lesson: "LESSON",
              quiz: "QUIZ",
              project: "PROJECT",
              урок: "LESSON",
              тест: "QUIZ",
              проект: "PROJECT",
            }
            currentModule.type = typeMap[value.toLowerCase()] || "LESSON"
            break
          case "points":
          case "очки":
          case "баллы":
            currentModule.points = parseInt(value) || 50
            break
          case "description":
          case "описание":
            currentModule.description = value
            break
        }
      }
      continue
    }

    // Parse questions
    if (currentSection === "questions" && currentModule) {
      if (trimmedLine.startsWith("Q:") || trimmedLine.startsWith("В:")) {
        const questionText = trimmedLine.slice(2).trim()
        currentModule.questions.push({
          question: questionText,
          options: [],
          correctAnswer: 0,
        })
      } else if (trimmedLine.startsWith("-") || trimmedLine.startsWith("•")) {
        const currentQuestion = currentModule.questions[currentModule.questions.length - 1]
        if (currentQuestion) {
          let optionText = trimmedLine.slice(1).trim()
          const isCorrect = optionText.endsWith("*")
          if (isCorrect) {
            optionText = optionText.slice(0, -1).trim()
            currentQuestion.correctAnswer = currentQuestion.options.length
          }
          currentQuestion.options.push(optionText)
        }
      }
    }
  }

  // Save last module and trail
  if (currentModule && currentTrail) {
    if (inContentBlock) {
      currentModule.content = contentBuffer.join("\n").trim()
    }
    currentTrail.modules.push(currentModule)
  }
  if (currentTrail) {
    trails.push(currentTrail)
  }

  // Import to database
  const imported = {
    trails: 0,
    modules: 0,
    questions: 0,
  }

  for (const trailData of trails) {
    // Create or update trail
    const trail = await prisma.trail.upsert({
      where: { slug: trailData.slug },
      update: {
        title: trailData.title,
        subtitle: trailData.subtitle,
        description: trailData.description,
        icon: trailData.icon,
        color: trailData.color,
      },
      create: {
        title: trailData.title,
        slug: trailData.slug,
        subtitle: trailData.subtitle,
        description: trailData.description,
        icon: trailData.icon,
        color: trailData.color,
        duration: "4 недели",
        isPublished: true,
      },
    })
    imported.trails++

    // Create modules
    for (let order = 0; order < trailData.modules.length; order++) {
      const moduleData = trailData.modules[order]

      const module = await prisma.module.upsert({
        where: { slug: moduleData.slug },
        update: {
          title: moduleData.title,
          description: moduleData.description,
          content: moduleData.content,
          type: moduleData.type,
          points: moduleData.points,
          order: order,
          trailId: trail.id,
        },
        create: {
          title: moduleData.title,
          slug: moduleData.slug,
          description: moduleData.description,
          content: moduleData.content,
          type: moduleData.type,
          points: moduleData.points,
          order: order,
          duration: moduleData.type === "PROJECT" ? "1-2 дня" : "20 мин",
          level: moduleData.type === "PROJECT" ? "Middle" : "Beginner",
          trailId: trail.id,
        },
      })
      imported.modules++

      // Delete existing questions for this module and create new ones
      await prisma.question.deleteMany({
        where: { moduleId: module.id },
      })

      for (let qOrder = 0; qOrder < moduleData.questions.length; qOrder++) {
        const q = moduleData.questions[qOrder]
        await prisma.question.create({
          data: {
            moduleId: module.id,
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

  return {
    success: true,
    imported,
    message: `Импортировано: ${imported.trails} трейлов, ${imported.modules} модулей, ${imported.questions} вопросов`,
  }
}
