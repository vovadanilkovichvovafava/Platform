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
  status: z.enum(["APPROVED", "REVISION", "FAILED"]),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  comment: z.string().optional(),
  modulePoints: z.number().default(0),
})

// Helper to check if teacher is assigned to trail
async function isTeacherAssignedToTrail(teacherId: string, trailId: string): Promise<boolean> {
  const assignment = await prisma.trailTeacher.findUnique({
    where: {
      trailId_teacherId: { trailId, teacherId },
    },
  })
  return !!assignment
}

// Helper to update TaskProgress based on project level and result
// status: APPROVED = go up, REVISION = stay (retry), FAILED = go down
async function updateTaskProgress(
  userId: string,
  trailId: string,
  level: string,
  status: "APPROVED" | "REVISION" | "FAILED"
) {
  // REVISION means retry - no level change
  if (status === "REVISION") return

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
    if (status === "APPROVED") {
      // Middle passed → unlock Senior
      updateData = {
        middleStatus: "PASSED",
        seniorStatus: "PENDING",
        currentLevel: "SENIOR",
      }
    } else if (status === "FAILED") {
      // Middle failed → fall to Junior
      updateData = {
        middleStatus: "FAILED",
        juniorStatus: "PENDING",
        currentLevel: "JUNIOR",
      }
    }
  } else if (normalizedLevel === "JUNIOR") {
    if (status === "APPROVED") {
      updateData = { juniorStatus: "PASSED" }
    } else if (status === "FAILED") {
      updateData = { juniorStatus: "FAILED" }
    }
  } else if (normalizedLevel === "SENIOR") {
    if (status === "APPROVED") {
      updateData = { seniorStatus: "PASSED" }
    } else if (status === "FAILED") {
      // Senior failed → fall back to Middle
      updateData = {
        seniorStatus: "FAILED",
        middleStatus: "PENDING",
        currentLevel: "MIDDLE",
      }
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

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const body = await request.json()
    const data = reviewSchema.parse(body)

    // Get module to check trail assignment
    const moduleForCheck = await prisma.module.findUnique({
      where: { id: data.moduleId },
      select: { trailId: true },
    })

    if (!moduleForCheck) {
      return NextResponse.json({ error: "Модуль не найден" }, { status: 404 })
    }

    // Verify teacher is assigned to this trail
    const isAssigned = await isTeacherAssignedToTrail(session.user.id, moduleForCheck.trailId)
    if (!isAssigned) {
      return NextResponse.json({ error: "Вы не назначены на этот trail" }, { status: 403 })
    }

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
    // APPROVED = go up, FAILED = go down, REVISION = stay and retry
    if (currentModule && currentModule.type === "PROJECT") {
      await updateTaskProgress(
        data.userId,
        currentModule.trailId,
        currentModule.level,
        data.status as "APPROVED" | "REVISION" | "FAILED"
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
