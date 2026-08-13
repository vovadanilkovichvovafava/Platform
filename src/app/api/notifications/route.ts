import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Extract submission ID from notification link (/teacher/reviews/{id})
function extractSubmissionId(link: string | null): string | null {
  if (!link) return null
  const match = link.match(/^\/teacher\/reviews\/(.+)$/)
  return match ? match[1] : null
}

// GET - Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread") === "true"

    // --- Phase 1: Cleanup stale SUBMISSION_PENDING notifications ---
    // Old notifications for already-reviewed/deleted submissions should be marked as read.
    // This handles: 1) notifications created before the sync system, 2) multi-teacher stale notifs
    const unreadSubNotifs = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        type: "SUBMISSION_PENDING",
        isRead: false,
      },
      select: { id: true, link: true },
    })

    // Collect submission IDs from unread SUBMISSION_PENDING notifications
    const unreadNotifToSubId = new Map<string, string>()
    for (const n of unreadSubNotifs) {
      const subId = extractSubmissionId(n.link)
      if (subId) unreadNotifToSubId.set(n.id, subId)
    }

    // --- Phase 2: Fetch notifications ---
    // Run cleanup (Phase 1) and fetch (Phase 2) sequentially so cleanup results are reflected
    // SECURITY: Не возвращаем userId - клиенту это поле не нужно
    if (unreadNotifToSubId.size > 0) {
      const uniqueSubIds = [...new Set(unreadNotifToSubId.values())]
      // Find which submissions are still PENDING
      const stillPending = await prisma.submission.findMany({
        where: { id: { in: uniqueSubIds }, status: "PENDING" },
        select: { id: true },
      })
      const stillPendingIds = new Set(stillPending.map((s: { id: string }) => s.id))

      // Notifications for non-PENDING (or deleted) submissions are stale
      const staleIds: string[] = []
      for (const [notifId, subId] of unreadNotifToSubId) {
        if (!stillPendingIds.has(subId)) staleIds.push(notifId)
      }

      if (staleIds.length > 0) {
        await prisma.notification.updateMany({
          where: { id: { in: staleIds }, userId: session.user.id },
          data: { isRead: true },
        })
      }
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        link: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    // --- Phase 3: Trail enrichment for SUBMISSION_PENDING notifications ---
    // Attach trailTitle so the client can group notifications by trail
    const subNotifs = notifications.filter(
      (n: { type: string; link: string | null }) => n.type === "SUBMISSION_PENDING" && n.link
    )

    const trailTitleByNotifId = new Map<string, string>()

    if (subNotifs.length > 0) {
      const displayNotifToSubId = new Map<string, string>()
      for (const n of subNotifs) {
        const subId = extractSubmissionId(n.link)
        if (subId) displayNotifToSubId.set(n.id, subId)
      }

      const uniqueDisplaySubIds = [...new Set(displayNotifToSubId.values())]
      const submissions = await prisma.submission.findMany({
        where: { id: { in: uniqueDisplaySubIds } },
        select: {
          id: true,
          module: {
            select: {
              trail: { select: { title: true } },
            },
          },
        },
      })

      const subTrailMap = new Map(
        submissions.map((s: { id: string; module: { trail: { title: string } } }) => [s.id, s.module.trail.title])
      )
      for (const [notifId, subId] of displayNotifToSubId) {
        const title = subTrailMap.get(subId)
        if (title) trailTitleByNotifId.set(notifId, title)
      }
    }

    // Build enriched response (trailTitle only for SUBMISSION_PENDING)
    const enrichedNotifications = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      isRead: n.isRead,
      createdAt: n.createdAt,
      ...(trailTitleByNotifId.has(n.id) ? { trailTitle: trailTitleByNotifId.get(n.id)! } : {}),
    }))

    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    })

    return NextResponse.json({ notifications: enrichedNotifications, unreadCount })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Ошибка получения уведомлений" }, { status: 500 })
  }
}

// Валидация notificationId - cuid формат (20-30 алфавитно-цифровых символов)
function isValidNotificationId(id: unknown): id is string {
  return typeof id === "string" && /^[a-z0-9]{20,30}$/i.test(id)
}

// PATCH - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, markAllRead, link } = body

    if (markAllRead) {
      // Отметить все уведомления как прочитанные
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        data: { isRead: true },
      })
    } else if (link) {
      // Синхронизация: отметить уведомления по ссылке на контент
      // Используется для автопрочтения при просмотре связанного контента
      if (typeof link !== "string" || link.length > 500) {
        return NextResponse.json({ error: "Неверный формат ссылки" }, { status: 400 })
      }

      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          link: link,
          isRead: false,
        },
        data: { isRead: true },
      })
    } else if (notificationIds) {
      // Валидация: notificationIds должен быть массивом
      if (!Array.isArray(notificationIds)) {
        return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 })
      }

      // Фильтруем только валидные ID (защита от инъекций и мусорных данных)
      const validIds = notificationIds.filter(isValidNotificationId)

      if (validIds.length === 0) {
        // Нет валидных ID - возвращаем успех (идемпотентность)
        return NextResponse.json({ success: true })
      }

      // SECURITY: userId в WHERE гарантирует что пользователь может
      // отметить только СВОИ уведомления - чужие просто не обновятся
      await prisma.notification.updateMany({
        where: {
          id: { in: validIds },
          userId: session.user.id,
        },
        data: { isRead: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // Не логируем детали ошибки которые могут содержать пользовательские данные
    console.error("Error marking notifications as read")
    return NextResponse.json({ error: "Ошибка обновления уведомлений" }, { status: 500 })
  }
}
