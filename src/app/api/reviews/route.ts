import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrivileged, privilegedHasTrailAccess } from "@/lib/admin-access"
import { processAchievementEvent } from "@/lib/achievement-service"
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

    // Allow TEACHER, CO_ADMIN, and ADMIN roles
    if (!session?.user?.id || !isPrivileged(session.user.role)) {
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

    // Verify user has access to this trail (ADMIN always, CO_ADMIN/TEACHER by assignment)
    const hasAccess = await privilegedHasTrailAccess(session.user.id, session.user.role, moduleForCheck.trailId)
    if (!hasAccess) {
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

    // Get module info for task progress update and notification
    const currentModule = await prisma.module.findUnique({
      where: { id: data.moduleId },
      include: { trail: true },
    })

    // Create notification for the student
    const statusMessages: Record<string, string> = {
      APPROVED: "Работа принята!",
      REVISION: "Работа отправлена на доработку",
      FAILED: "Работа не принята",
    }

    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: "REVIEW_RECEIVED",
        title: statusMessages[data.status],
        message: currentModule
          ? `Ваша работа по модулю "${currentModule.title}" получила оценку ${data.score}/10`
          : `Ваша работа получила оценку ${data.score}/10`,
        link: `/my-work`,
      },
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

      // Auto-start next assessment module after approval
      // In STRICT mode (allowSkipReview=false) the next module was NOT started on submission,
      // so we start it now after teacher review. In FREE mode this is a harmless no-op
      // since the next module was already started on submission.
      if (currentModule && currentModule.type !== "PROJECT") {
        const nextModule = await prisma.module.findFirst({
          where: {
            trailId: currentModule.trailId,
            order: { gt: currentModule.order },
            type: { not: "PROJECT" },
          },
          orderBy: { order: "asc" },
        })

        if (nextModule) {
          await prisma.moduleProgress.upsert({
            where: {
              userId_moduleId: {
                userId: data.userId,
                moduleId: nextModule.id,
              },
            },
            update: {},
            create: {
              userId: data.userId,
              moduleId: nextModule.id,
              status: "IN_PROGRESS",
            },
          })
        }
      }
    }

    // Синхронизация уведомлений: автопрочтение SUBMISSION_PENDING для ВСЕХ учителей
    // Работа проверена — уведомления о ней у всех получателей больше не актуальны
    prisma.notification.updateMany({
      where: {
        type: "SUBMISSION_PENDING",
        link: `/teacher/reviews/${data.submissionId}`,
        isRead: false,
      },
      data: { isRead: true },
    }).catch(() => {})

    // Check and award achievements for the student after review
    // Non-blocking: don't fail the review if achievement check errors
    processAchievementEvent("REVIEW_RECEIVED", data.userId).catch((err) =>
      console.error("Achievement check after review failed:", err)
    )

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
