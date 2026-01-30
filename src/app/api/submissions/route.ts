import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit"
import { recordActivity } from "@/lib/activity"
import {
  sendTelegramMessage,
  buildSubmissionNotificationMessage,
  getReviewUrl,
  isTelegramConfigured,
} from "@/lib/telegram"

const submissionSchema = z.object({
  moduleId: z.string().min(1),
  githubUrl: z
    .string()
    .url()
    .refine(
      (url) => url.startsWith("https://github.com/"),
      "GitHub URL должен начинаться с https://github.com/"
    )
    .optional()
    .or(z.literal("")),
  deployUrl: z
    .string()
    .url()
    .refine(
      (url) => url.startsWith("https://"),
      "URL деплоя должен использовать HTTPS"
    )
    .optional()
    .or(z.literal("")),
  fileUrl: z
    .string()
    .url("Некорректная ссылка на файл")
    .refine(
      (url) => url.startsWith("https://"),
      "Ссылка должна использовать HTTPS"
    )
    .optional()
    .or(z.literal("")),
  comment: z.string().max(2000, "Комментарий слишком длинный").optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Rate limiting - 10 отправок в час
    const rateLimit = checkRateLimit(`submissions:${session.user.id}`, RATE_LIMITS.submissions)
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn)
    }

    // Record daily activity
    await recordActivity(session.user.id)

    const body = await request.json()
    const data = submissionSchema.parse(body)

    if (!data.githubUrl && !data.deployUrl && !data.fileUrl) {
      return NextResponse.json(
        { error: "Укажите хотя бы одну ссылку (GitHub, деплой или файл)" },
        { status: 400 }
      )
    }

    // Check if module exists and is a project
    const courseModule = await prisma.module.findUnique({
      where: { id: data.moduleId },
    })

    if (!courseModule) {
      return NextResponse.json(
        { error: "Модуль не найден" },
        { status: 404 }
      )
    }

    // Разрешаем отправку для проектов и модулей с requiresSubmission
    if (courseModule.type !== "PROJECT" && !courseModule.requiresSubmission) {
      return NextResponse.json(
        { error: "Этот модуль не требует отправки работы" },
        { status: 400 }
      )
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_trailId: {
          userId: session.user.id,
          trailId: courseModule.trailId,
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: "Вы не записаны на этот trail" },
        { status: 403 }
      )
    }

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        userId: session.user.id,
        moduleId: data.moduleId,
        githubUrl: data.githubUrl || null,
        deployUrl: data.deployUrl || null,
        fileUrl: data.fileUrl || null,
        comment: data.comment || null,
        status: "PENDING",
      },
    })

    // Notify teachers about new submission
    // Get trail to check teacherVisibility and get title for notifications
    const trail = await prisma.trail.findUnique({
      where: { id: courseModule.trailId },
      select: { teacherVisibility: true, title: true },
    })

    // Collect user IDs to notify (teachers and admins)
    const userIdsToNotify = new Set<string>()

    // 1. Always notify specifically assigned teachers
    const trailTeachers = await prisma.trailTeacher.findMany({
      where: { trailId: courseModule.trailId },
      select: { teacherId: true },
    })
    trailTeachers.forEach((tt: { teacherId: string }) => userIdsToNotify.add(tt.teacherId))

    // 2. If trail is visible to all teachers, notify all teachers
    if (trail?.teacherVisibility === "ALL_TEACHERS") {
      const allTeachers = await prisma.user.findMany({
        where: { role: "TEACHER" },
        select: { id: true },
      })
      allTeachers.forEach((t: { id: string }) => userIdsToNotify.add(t.id))
    }

    // 3. Always notify all admins
    const allAdmins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    })
    allAdmins.forEach((a: { id: string }) => userIdsToNotify.add(a.id))

    // Create notifications for all teachers and admins
    if (userIdsToNotify.size > 0) {
      await prisma.notification.createMany({
        data: Array.from(userIdsToNotify).map((userId) => ({
          userId: userId,
          type: "SUBMISSION_PENDING",
          title: "Новая работа на проверку",
          message: `${session.user.name} отправил(а) работу "${courseModule.title}"`,
          link: `/teacher/reviews/${submission.id}`,
        })),
      })

      // Send Telegram notifications (non-blocking, errors don't affect main flow)
      if (isTelegramConfigured()) {
        sendTelegramNotifications({
          submissionId: submission.id,
          userIds: Array.from(userIdsToNotify),
          studentName: session.user.name || "Студент",
          moduleTitle: courseModule.title,
          trailTitle: trail?.title,
        }).catch(() => {
          // Silently ignore - logged inside function
        })
      }
    }

    // Update module progress to in_progress if not already
    await prisma.moduleProgress.upsert({
      where: {
        userId_moduleId: {
          userId: session.user.id,
          moduleId: data.moduleId,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        moduleId: data.moduleId,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    })

    return NextResponse.json(submission)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Submission error:", error)
    return NextResponse.json(
      { error: "Ошибка при отправке работы" },
      { status: 500 }
    )
  }
}

/**
 * Send Telegram notifications to teachers (idempotent, non-blocking)
 * Errors are logged safely without exposing secrets
 */
async function sendTelegramNotifications(params: {
  submissionId: string
  userIds: string[]
  studentName: string
  moduleTitle: string
  trailTitle?: string
}): Promise<void> {
  const { submissionId, userIds, studentName, moduleTitle, trailTitle } = params

  try {
    // Idempotency check: skip if already notified
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { telegramNotifiedAt: true },
    })

    if (submission?.telegramNotifiedAt) {
      return // Already notified
    }

    // Get users with Telegram enabled
    const usersWithTelegram = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        telegramChatId: { not: null },
        telegramEnabled: true,
      },
      select: {
        id: true,
        telegramChatId: true,
      },
    })

    if (usersWithTelegram.length === 0) {
      return // No users with Telegram
    }

    // Build message
    const reviewUrl = getReviewUrl(submissionId)
    const message = buildSubmissionNotificationMessage({
      studentName,
      moduleTitle,
      trailTitle,
      reviewUrl,
    })

    // Send to all users (parallel, but don't fail fast)
    const results = await Promise.allSettled(
      usersWithTelegram.map((user: { id: string; telegramChatId: string | null }) =>
        sendTelegramMessage(user.telegramChatId!, message)
      )
    )

    // Log failures (without sensitive data)
    const failures = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success))
    if (failures.length > 0) {
      console.warn(`[Telegram] ${failures.length}/${usersWithTelegram.length} notifications failed for submission ${submissionId}`)
    }

    // Mark as notified (even if some failed - to prevent spam on retry)
    await prisma.submission.update({
      where: { id: submissionId },
      data: { telegramNotifiedAt: new Date() },
    })
  } catch (error) {
    // Log safely without exposing secrets
    console.error(
      "[Telegram] Error sending notifications:",
      error instanceof Error ? error.message : "Unknown"
    )
  }
}
