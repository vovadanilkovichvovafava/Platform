import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  generateTelegramLinkToken,
  getTelegramDeepLink,
  isTelegramConfigured,
} from "@/lib/telegram"

/**
 * POST /api/telegram/connect
 * Generate a Telegram deep link for the current user (TEACHER/ADMIN only)
 * Returns: { deepLink: string, expiresAt: string }
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Only teachers, co-admins, and admins can connect Telegram
    const allowedRoles = ["TEACHER", "CO_ADMIN", "ADMIN"]
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Telegram-уведомления доступны только для преподавателей" },
        { status: 403 }
      )
    }

    if (!isTelegramConfigured()) {
      return NextResponse.json(
        { error: "Telegram-интеграция не настроена" },
        { status: 503 }
      )
    }

    const userId = session.user.id

    // Generate token
    const token = generateTelegramLinkToken(userId)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Store token in database (upsert to handle re-generation)
    await prisma.telegramLinkToken.upsert({
      where: { userId },
      update: { token, expiresAt },
      create: { userId, token, expiresAt },
    })

    // Generate deep link
    const deepLink = getTelegramDeepLink(token)

    return NextResponse.json({
      deepLink,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error("[Telegram Connect] Error:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: "Ошибка при создании ссылки" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/telegram/connect
 * Get current Telegram connection status
 */
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
        telegramEnabled: true,
        telegramConnectedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    return NextResponse.json({
      isConnected: !!user.telegramChatId,
      isEnabled: user.telegramEnabled,
      connectedAt: user.telegramConnectedAt?.toISOString() || null,
      isConfigured: isTelegramConfigured(),
    })
  } catch (error) {
    console.error("[Telegram Status] Error:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: "Ошибка при получении статуса" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/telegram/connect
 * Disconnect Telegram for the current user
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        telegramChatId: null,
        telegramConnectedAt: null,
        // Keep telegramEnabled preference
      },
    })

    // Clean up any pending tokens
    await prisma.telegramLinkToken.deleteMany({
      where: { userId: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Telegram Disconnect] Error:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: "Ошибка при отключении" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/telegram/connect
 * Toggle Telegram notifications enabled/disabled
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const body = await request.json()
    const { enabled } = body

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Параметр enabled должен быть boolean" },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { telegramEnabled: enabled },
    })

    return NextResponse.json({ success: true, enabled })
  } catch (error) {
    console.error("[Telegram Toggle] Error:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: "Ошибка при изменении настроек" },
      { status: 500 }
    )
  }
}
