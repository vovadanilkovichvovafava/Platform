import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  verifyWebhookSecret,
  verifyTelegramLinkToken,
  sendTelegramMessage,
} from "@/lib/telegram"

// Telegram Update type (minimal subset we need)
interface TelegramUpdate {
  message?: {
    chat: {
      id: number
    }
    from?: {
      id: number
      first_name?: string
      username?: string
    }
    text?: string
  }
}

/**
 * POST /api/telegram/webhook
 * Receive updates from Telegram Bot API
 * SECURITY: Requires X-Telegram-Bot-Api-Secret-Token header
 */
export async function POST(request: NextRequest) {
  console.log("[Telegram Webhook] Received request")

  try {
    // SECURITY: Verify secret header (deny-by-default)
    const secretHeader = request.headers.get("x-telegram-bot-api-secret-token")
    console.log("[Telegram Webhook] Secret header present:", !!secretHeader)

    if (!verifyWebhookSecret(secretHeader)) {
      // Log without revealing expected secret
      console.warn("[Telegram Webhook] Invalid or missing secret header")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    console.log("[Telegram Webhook] Secret verified successfully")

    const update: TelegramUpdate = await request.json()
    console.log("[Telegram Webhook] Update received:", JSON.stringify({
      hasMessage: !!update.message,
      chatId: update.message?.chat?.id,
      text: update.message?.text,
      from: update.message?.from?.username || update.message?.from?.first_name
    }))

    // Only process messages with text
    if (!update.message?.text || !update.message.chat?.id) {
      console.log("[Telegram Webhook] No text message, skipping")
      return NextResponse.json({ ok: true })
    }

    const chatId = update.message.chat.id.toString()
    const text = update.message.text.trim()
    console.log("[Telegram Webhook] Processing command:", text, "from chat:", chatId)

    // Handle /start command with token
    if (text.startsWith("/start ")) {
      const token = text.slice(7).trim()
      console.log("[Telegram Webhook] Handling /start with token, length:", token.length)
      await handleStartCommand(chatId, token)
      return NextResponse.json({ ok: true })
    }

    // Handle plain /start (without token)
    if (text === "/start") {
      console.log("[Telegram Webhook] Handling plain /start")
      const result = await sendTelegramMessage(
        chatId,
        "Добро пожаловать! Для подключения уведомлений перейдите в профиль на платформе и нажмите «Подключить Telegram»."
      )
      console.log("[Telegram Webhook] /start response sent:", result)
      return NextResponse.json({ ok: true })
    }

    // Handle /status command
    if (text === "/status") {
      console.log("[Telegram Webhook] Handling /status")
      await handleStatusCommand(chatId)
      return NextResponse.json({ ok: true })
    }

    // Handle /stop command (disable notifications)
    if (text === "/stop") {
      console.log("[Telegram Webhook] Handling /stop")
      await handleStopCommand(chatId)
      return NextResponse.json({ ok: true })
    }

    // Default response for unknown commands
    console.log("[Telegram Webhook] Unknown command, sending help")
    const helpResult = await sendTelegramMessage(
      chatId,
      "Команды:\n/status — статус подключения\n/stop — отключить уведомления"
    )
    console.log("[Telegram Webhook] Help response sent:", helpResult)

    return NextResponse.json({ ok: true })
  } catch (error) {
    // Log safely without sensitive data
    console.error(
      "[Telegram Webhook] Error:",
      error instanceof Error ? error.message : "Unknown"
    )
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true })
  }
}

/**
 * Handle /start <token> command
 * Links Telegram chat to user account
 */
async function handleStartCommand(chatId: string, token: string): Promise<void> {
  console.log("[Telegram Webhook] handleStartCommand started for chat:", chatId)

  // Verify token
  const verification = verifyTelegramLinkToken(token)
  console.log("[Telegram Webhook] Token verification result:", {
    isValid: verification.isValid,
    error: verification.error,
    userId: verification.userId
  })

  if (!verification.isValid) {
    const errorMsg = verification.error === "Token expired"
      ? "Ссылка устарела. Пожалуйста, сгенерируйте новую в профиле на платформе."
      : "Неверная ссылка. Пожалуйста, используйте кнопку «Подключить Telegram» в профиле."
    const result = await sendTelegramMessage(chatId, errorMsg)
    console.log("[Telegram Webhook] Sent error message:", result)
    return
  }

  const userId = verification.userId

  // Check if token exists in database and not expired
  const storedToken = await prisma.telegramLinkToken.findUnique({
    where: { userId },
  })
  console.log("[Telegram Webhook] Stored token found:", !!storedToken, "matches:", storedToken?.token === token)

  if (!storedToken || storedToken.token !== token) {
    const result = await sendTelegramMessage(
      chatId,
      "Ссылка недействительна. Сгенерируйте новую в профиле."
    )
    console.log("[Telegram Webhook] Sent invalid token message:", result)
    return
  }

  if (storedToken.expiresAt < new Date()) {
    const result = await sendTelegramMessage(
      chatId,
      "Ссылка устарела. Сгенерируйте новую в профиле."
    )
    console.log("[Telegram Webhook] Sent expired token message:", result)
    // Clean up expired token
    await prisma.telegramLinkToken.delete({ where: { userId } })
    return
  }

  // Check if user exists and is teacher/admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  })
  console.log("[Telegram Webhook] User found:", user?.name, "role:", user?.role)

  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    const result = await sendTelegramMessage(
      chatId,
      "Telegram-уведомления доступны только для преподавателей."
    )
    console.log("[Telegram Webhook] Sent not teacher message:", result)
    return
  }

  // Link Telegram to user
  await prisma.user.update({
    where: { id: userId },
    data: {
      telegramChatId: chatId,
      telegramEnabled: true,
      telegramConnectedAt: new Date(),
    },
  })
  console.log("[Telegram Webhook] User updated with telegramChatId:", chatId)

  // Clean up used token
  await prisma.telegramLinkToken.delete({ where: { userId } })
  console.log("[Telegram Webhook] Token deleted")

  const result = await sendTelegramMessage(
    chatId,
    `Telegram подключён, ${user.name}! Вы будете получать уведомления о новых работах на проверку.\n\nИспользуйте /stop для отключения.`
  )
  console.log("[Telegram Webhook] Sent success message:", result)
}

/**
 * Handle /status command
 */
async function handleStatusCommand(chatId: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { telegramChatId: chatId },
    select: { name: true, telegramEnabled: true, telegramConnectedAt: true },
  })

  if (!user) {
    await sendTelegramMessage(
      chatId,
      "Этот чат не подключён к аккаунту. Используйте кнопку «Подключить Telegram» в профиле на платформе."
    )
    return
  }

  const statusText = user.telegramEnabled ? "включены" : "отключены"
  const connectedDate = user.telegramConnectedAt
    ? user.telegramConnectedAt.toLocaleDateString("ru-RU")
    : "неизвестно"

  await sendTelegramMessage(
    chatId,
    `Статус подключения:\n• Аккаунт: ${user.name}\n• Уведомления: ${statusText}\n• Подключено: ${connectedDate}`
  )
}

/**
 * Handle /stop command
 */
async function handleStopCommand(chatId: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { telegramChatId: chatId },
  })

  if (!user) {
    await sendTelegramMessage(chatId, "Этот чат не подключён к аккаунту.")
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { telegramEnabled: false },
  })

  await sendTelegramMessage(
    chatId,
    "Уведомления отключены. Вы можете включить их снова в профиле на платформе."
  )
}
