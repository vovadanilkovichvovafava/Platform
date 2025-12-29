import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { moduleId } = await request.json()

    if (!moduleId) {
      return NextResponse.json({ error: "Missing moduleId" }, { status: 400 })
    }

    // Get module with trail info
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { trail: true },
    })

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    // Verify all questions are answered
    const questions = await prisma.question.findMany({
      where: { moduleId },
    })

    if (questions.length > 0) {
      const attempts = await prisma.questionAttempt.findMany({
        where: {
          userId: session.user.id,
          questionId: { in: questions.map((q) => q.id) },
        },
      })

      const answeredCount = attempts.filter(
        (a) => a.isCorrect || a.attempts >= 3
      ).length

      if (answeredCount < questions.length) {
        return NextResponse.json(
          { error: "Not all questions answered" },
          { status: 400 }
        )
      }
    }

    // Calculate earned XP from quiz
    const quizAttempts = await prisma.questionAttempt.findMany({
      where: {
        userId: session.user.id,
        questionId: { in: questions.map((q) => q.id) },
      },
    })
    const earnedXP = quizAttempts.reduce((sum, a) => sum + a.earnedScore, 0)

    // Update or create progress
    await prisma.moduleProgress.upsert({
      where: {
        userId_moduleId: {
          userId: session.user.id,
          moduleId: moduleId,
        },
      },
      update: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        moduleId: moduleId,
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
      },
    })

    // Find next module and start it
    const nextModule = await prisma.module.findFirst({
      where: {
        trailId: module.trailId,
        order: { gt: module.order },
        type: { not: "PROJECT" }, // Only auto-start non-project modules
      },
      orderBy: { order: "asc" },
    })

    if (nextModule) {
      await prisma.moduleProgress.upsert({
        where: {
          userId_moduleId: {
            userId: session.user.id,
            moduleId: nextModule.id,
          },
        },
        update: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          moduleId: nextModule.id,
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      earnedXP,
      nextModuleSlug: nextModule?.slug,
    })
  } catch (error) {
    console.error("Error completing module:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
