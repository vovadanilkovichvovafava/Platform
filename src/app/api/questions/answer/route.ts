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
    const { questionId, selectedAnswer, isInteractive, interactiveResult } = answerSchema.parse(body)

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

      // Update attempt
      const newAttempts = attempt.attempts + 1
      const earnedScore = isCorrect ? calculateScore(question.module.points / 3, newAttempts) : 0

      attempt = await prisma.questionAttempt.update({
        where: { id: attempt.id },
        data: {
          attempts: newAttempts,
          isCorrect: isCorrect,
          earnedScore: isCorrect ? earnedScore : attempt.earnedScore,
        },
      })

      // Update user XP if correct
      if (isCorrect) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { totalXP: { increment: earnedScore } },
        })
      }

      return NextResponse.json({
        success: true,
        isCorrect,
        attempts: newAttempts,
        earnedScore: isCorrect ? earnedScore : 0,
        correctAnswer: !isCorrect && newAttempts >= 3 ? question.correctAnswer : undefined,
        message: isCorrect
          ? `Правильно! +${earnedScore} XP`
          : newAttempts >= 3
          ? "Неправильно. Попытки исчерпаны."
          : `Неправильно. Осталось попыток: ${3 - newAttempts}`,
      })
    } else {
      // First attempt
      const earnedScore = isCorrect ? calculateScore(question.module.points / 3, 1) : 0

      attempt = await prisma.questionAttempt.create({
        data: {
          userId: session.user.id,
          questionId: questionId,
          attempts: 1,
          isCorrect: isCorrect,
          earnedScore: earnedScore,
        },
      })

      // Update user XP if correct
      if (isCorrect) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { totalXP: { increment: earnedScore } },
        })
      }

      return NextResponse.json({
        success: true,
        isCorrect,
        attempts: 1,
        earnedScore,
        message: isCorrect
          ? `Правильно! +${earnedScore} XP (100% за первую попытку)`
          : "Неправильно. Осталось попыток: 2",
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
