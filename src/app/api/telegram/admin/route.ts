import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
const APP_URL = process.env.NEXTAUTH_URL || process.env.VERCEL_URL

/**
 * GET /api/telegram/admin
 * Get current webhook status (ADMIN only)
 */
export async function GET() {
  const session = await getServerSession(authOptions)

  // Only CO_ADMIN and ADMIN can manage webhook
  const allowedRoles = ["CO_ADMIN", "ADMIN"]
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN not configured" },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to get webhook info" },
        { status: 500 }
      )
    }

    const data = await response.json()

    // Don't expose full URL in response for security
    const webhookInfo = {
      isConfigured: !!data.result.url,
      hasSecretToken: !!TELEGRAM_WEBHOOK_SECRET,
      pendingUpdates: data.result.pending_update_count || 0,
      lastErrorDate: data.result.last_error_date
        ? new Date(data.result.last_error_date * 1000).toISOString()
        : null,
      lastErrorMessage: data.result.last_error_message || null,
      maxConnections: data.result.max_connections || 40,
      allowedUpdates: data.result.allowed_updates || [],
      expectedUrl: getExpectedWebhookUrl(),
      urlMatches: data.result.url === getExpectedWebhookUrl(),
    }

    return NextResponse.json(webhookInfo)
  } catch (error) {
    console.error("[Telegram Admin] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch webhook info" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/telegram/admin
 * Setup/reset webhook (ADMIN only)
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  // Only CO_ADMIN and ADMIN can manage webhook
  const allowedRoles = ["CO_ADMIN", "ADMIN"]
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN not configured" },
      { status: 500 }
    )
  }

  if (!TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "TELEGRAM_WEBHOOK_SECRET not configured" },
      { status: 500 }
    )
  }

  const webhookUrl = getExpectedWebhookUrl()

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "NEXTAUTH_URL not configured" },
      { status: 500 }
    )
  }

  try {
    // Parse optional parameters
    const body = await request.json().catch(() => ({}))
    const dropPendingUpdates = body.dropPendingUpdates ?? true

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: TELEGRAM_WEBHOOK_SECRET,
          allowed_updates: ["message"],
          drop_pending_updates: dropPendingUpdates,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Telegram Admin] setWebhook failed:", errorText)
      return NextResponse.json(
        { error: "Failed to set webhook" },
        { status: 500 }
      )
    }

    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json(
        { error: data.description || "Telegram API error" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Webhook configured successfully",
      webhookUrl: webhookUrl,
    })
  } catch (error) {
    console.error("[Telegram Admin] Error:", error)
    return NextResponse.json(
      { error: "Failed to set webhook" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/telegram/admin
 * Remove webhook (ADMIN only)
 */
export async function DELETE() {
  const session = await getServerSession(authOptions)

  // Only CO_ADMIN and ADMIN can manage webhook
  const allowedRoles = ["CO_ADMIN", "ADMIN"]
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN not configured" },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drop_pending_updates: true,
        }),
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to delete webhook" },
        { status: 500 }
      )
    }

    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json(
        { error: data.description || "Telegram API error" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Webhook removed",
    })
  } catch (error) {
    console.error("[Telegram Admin] Error:", error)
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 }
    )
  }
}

function getExpectedWebhookUrl(): string | null {
  if (!APP_URL) return null
  const baseUrl = APP_URL.startsWith("http") ? APP_URL : `https://${APP_URL}`
  // Ensure no trailing slash on base URL, and webhook path has no trailing slash
  const normalizedBase = baseUrl.replace(/\/+$/, "")
  return `${normalizedBase}/api/telegram/webhook`
}
