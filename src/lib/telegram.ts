import crypto from "crypto"

// Environment variables (server-side only)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME
const APP_URL = process.env.NEXTAUTH_URL || process.env.VERCEL_URL

// Token TTL for Telegram linking (15 minutes)
const TOKEN_TTL_MS = 15 * 60 * 1000

/**
 * Generate HMAC-signed token for Telegram linking
 * Format: userId:timestamp:signature
 */
export function generateTelegramLinkToken(userId: string): string {
  const timestamp = Date.now()
  const payload = `${userId}:${timestamp}`
  const signature = crypto
    .createHmac("sha256", TELEGRAM_WEBHOOK_SECRET || "fallback-secret")
    .update(payload)
    .digest("hex")
    .slice(0, 16) // Shorten for URL-friendly token

  return Buffer.from(`${payload}:${signature}`).toString("base64url")
}

/**
 * Verify and decode Telegram link token
 * Returns userId if valid, null if invalid/expired
 */
export function verifyTelegramLinkToken(
  token: string
): { userId: string; isValid: boolean; error?: string } {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8")
    const [userId, timestampStr, signature] = decoded.split(":")

    if (!userId || !timestampStr || !signature) {
      return { userId: "", isValid: false, error: "Invalid token format" }
    }

    const timestamp = parseInt(timestampStr, 10)
    if (isNaN(timestamp)) {
      return { userId: "", isValid: false, error: "Invalid timestamp" }
    }

    // Check TTL
    if (Date.now() - timestamp > TOKEN_TTL_MS) {
      return { userId, isValid: false, error: "Token expired" }
    }

    // Verify signature
    const payload = `${userId}:${timestamp}`
    const expectedSignature = crypto
      .createHmac("sha256", TELEGRAM_WEBHOOK_SECRET || "fallback-secret")
      .update(payload)
      .digest("hex")
      .slice(0, 16)

    if (signature !== expectedSignature) {
      return { userId, isValid: false, error: "Invalid signature" }
    }

    return { userId, isValid: true }
  } catch {
    return { userId: "", isValid: false, error: "Token decode failed" }
  }
}

/**
 * Verify Telegram webhook secret header
 */
export function verifyWebhookSecret(secretHeader: string | null): boolean {
  if (!TELEGRAM_WEBHOOK_SECRET) {
    console.error("[Telegram] TELEGRAM_WEBHOOK_SECRET not configured")
    return false
  }
  return secretHeader === TELEGRAM_WEBHOOK_SECRET
}

/**
 * Generate deep link URL for Telegram bot
 */
export function getTelegramDeepLink(token: string): string {
  if (!TELEGRAM_BOT_USERNAME) {
    throw new Error("TELEGRAM_BOT_USERNAME not configured")
  }
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${token}`
}

/**
 * Send message via Telegram Bot API
 * Returns true if successful, false otherwise
 * IMPORTANT: Never log the bot token
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: {
    parseMode?: "HTML" | "Markdown" | "MarkdownV2"
    disableWebPagePreview?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    // Log without exposing token
    console.error("[Telegram] Bot token not configured")
    return { success: false, error: "Bot not configured" }
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options?.parseMode || "HTML",
          disable_web_page_preview: options?.disableWebPagePreview ?? false,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      // Log error without sensitive data
      console.error("[Telegram] Send failed:", {
        status: response.status,
        description: errorData.description || "Unknown error",
      })
      return {
        success: false,
        error: errorData.description || `HTTP ${response.status}`,
      }
    }

    return { success: true }
  } catch (error) {
    // Log safely without token
    console.error("[Telegram] Network error:", error instanceof Error ? error.message : "Unknown")
    return { success: false, error: "Network error" }
  }
}

/**
 * Build review notification message for teacher
 */
export function buildSubmissionNotificationMessage(params: {
  studentName: string
  moduleTitle: string
  trailTitle?: string
  reviewUrl: string
}): string {
  const { studentName, moduleTitle, trailTitle, reviewUrl } = params

  const trailInfo = trailTitle ? ` (${trailTitle})` : ""

  return [
    `<b>Новая работа на проверку</b>`,
    ``,
    `Студент: <b>${escapeHtml(studentName)}</b>`,
    `Модуль: ${escapeHtml(moduleTitle)}${escapeHtml(trailInfo)}`,
    ``,
    `<a href="${reviewUrl}">Перейти к проверке</a>`,
  ].join("\n")
}

/**
 * Escape HTML special characters for Telegram HTML mode
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/**
 * Get full review URL
 */
export function getReviewUrl(submissionId: string): string {
  const baseUrl = APP_URL?.startsWith("http") ? APP_URL : `https://${APP_URL}`
  return `${baseUrl}/teacher/reviews/${submissionId}`
}

/**
 * Check if Telegram integration is configured
 */
export function isTelegramConfigured(): boolean {
  return !!(TELEGRAM_BOT_TOKEN && TELEGRAM_WEBHOOK_SECRET && TELEGRAM_BOT_USERNAME)
}
