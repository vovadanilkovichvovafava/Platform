import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendTelegramMessage } from "@/lib/telegram"

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from?: {
      id: number
      first_name?: string
      username?: string
    }
    chat: {
      id: number
      type: string
    }
    text?: string
  }
}

// POST - Handle incoming Telegram updates
export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json()

    // Only process private messages
    if (!update.message || update.message.chat.type !== "private") {
      return NextResponse.json({ ok: true })
    }

    const chatId = update.message.chat.id
    const text = update.message.text?.trim() || ""
    const firstName = update.message.from?.first_name || "Пользователь"

    // Handle /start command with link code
    if (text.startsWith("/start")) {
      const parts = text.split(" ")

      if (parts.length > 1) {
        // Link code provided: /start ABC123
        const linkCode = parts[1].toUpperCase()

        // Find user with this link code
        const user = await prisma.user.findFirst({
          where: { telegramLinkCode: linkCode },
        })

        if (user) {
          // Link the Telegram account
          await prisma.user.update({
            where: { id: user.id },
            data: {
              telegramChatId: String(chatId),
              telegramLinkCode: null,
            },
          })

          await sendTelegramMessage(
            chatId,
            `✅ Привет, ${user.name}!\n\nВаш Telegram успешно подключен к аккаунту на платформе.\n\nТеперь вы будете получать уведомления о:\n• Новых работах на проверку\n• Комментариях к работам\n• Результатах проверки\n\nДля отключения уведомлений используйте настройки в личном кабинете.`
          )
        } else {
          await sendTelegramMessage(
            chatId,
            `❌ Код "${linkCode}" не найден или уже был использован.\n\nПолучите новый код в настройках личного кабинета.`
          )
        }
      } else {
        // No code provided
        await sendTelegramMessage(
          chatId,
          `Привет, ${firstName}! 👋\n\nЯ бот платформы обучения.\n\nЧтобы получать уведомления:\n1. Откройте настройки в личном кабинете\n2. Найдите раздел "Telegram"\n3. Нажмите "Подключить"\n4. Скопируйте код и отправьте его мне\n\nИли перейдите по ссылке из настроек.`
        )
      }

      return NextResponse.json({ ok: true })
    }

    // Handle /status command
    if (text === "/status") {
      const user = await prisma.user.findFirst({
        where: { telegramChatId: String(chatId) },
        select: { name: true, email: true, role: true },
      })

      if (user) {
        await sendTelegramMessage(
          chatId,
          `✅ Аккаунт подключен\n\n👤 ${user.name}\n📧 ${user.email}\n👔 ${user.role === "TEACHER" ? "Учитель" : user.role === "ADMIN" ? "Администратор" : "Студент"}`
        )
      } else {
        await sendTelegramMessage(
          chatId,
          `❌ Telegram не подключен к аккаунту.\n\nИспользуйте код из настроек личного кабинета для подключения.`
        )
      }

      return NextResponse.json({ ok: true })
    }

    // Handle /unlink command
    if (text === "/unlink") {
      const user = await prisma.user.findFirst({
        where: { telegramChatId: String(chatId) },
      })

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { telegramChatId: null },
        })

        await sendTelegramMessage(
          chatId,
          `✅ Telegram отключен от аккаунта ${user.name}.\n\nВы больше не будете получать уведомления.`
        )
      } else {
        await sendTelegramMessage(
          chatId,
          `Telegram не был подключен к аккаунту.`
        )
      }

      return NextResponse.json({ ok: true })
    }

    // Handle /help command
    if (text === "/help") {
      await sendTelegramMessage(
        chatId,
        `📚 Доступные команды:\n\n/start [код] - Подключить аккаунт\n/status - Проверить статус подключения\n/unlink - Отключить уведомления\n/help - Показать эту справку`
      )

      return NextResponse.json({ ok: true })
    }

    // Unknown message - try to interpret as link code
    if (/^[A-Z0-9]{6}$/.test(text.toUpperCase())) {
      const linkCode = text.toUpperCase()
      const user = await prisma.user.findFirst({
        where: { telegramLinkCode: linkCode },
      })

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            telegramChatId: String(chatId),
            telegramLinkCode: null,
          },
        })

        await sendTelegramMessage(
          chatId,
          `✅ Telegram успешно подключен к аккаунту ${user.name}!`
        )
      } else {
        await sendTelegramMessage(
          chatId,
          `❌ Код не найден. Получите новый код в настройках личного кабинета.`
        )
      }

      return NextResponse.json({ ok: true })
    }

    // Default response
    await sendTelegramMessage(
      chatId,
      `Я не понимаю эту команду.\n\nИспользуйте /help для списка команд.`
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Telegram webhook error:", error)
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true })
  }
}

// GET - Verify webhook (for testing)
export async function GET() {
  return NextResponse.json({
    status: "Telegram webhook is active",
    timestamp: new Date().toISOString(),
  })
}
