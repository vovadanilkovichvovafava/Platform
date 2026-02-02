import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread") === "true"

    // SECURITY: Не возвращаем userId - клиенту это поле не нужно
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

    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    })

    return NextResponse.json({ notifications, unreadCount })
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
    const { notificationIds, markAllRead } = body

    if (markAllRead) {
      // Отметить все уведомления как прочитанные
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
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
