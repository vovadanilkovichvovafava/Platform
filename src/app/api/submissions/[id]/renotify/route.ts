import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  sendTelegramMessage,
  buildSubmissionNotificationMessage,
  getReviewUrl,
  isTelegramConfigured,
} from "@/lib/telegram"

// 24 hours in milliseconds
const RENOTIFY_COOLDOWN_MS = 24 * 60 * 60 * 1000

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Get submission with module and trail info
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true },
        },
        module: {
          select: {
            id: true,
            title: true,
            trailId: true,
            trail: {
              select: {
                id: true,
                title: true,
                teacherVisibility: true,
              },
            },
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Работа не найдена" }, { status: 404 })
    }

    // Only the owner can request re-notification
    if (submission.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Вы не можете уведомить о чужой работе" },
        { status: 403 }
      )
    }

    // Only PENDING submissions can be re-notified
    if (submission.status !== "PENDING") {
      return NextResponse.json(
        { error: "Можно уведомлять только о работах на проверке" },
        { status: 400 }
      )
    }

    // Rate limit check: once per 24 hours
    if (submission.lastRenotifiedAt) {
      const timeSinceLastNotify = Date.now() - new Date(submission.lastRenotifiedAt).getTime()
      if (timeSinceLastNotify < RENOTIFY_COOLDOWN_MS) {
        const hoursRemaining = Math.ceil(
          (RENOTIFY_COOLDOWN_MS - timeSinceLastNotify) / (60 * 60 * 1000)
        )
        return NextResponse.json(
          {
            error: `Повторное уведомление можно отправить через ${hoursRemaining} ч.`,
            hoursRemaining,
          },
          { status: 429 }
        )
      }
    }

    const trail = submission.module.trail

    // Collect user IDs to notify (only those assigned to this trail)
    const userIdsToNotify = new Set<string>()

    // 1. Get specifically assigned teachers for this trail
    const trailTeachers = await prisma.trailTeacher.findMany({
      where: { trailId: trail.id },
      select: { teacherId: true },
    })
    trailTeachers.forEach((tt) => userIdsToNotify.add(tt.teacherId))

    // 2. If trail is visible to all teachers, add all teachers
    if (trail.teacherVisibility === "ALL_TEACHERS") {
      const allTeachers = await prisma.user.findMany({
        where: { role: "TEACHER" },
        select: { id: true },
      })
      allTeachers.forEach((t) => userIdsToNotify.add(t.id))
    }

    // 3. Add admins and co-admins who have access to this trail
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    })
    admins.forEach((a) => userIdsToNotify.add(a.id))

    // For CO_ADMINs, only add those with explicit access to this trail
    const coAdminsWithAccess = await prisma.adminTrailAccess.findMany({
      where: { trailId: trail.id },
      select: { adminId: true },
    })
    coAdminsWithAccess.forEach((ca) => userIdsToNotify.add(ca.adminId))

    if (userIdsToNotify.size === 0) {
      return NextResponse.json(
        { error: "Нет назначенных проверяющих для этого курса" },
        { status: 400 }
      )
    }

    // Create platform notifications (marked as repeat)
    await prisma.notification.createMany({
      data: Array.from(userIdsToNotify).map((userId) => ({
        userId,
        type: "SUBMISSION_PENDING",
        title: "Напоминание: работа ожидает проверки",
        message: `${submission.user.name} напоминает о работе "${submission.module.title}" (${trail.title}, повторное уведомление)`,
        link: `/teacher/reviews/${submission.id}`,
      })),
    })

    // Send Telegram notifications (non-blocking)
    if (isTelegramConfigured()) {
      sendRenotifyTelegram({
        submissionId: submission.id,
        userIds: Array.from(userIdsToNotify),
        studentName: submission.user.name || "Студент",
        moduleTitle: submission.module.title,
        trailTitle: trail.title,
      }).catch(() => {
        // Silently ignore - logged inside function
      })
    }

    // Update the lastRenotifiedAt timestamp
    await prisma.submission.update({
      where: { id },
      data: { lastRenotifiedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: "Уведомление отправлено",
      notifiedCount: userIdsToNotify.size,
    })
  } catch (error) {
    console.error("Renotify error:", error)
    return NextResponse.json(
      { error: "Ошибка при отправке уведомления" },
      { status: 500 }
    )
  }
}

/**
 * Send Telegram re-notifications to teachers (non-blocking)
 */
async function sendRenotifyTelegram(params: {
  submissionId: string
  userIds: string[]
  studentName: string
  moduleTitle: string
  trailTitle: string
}): Promise<void> {
  const { submissionId, userIds, studentName, moduleTitle, trailTitle } = params

  try {
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
      return
    }

    // Build message with "повторное" marker
    const reviewUrl = getReviewUrl(submissionId)
    const baseMessage = buildSubmissionNotificationMessage({
      studentName,
      moduleTitle,
      trailTitle,
      reviewUrl,
    })
    // Add repeat marker
    const message = baseMessage.replace(
      "Новая работа на проверку",
      "🔔 Напоминание: работа ожидает проверки"
    )

    // Send to all users (parallel)
    const results = await Promise.allSettled(
      usersWithTelegram.map((user) =>
        sendTelegramMessage(user.telegramChatId!, message)
      )
    )

    // Log failures
    const failures = results.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
    )
    if (failures.length > 0) {
      console.warn(
        `[Telegram Renotify] ${failures.length}/${usersWithTelegram.length} failed for submission ${submissionId}`
      )
    }
  } catch (error) {
    console.error(
      "[Telegram Renotify] Error:",
      error instanceof Error ? error.message : "Unknown"
    )
  }
}
