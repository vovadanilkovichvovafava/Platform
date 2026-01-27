import { prisma } from "@/lib/prisma"
import {
  sendTelegramMessage,
  TelegramTemplates,
  StudentTelegramTemplates,
} from "@/lib/telegram"

// Notification types
export const NotificationType = {
  // Student notifications
  REVIEW_RECEIVED: "REVIEW_RECEIVED",
  MODULE_COMPLETED: "MODULE_COMPLETED",
  ACHIEVEMENT_UNLOCKED: "ACHIEVEMENT_UNLOCKED",
  CERTIFICATE_ISSUED: "CERTIFICATE_ISSUED",

  // Teacher notifications
  SUBMISSION_PENDING: "SUBMISSION_PENDING",
} as const

export type NotificationTypeValue = typeof NotificationType[keyof typeof NotificationType]

// Notification creation options
interface CreateNotificationOptions {
  userId: string
  type: NotificationTypeValue
  title: string
  message: string
  link?: string
}

/**
 * Creates a notification for a user
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
}: CreateNotificationOptions) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
      },
    })
    return notification
  } catch (error) {
    console.error("Error creating notification:", error)
    return null
  }
}

/**
 * Creates notifications for all teachers assigned to a trail
 * when a new submission is received
 */
export async function notifyTeachersAboutSubmission({
  trailId,
  studentName,
  moduleTitle,
  submissionId,
}: {
  trailId: string
  studentName: string
  moduleTitle: string
  submissionId: string
}) {
  try {
    // Get all teachers assigned to this trail with their Telegram chat IDs
    const trailTeachers = await prisma.trailTeacher.findMany({
      where: { trailId },
      include: {
        teacher: {
          select: { id: true, telegramChatId: true },
        },
      },
    })

    // Also notify all admins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true, telegramChatId: true },
    })

    // Combine and deduplicate
    const teacherMap = new Map<string, string | null>()
    for (const t of trailTeachers) {
      teacherMap.set(t.teacher.id, t.teacher.telegramChatId)
    }
    for (const a of admins) {
      teacherMap.set(a.id, a.telegramChatId)
    }

    if (teacherMap.size === 0) {
      return []
    }

    // Create in-app notifications for all teachers
    const notifications = await prisma.notification.createMany({
      data: Array.from(teacherMap.keys()).map((teacherId) => ({
        userId: teacherId,
        type: NotificationType.SUBMISSION_PENDING,
        title: "Новая работа на проверку",
        message: `${studentName} отправил работу "${moduleTitle}"`,
        link: `/teacher/reviews/${submissionId}`,
      })),
    })

    // Send Telegram notifications to teachers who have it connected
    const telegramMessage = TelegramTemplates.newSubmission(studentName, moduleTitle)
    const telegramPromises: Promise<boolean>[] = []

    teacherMap.forEach((chatId) => {
      if (chatId) {
        telegramPromises.push(sendTelegramMessage(chatId, telegramMessage))
      }
    })

    // Fire and forget Telegram notifications (don't block)
    Promise.all(telegramPromises).catch((error) =>
      console.error("Error sending Telegram notifications:", error)
    )

    return notifications
  } catch (error) {
    console.error("Error notifying teachers about submission:", error)
    return null
  }
}

/**
 * Creates a notification for a student when their submission is reviewed
 */
export async function notifyStudentAboutReview({
  studentId,
  moduleTitle,
  status,
  reviewerName,
  submissionId,
  score,
}: {
  studentId: string
  moduleTitle: string
  status: "APPROVED" | "REVISION" | "FAILED"
  reviewerName: string
  submissionId: string
  score: number
}) {
  const statusMessages = {
    APPROVED: "принята",
    REVISION: "отправлена на доработку",
    FAILED: "не принята",
  }

  // Create in-app notification
  const notification = await createNotification({
    userId: studentId,
    type: NotificationType.REVIEW_RECEIVED,
    title: `Работа ${statusMessages[status]}`,
    message: `${reviewerName} проверил вашу работу "${moduleTitle}"`,
    link: `/dashboard/modules/${submissionId}`,
  })

  // Send Telegram notification if student has it connected
  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { telegramChatId: true },
    })

    if (student?.telegramChatId) {
      const telegramMessage = StudentTelegramTemplates.reviewReceived(
        moduleTitle,
        status,
        score
      )
      // Fire and forget
      sendTelegramMessage(student.telegramChatId, telegramMessage).catch((error) =>
        console.error("Error sending Telegram notification to student:", error)
      )
    }
  } catch (error) {
    console.error("Error getting student for Telegram notification:", error)
  }

  return notification
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    })
  } catch (error) {
    console.error("Error getting unread count:", error)
    return 0
  }
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(
  userId: string,
  notificationIds?: string[]
) {
  try {
    if (notificationIds && notificationIds.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId,
        },
        data: { isRead: true },
      })
    } else {
      // Mark all as read
      await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: { isRead: true },
      })
    }
    return true
  } catch (error) {
    console.error("Error marking notifications as read:", error)
    return false
  }
}

/**
 * Delete old notifications (older than 30 days)
 */
export async function cleanupOldNotifications() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  try {
    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        isRead: true,
      },
    })
    return result.count
  } catch (error) {
    console.error("Error cleaning up old notifications:", error)
    return 0
  }
}
