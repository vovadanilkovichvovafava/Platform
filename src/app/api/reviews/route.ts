import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const reviewSchema = z.object({
  submissionId: z.string().min(1),
  moduleId: z.string().min(1),
  userId: z.string().min(1),
  score: z.number().min(0).max(10),
  status: z.enum(["APPROVED", "REVISION"]),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  comment: z.string().optional(),
  modulePoints: z.number().default(0),
})

// Helper to update TaskProgress based on project level and result
async function updateTaskProgress(
  userId: string,
  trailId: string,
  level: string,
  isApproved: boolean
) {
  const taskProgress = await prisma.taskProgress.findUnique({
    where: { userId_trailId: { userId, trailId } },
  })

  if (!taskProgress) return

  // Map module.level to TaskProgress level names
  const levelMap: Record<string, string> = {
    Junior: "JUNIOR",
    Middle: "MIDDLE",
    Senior: "SENIOR",
  }
  const normalizedLevel = levelMap[level] || level

  let updateData: Record<string, string> = {}

  if (normalizedLevel === "MIDDLE") {
    if (isApproved) {
      // Middle passed → unlock Senior
      updateData = {
        middleStatus: "PASSED",
        seniorStatus: "PENDING",
        currentLevel: "SENIOR",
      }
    } else {
      // Middle failed → unlock Junior
      updateData = {
        middleStatus: "FAILED",
        juniorStatus: "PENDING",
        currentLevel: "JUNIOR",
      }
    }
  } else if (normalizedLevel === "JUNIOR") {
    updateData = {
      juniorStatus: isApproved ? "PASSED" : "FAILED",
    }
  } else if (normalizedLevel === "SENIOR") {
    updateData = {
      seniorStatus: isApproved ? "PASSED" : "FAILED",
    }
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.taskProgress.update({
      where: { userId_trailId: { userId, trailId } },
      data: updateData,
    })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const body = await request.json()
    const data = reviewSchema.parse(body)

    // Create review
    const review = await prisma.review.create({
      data: {
        submissionId: data.submissionId,
        reviewerId: session.user.id,
        score: data.score,
        strengths: data.strengths || null,
        improvements: data.improvements || null,
        comment: data.comment || null,
        criteria: null,
      },
    })

    // Update submission status
    await prisma.submission.update({
      where: { id: data.submissionId },
      data: { status: data.status },
    })

    // Get module info for task progress update
    const currentModule = await prisma.module.findUnique({
      where: { id: data.moduleId },
      include: { trail: true },
    })

    // Update TaskProgress for project modules (level progression)
    if (currentModule && currentModule.type === "PROJECT") {
      await updateTaskProgress(
        data.userId,
        currentModule.trailId,
        currentModule.level,
        data.status === "APPROVED"
      )
    }

    // If approved, update module progress and add XP
    if (data.status === "APPROVED") {
      // Update module progress
      await prisma.moduleProgress.upsert({
        where: {
          userId_moduleId: {
            userId: data.userId,
            moduleId: data.moduleId,
          },
        },
        update: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
        create: {
          userId: data.userId,
          moduleId: data.moduleId,
          status: "COMPLETED",
          startedAt: new Date(),
          completedAt: new Date(),
        },
      })

      // Add XP to user
      if (data.modulePoints > 0) {
        await prisma.user.update({
          where: { id: data.userId },
          data: {
            totalXP: { increment: data.modulePoints },
          },
        })
      }
    }

    return NextResponse.json(review)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Review error:", error)
    return NextResponse.json(
      { error: "Ошибка при сохранении оценки" },
      { status: 500 }
    )
  }
}
