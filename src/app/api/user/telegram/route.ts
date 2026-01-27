import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateTelegramLinkCode, sendTelegramMessage } from "@/lib/telegram"

// GET - Get current user's Telegram connection status and link code
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        telegramChatId: true,
        telegramLinkCode: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    return NextResponse.json({
      isConnected: !!user.telegramChatId,
      linkCode: user.telegramLinkCode,
    })
  } catch (error) {
    console.error("Error getting Telegram status:", error)
    return NextResponse.json(
      { error: "Ошибка получения статуса Telegram" },
      { status: 500 }
    )
  }
}

// POST - Generate new link code or link Telegram account
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const body = await request.json()
    const { action, chatId } = body

    if (action === "generate_code") {
      // Generate new link code
      const code = generateTelegramLinkCode()

      await prisma.user.update({
        where: { id: session.user.id },
        data: { telegramLinkCode: code },
      })

      return NextResponse.json({ code })
    }

    if (action === "link" && chatId) {
      // Link Telegram account (called from bot webhook)
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          telegramChatId: chatId,
          telegramLinkCode: null, // Clear code after linking
        },
      })

      // Send welcome message
      await sendTelegramMessage(
        chatId,
        "✅ Telegram успешно подключен!\n\nТеперь вы будете получать уведомления о новых работах и комментариях."
      )

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 })
  } catch (error) {
    console.error("Error managing Telegram:", error)
    return NextResponse.json(
      { error: "Ошибка управления Telegram" },
      { status: 500 }
    )
  }
}

// DELETE - Unlink Telegram account
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { telegramChatId: true },
    })

    if (user?.telegramChatId) {
      // Send goodbye message before unlinking
      await sendTelegramMessage(
        user.telegramChatId,
        "Telegram отключен от вашего аккаунта. Вы больше не будете получать уведомления."
      )
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        telegramChatId: null,
        telegramLinkCode: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unlinking Telegram:", error)
    return NextResponse.json(
      { error: "Ошибка отключения Telegram" },
      { status: 500 }
    )
  }
}
