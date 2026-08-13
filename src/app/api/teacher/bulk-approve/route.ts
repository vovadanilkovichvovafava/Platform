import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrivileged, privilegedHasTrailAccess } from "@/lib/admin-access"
import { processAchievementEvent } from "@/lib/achievement-service"
import { z } from "zod"

const BULK_SCORE = 7

const bulkApproveSchema = z.object({
  submissionIds: z.array(z.string().min(1)).min(1).max(100),
})

// Update TaskProgress for project modules when approved (mirrors logic in /api/reviews)
async function updateTaskProgressOnApprove(
  userId: string,
  trailId: string,
  level: string,
) {
  const taskProgress = await prisma.taskProgress.findUnique({
    where: { userId_trailId: { userId, trailId } },
  })

  if (!taskProgress) return

  const levelMap: Record<string, string> = {
    Junior: "JUNIOR",
    Middle: "MIDDLE",
    Senior: "SENIOR",
  }
  const normalizedLevel = levelMap[level] || level

  let updateData: Record<string, string> = {}

  if (normalizedLevel === "MIDDLE") {
    updateData = {
      middleStatus: "PASSED",
      seniorStatus: "PENDING",
      currentLevel: "SENIOR",
    }
  } else if (normalizedLevel === "JUNIOR") {
    updateData = { juniorStatus: "PASSED" }
  } else if (normalizedLevel === "SENIOR") {
    updateData = { seniorStatus: "PASSED" }
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

    if (!session?.user?.id || !isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const body = await request.json()
    const { submissionIds } = bulkApproveSchema.parse(body)

    // Dedupe ids
    const uniqueIds = Array.from(new Set(submissionIds))

    const approvedIds: string[] = []
    const skipped: { id: string; reason: string }[] = []

    for (const submissionId of uniqueIds) {
      // Re-fetch each submission fresh to avoid race conditions and ensure status is still PENDING
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: {
          id: true,
          status: true,
          userId: true,
          moduleId: true,
        },
      })

      if (!submission) {
        skipped.push({ id: submissionId, reason: "not_found" })
        continue
      }

      if (submission.status !== "PENDING") {
        skipped.push({ id: submissionId, reason: "not_pending" })
        continue
      }

      // Check for existing review (Review has unique on submissionId)
      const existingReview = await prisma.review.findUnique({
        where: { submissionId: submission.id },
        select: { id: true },
      })
      if (existingReview) {
        skipped.push({ id: submissionId, reason: "already_reviewed" })
        continue
      }

      const moduleInfo = await prisma.module.findUnique({
        where: { id: submission.moduleId },
        select: {
          id: true,
          title: true,
          type: true,
          level: true,
          points: true,
          order: true,
          trailId: true,
        },
      })

      if (!moduleInfo) {
        skipped.push({ id: submissionId, reason: "module_not_found" })
        continue
      }

      const hasAccess = await privilegedHasTrailAccess(
        session.user.id,
        session.user.role,
        moduleInfo.trailId,
      )
      if (!hasAccess) {
        skipped.push({ id: submissionId, reason: "no_trail_access" })
        continue
      }

      // Create review
      await prisma.review.create({
        data: {
          submissionId: submission.id,
          reviewerId: session.user.id,
          score: BULK_SCORE,
          strengths: null,
          improvements: null,
          comment: null,
          criteria: null,
        },
      })

      // Update submission status
      await prisma.submission.update({
        where: { id: submission.id },
        data: { status: "APPROVED" },
      })

      // Notify student
      await prisma.notification.create({
        data: {
          userId: submission.userId,
          type: "REVIEW_RECEIVED",
          title: "Работа принята!",
          message: `Ваша работа по модулю "${moduleInfo.title}" получила оценку ${BULK_SCORE}/10`,
          link: `/my-work`,
        },
      })

      // Project level progression
      if (moduleInfo.type === "PROJECT") {
        await updateTaskProgressOnApprove(submission.userId, moduleInfo.trailId, moduleInfo.level)
      }

      // Mark module as completed
      await prisma.moduleProgress.upsert({
        where: {
          userId_moduleId: {
            userId: submission.userId,
            moduleId: submission.moduleId,
          },
        },
        update: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
        create: {
          userId: submission.userId,
          moduleId: submission.moduleId,
          status: "COMPLETED",
          startedAt: new Date(),
          completedAt: new Date(),
        },
      })

      // Add XP
      if (moduleInfo.points > 0) {
        await prisma.user.update({
          where: { id: submission.userId },
          data: {
            totalXP: { increment: moduleInfo.points },
          },
        })
      }

      // Auto-start next non-PROJECT module (matches existing single-review behavior)
      if (moduleInfo.type !== "PROJECT") {
        const nextModule = await prisma.module.findFirst({
          where: {
            trailId: moduleInfo.trailId,
            order: { gt: moduleInfo.order },
            type: { not: "PROJECT" },
          },
          orderBy: { order: "asc" },
          select: { id: true },
        })

        if (nextModule) {
          await prisma.moduleProgress.upsert({
            where: {
              userId_moduleId: {
                userId: submission.userId,
                moduleId: nextModule.id,
              },
            },
            update: {},
            create: {
              userId: submission.userId,
              moduleId: nextModule.id,
              status: "IN_PROGRESS",
            },
          })
        }
      }

      // Auto-read pending notifications about this submission for all teachers
      prisma.notification.updateMany({
        where: {
          type: "SUBMISSION_PENDING",
          link: `/teacher/reviews/${submission.id}`,
          isRead: false,
        },
        data: { isRead: true },
      }).catch(() => {})

      // Achievement event (non-blocking)
      processAchievementEvent("REVIEW_RECEIVED", submission.userId).catch((err) =>
        console.error("Achievement check after bulk approve failed:", err)
      )

      approvedIds.push(submission.id)
    }

    return NextResponse.json({
      approvedCount: approvedIds.length,
      approvedIds,
      skipped,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Bulk approve error:", error)
    return NextResponse.json(
      { error: "Ошибка при массовом принятии работ" },
      { status: 500 }
    )
  }
}
