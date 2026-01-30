import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendTelegramMessage, isTelegramConfigured } from "@/lib/telegram"

/**
 * POST /api/telegram/test
 * Send a test notification to the current user's connected Telegram
 * Only for users who have Telegram connected and enabled
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Only teachers, co-admins, and admins can use this
    const allowedRoles = ["TEACHER", "CO_ADMIN", "ADMIN"]
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Недоступно для вашей роли" },
        { status: 403 }
      )
    }

    if (!isTelegramConfigured()) {
      return NextResponse.json(
        { error: "Telegram-интеграция не настроена" },
        { status: 503 }
      )
    }

    // Get user's Telegram chat ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        telegramChatId: true,
        telegramEnabled: true,
        name: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    if (!user.telegramChatId) {
      return NextResponse.json(
        { error: "Telegram не подключён. Сначала подключите Telegram." },
        { status: 400 }
      )
    }

    if (!user.telegramEnabled) {
      return NextResponse.json(
        { error: "Уведомления отключены. Включите их в настройках." },
        { status: 400 }
      )
    }

    // Send test message
    const result = await sendTelegramMessage(
      user.telegramChatId,
      `<b>Тестовое уведомление</b>\n\nПривет, ${user.name || "пользователь"}! Это тестовое сообщение для проверки Telegram-уведомлений.\n\nЕсли вы видите это сообщение, значит уведомления работают корректно.`
    )

    if (!result.success) {
      console.error("[Telegram Test] Failed to send test message:", result.error)
      return NextResponse.json(
        { error: result.error || "Ошибка отправки сообщения" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: "Тестовое сообщение отправлено" })
  } catch (error) {
    console.error("[Telegram Test] Error:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: "Ошибка отправки тестового сообщения" },
      { status: 500 }
    )
  }
}
