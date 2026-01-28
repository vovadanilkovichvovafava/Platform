import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// AI API configuration from environment
const AI_API_ENDPOINT = process.env.AI_API_ENDPOINT || "https://api.anthropic.com/v1/messages"
const AI_API_KEY = process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY
const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-4-5-20241022"
const ANTHROPIC_VERSION = "2023-06-01"

// Types for student analytics (minimal PII)
interface StudentAnalyticsPayload {
  // Anonymized student identifier (no email, no name for AI)
  studentId: string
  // Aggregated metrics only
  metrics: {
    totalXP: number
    currentStreak: number
    totalModulesCompleted: number
    totalModulesAvailable: number
    averageScore: number | null
    daysSinceLastActivity: number | null
  }
  // Trail progress without PII
  trailProgress: Array<{
    trailTitle: string
    modulesCompleted: number
    totalModules: number
    completionPercent: number
    avgScore: number | null
    submissions: {
      approved: number
      pending: number
      revision: number
    }
  }>
  // Module completion patterns (anonymized)
  modulePatterns: {
    strongAreas: string[]
    weakAreas: string[]
    bottleneckModules: string[]
  }
}

// Prompt for AI analysis
const SYSTEM_PROMPT = `Ты — AI-ассистент для анализа прогресса студентов на образовательной платформе.
Твоя задача — предоставить конструктивный анализ и рекомендации на основе метрик обучения.

ВАЖНО:
- Не используй персональные данные (имена, email) — они не предоставляются
- Фокусируйся на учебных метриках и паттернах
- Давай практичные рекомендации для улучшения прогресса
- Отвечай на русском языке
- Структурируй ответ четко и лаконично

Формат ответа:
## Общая оценка
[Краткая оценка текущего прогресса: отлично / хорошо / требует внимания / критично]

## Сильные стороны
[Список 2-3 сильных сторон]

## Области для улучшения
[Список 2-3 областей с конкретными рекомендациями]

## Рекомендации
[3-5 конкретных шагов для улучшения результатов]`

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Check AI configuration (without exposing keys in response)
    if (!AI_API_KEY) {
      console.warn("[AI-Student] AI API key not configured")
      return NextResponse.json(
        { error: "AI-анализ недоступен. Свяжитесь с администратором." },
        { status: 503 }
      )
    }

    const { studentId } = await request.json()

    if (!studentId || typeof studentId !== "string") {
      return NextResponse.json(
        { error: "studentId обязателен" },
        { status: 400 }
      )
    }

    // Log request (without PII)
    console.log(`[AI-Student] Analysis requested for student ID: ${studentId.substring(0, 8)}...`)

    // Fetch student data from DB
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true, // Only for response display, not sent to AI
        totalXP: true,
        currentStreak: true,
        activityDays: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
        enrollments: {
          include: {
            trail: {
              select: {
                id: true,
                title: true,
                modules: {
                  select: { id: true, title: true },
                },
              },
            },
          },
        },
        moduleProgress: {
          where: { status: "COMPLETED" },
          select: {
            module: {
              select: {
                id: true,
                title: true,
                trailId: true,
              },
            },
          },
        },
        submissions: {
          select: {
            status: true,
            module: {
              select: {
                id: true,
                title: true,
                trailId: true,
              },
            },
          },
        },
        reviews: {
          select: {
            score: true,
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: "Студент не найден" },
        { status: 404 }
      )
    }

    // Calculate days since last activity
    const lastActivity = student.activityDays[0]?.date
    const daysSinceLastActivity = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
      : null

    // Calculate average score
    const scores = student.reviews.map(r => r.score).filter((s): s is number => s !== null)
    const averageScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null

    // Calculate total modules available
    const totalModulesAvailable = student.enrollments.reduce(
      (sum, e) => sum + e.trail.modules.length,
      0
    )

    // Build trail progress (without PII)
    const trailProgressMap = new Map<string, {
      trailTitle: string
      modulesCompleted: number
      totalModules: number
      approved: number
      pending: number
      revision: number
      scores: number[]
    }>()

    for (const enrollment of student.enrollments) {
      trailProgressMap.set(enrollment.trail.id, {
        trailTitle: enrollment.trail.title,
        modulesCompleted: 0,
        totalModules: enrollment.trail.modules.length,
        approved: 0,
        pending: 0,
        revision: 0,
        scores: [],
      })
    }

    // Count completed modules per trail
    for (const progress of student.moduleProgress) {
      const trailId = progress.module.trailId
      if (trailId && trailProgressMap.has(trailId)) {
        const tp = trailProgressMap.get(trailId)!
        tp.modulesCompleted++
      }
    }

    // Count submissions per trail
    for (const submission of student.submissions) {
      const trailId = submission.module.trailId
      if (trailId && trailProgressMap.has(trailId)) {
        const tp = trailProgressMap.get(trailId)!
        if (submission.status === "APPROVED") tp.approved++
        else if (submission.status === "PENDING") tp.pending++
        else if (submission.status === "REVISION") tp.revision++
      }
    }

    // Build trail progress array
    const trailProgress = Array.from(trailProgressMap.values()).map(tp => ({
      trailTitle: tp.trailTitle,
      modulesCompleted: tp.modulesCompleted,
      totalModules: tp.totalModules,
      completionPercent: tp.totalModules > 0
        ? Math.round((tp.modulesCompleted / tp.totalModules) * 100)
        : 0,
      avgScore: tp.scores.length > 0
        ? Math.round((tp.scores.reduce((a, b) => a + b, 0) / tp.scores.length) * 10) / 10
        : null,
      submissions: {
        approved: tp.approved,
        pending: tp.pending,
        revision: tp.revision,
      },
    }))

    // Identify strong and weak areas based on completion
    const completedModuleTitles = student.moduleProgress.map(p => p.module.title)
    const allModuleTitles = student.enrollments.flatMap(e => e.trail.modules.map(m => m.title))
    const incompleteModuleTitles = allModuleTitles.filter(t => !completedModuleTitles.includes(t))

    // Build anonymized payload for AI (no PII)
    const payload: StudentAnalyticsPayload = {
      studentId: studentId.substring(0, 8) + "...", // Truncated for AI
      metrics: {
        totalXP: student.totalXP,
        currentStreak: student.currentStreak,
        totalModulesCompleted: student.moduleProgress.length,
        totalModulesAvailable,
        averageScore,
        daysSinceLastActivity,
      },
      trailProgress,
      modulePatterns: {
        strongAreas: completedModuleTitles.slice(0, 5),
        weakAreas: incompleteModuleTitles.slice(0, 5),
        bottleneckModules: incompleteModuleTitles.slice(0, 3),
      },
    }

    console.log(`[AI-Student] Sending anonymized data to AI (${JSON.stringify(payload).length} bytes)`)

    // Call AI API
    const aiResponse = await fetch(AI_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": AI_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Проанализируй прогресс студента на основе следующих метрик:

${JSON.stringify(payload, null, 2)}

Дай оценку и рекомендации для улучшения результатов.`,
          },
        ],
      }),
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error(`[AI-Student] AI API error: ${aiResponse.status}`, errorText.substring(0, 200))
      return NextResponse.json(
        { error: "Ошибка AI-сервиса. Попробуйте позже." },
        { status: 502 }
      )
    }

    const aiData = await aiResponse.json()
    const analysis = aiData.content?.[0]?.text

    if (!analysis) {
      console.error("[AI-Student] Empty response from AI")
      return NextResponse.json(
        { error: "AI не вернул анализ" },
        { status: 502 }
      )
    }

    console.log(`[AI-Student] Analysis complete for student ${studentId.substring(0, 8)}...`)

    // Return analysis with student name (for UI display only)
    return NextResponse.json({
      success: true,
      studentName: student.name,
      analysis,
      metrics: payload.metrics,
    })
  } catch (error) {
    console.error("[AI-Student] Error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    )
  }
}
