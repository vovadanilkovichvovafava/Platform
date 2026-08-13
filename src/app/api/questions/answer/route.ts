import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit"
import { recordActivity } from "@/lib/activity"
import { checkTrailPasswordAccess } from "@/lib/trail-password"

const answerSchema = z.object({
  questionId: z.string().min(1, "ID вопроса обязателен"),
  selectedAnswer: z.number().min(0, "Ответ должен быть числом"),
  // Fields for interactive question types (MATCHING, ORDERING, CASE_ANALYSIS)
  isInteractive: z.boolean().optional(),
  interactiveResult: z.boolean().optional(),
  interactiveAttempts: z.number().optional(),
})

// Scoring based on attempts: 1st = 100%, 2nd = 65%, 3rd = 35%
function calculateScore(basePoints: number, attempts: number): number {
  if (attempts === 1) return Math.round(basePoints * 1.0)
  if (attempts === 2) return Math.round(basePoints * 0.65)
  return Math.round(basePoints * 0.35)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Rate limiting - 60 ответов в минуту
    const rateLimit = checkRateLimit(`answers:${session.user.id}`, RATE_LIMITS.api)
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn)
    }

    // Record daily activity
    await recordActivity(session.user.id)

    const body = await request.json()
    const { questionId, selectedAnswer, isInteractive, interactiveResult, interactiveAttempts } = answerSchema.parse(body)

    // Get question with module and trail info
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        module: {
          include: {
            trail: {
              select: {
                id: true,
                isPasswordProtected: true,
              },
            },
          },
        },
      },
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    // Check trail password access
    if (question.module.trail.isPasswordProtected) {
      const passwordAccess = await checkTrailPasswordAccess(question.module.trail.id, session.user.id)
      if (!passwordAccess.hasAccess) {
        return NextResponse.json({ error: "Доступ запрещён. Требуется пароль к trail." }, { status: 403 })
      }
    }

    // Get or create attempt record
    let attempt = await prisma.questionAttempt.findUnique({
      where: {
        userId_questionId: {
          userId: session.user.id,
          questionId: questionId,
        },
      },
    })

    // Check if this is a replay (module XP already earned in a previous completion)
    const moduleProgress = await prisma.moduleProgress.findUnique({
      where: {
        userId_moduleId: {
          userId: session.user.id,
          moduleId: question.module.id,
        },
      },
      select: { hasEarnedXP: true },
    })
    const isReplay = moduleProgress?.hasEarnedXP === true

    // For interactive types (MATCHING, ORDERING, CASE_ANALYSIS) use the result from client
    // For SINGLE_CHOICE compare selectedAnswer with correctAnswer
    const isCorrect = isInteractive ? (interactiveResult === true) : (selectedAnswer === question.correctAnswer)

    if (attempt) {
      // Already answered correctly - no more attempts allowed
      if (attempt.isCorrect) {
        return NextResponse.json({
          success: true,
          isCorrect: true,
          alreadyAnswered: true,
          earnedScore: attempt.earnedScore,
          message: "Вы уже правильно ответили на этот вопрос",
        })
      }

      // Max 3 attempts
      if (attempt.attempts >= 3) {
        return NextResponse.json({
          success: false,
          isCorrect: false,
          attempts: attempt.attempts,
          earnedScore: 0,
          message: "Вы исчерпали все попытки",
        })
      }

      // Update attempt — no XP on replay
      const newAttempts = attempt.attempts + 1
      const earnedScore = isCorrect && !isReplay ? calculateScore(question.module.points / 3, newAttempts) : 0

      attempt = await prisma.questionAttempt.update({
        where: { id: attempt.id },
        data: {
          attempts: newAttempts,
          isCorrect: isCorrect,
          earnedScore: isCorrect ? earnedScore : attempt.earnedScore,
        },
      })

      // Update user XP if correct and not a replay
      if (isCorrect && !isReplay) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { totalXP: { increment: earnedScore } },
        })
      }

      let message: string
      if (isCorrect) {
        if (isReplay) {
          message = "Правильно!"
        } else if (newAttempts === 2) {
          message = `Правильно! +${earnedScore} XP (65% за вторую попытку)`
        } else {
          message = `Правильно! +${earnedScore} XP (35% за третью попытку)`
        }
      } else if (newAttempts >= 3) {
        message = "Неправильно. Попытки исчерпаны."
      } else {
        message = `Неправильно. Осталось попыток: ${3 - newAttempts}`
      }

      return NextResponse.json({
        success: true,
        isCorrect,
        attempts: newAttempts,
        earnedScore: isCorrect ? earnedScore : 0,
        correctAnswer: !isCorrect && newAttempts >= 3 ? question.correctAnswer : undefined,
        message,
      })
    } else {
      // For interactive exercises, use the client-reported attempt count (capped at 3)
      // Interactive exercises handle retries client-side and only report once on completion
      const actualAttempts = (isInteractive && interactiveAttempts)
        ? Math.max(1, Math.min(interactiveAttempts, 3))
        : 1

      // No XP on replay
      const earnedScore = isCorrect && !isReplay ? calculateScore(question.module.points / 3, actualAttempts) : 0

      attempt = await prisma.questionAttempt.create({
        data: {
          userId: session.user.id,
          questionId: questionId,
          attempts: actualAttempts,
          isCorrect: isCorrect,
          earnedScore: earnedScore,
        },
      })

      // Update user XP if correct and not a replay
      if (isCorrect && !isReplay && earnedScore > 0) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { totalXP: { increment: earnedScore } },
        })
      }

      let message: string
      if (isCorrect) {
        if (isReplay) {
          message = "Правильно!"
        } else if (actualAttempts === 1) {
          message = `Правильно! +${earnedScore} XP (100% за первую попытку)`
        } else if (actualAttempts === 2) {
          message = `Правильно! +${earnedScore} XP (65% за вторую попытку)`
        } else {
          message = `Правильно! +${earnedScore} XP (35% за третью попытку)`
        }
      } else {
        message = `Неправильно. Осталось попыток: ${3 - actualAttempts}`
      }

      return NextResponse.json({
        success: true,
        isCorrect,
        attempts: actualAttempts,
        earnedScore,
        message,
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error answering question:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
