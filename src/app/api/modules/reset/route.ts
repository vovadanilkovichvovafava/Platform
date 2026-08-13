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

    // Get module
    const courseModule = await prisma.module.findUnique({
      where: { id: moduleId },
    })

    if (!courseModule) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    // Only allow reset for THEORY and PRACTICE modules
    if (courseModule.type === "PROJECT") {
      return NextResponse.json(
        { error: "Cannot reset PROJECT modules" },
        { status: 400 }
      )
    }

    // Check if module was completed
    const progress = await prisma.moduleProgress.findUnique({
      where: {
        userId_moduleId: {
          userId: session.user.id,
          moduleId: moduleId,
        },
      },
    })

    if (!progress || progress.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Module not completed yet" },
        { status: 400 }
      )
    }

    // Get all questions for this module
    const questions = await prisma.question.findMany({
      where: { moduleId },
      select: { id: true },
    })

    // Delete all question attempts for this module
    if (questions.length > 0) {
      await prisma.questionAttempt.deleteMany({
        where: {
          userId: session.user.id,
          questionId: { in: questions.map((q) => q.id) },
        },
      })
    }

    // Reset module progress to IN_PROGRESS (keep hasEarnedXP = true)
    await prisma.moduleProgress.update({
      where: {
        userId_moduleId: {
          userId: session.user.id,
          moduleId: moduleId,
        },
      },
      data: {
        status: "IN_PROGRESS",
        completedAt: null,
        hasEarnedXP: true, // Mark that XP was already earned
      },
    })

    return NextResponse.json({
      success: true,
      message: "Module reset successfully. No XP will be awarded on completion.",
    })
  } catch (error) {
    console.error("Error resetting module:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
