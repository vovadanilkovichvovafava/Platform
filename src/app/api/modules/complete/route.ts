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
    const courseModule = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { trail: true },
    })

    if (!courseModule) {
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

    // Check if user already earned XP for this module
    const existingProgress = await prisma.moduleProgress.findUnique({
      where: {
        userId_moduleId: {
          userId: session.user.id,
          moduleId: moduleId,
        },
      },
    })
    const alreadyEarnedXP = existingProgress?.hasEarnedXP || false

    // Calculate earned XP from quiz (only if not already earned)
    let earnedXP = 0
    if (!alreadyEarnedXP) {
      const quizAttempts = await prisma.questionAttempt.findMany({
        where: {
          userId: session.user.id,
          questionId: { in: questions.map((q) => q.id) },
        },
      })
      earnedXP = quizAttempts.reduce((sum, a) => sum + a.earnedScore, 0)
    }

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
        hasEarnedXP: true,
      },
      create: {
        userId: session.user.id,
        moduleId: moduleId,
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
        hasEarnedXP: true,
      },
    })

    // Find next module and start it
    const nextModule = await prisma.module.findFirst({
      where: {
        trailId: courseModule.trailId,
        order: { gt: courseModule.order },
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
