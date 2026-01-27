/**
 * Telegram Bot Integration
 * Sends notifications to users who have connected their Telegram accounts
 */

const TELEGRAM_BOT_TOKEN = "8229400510:AAFxmjzjrqrZjS4lfHfX8rTN6XvxuqTHDno"
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

interface TelegramSendMessageParams {
  chat_id: string | number
  text: string
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2"
  disable_notification?: boolean
}

interface TelegramApiResponse {
  ok: boolean
  result?: unknown
  description?: string
  error_code?: number
}

/**
 * Send a message to a Telegram chat
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options: { silent?: boolean; parseMode?: "HTML" | "Markdown" } = {}
): Promise<boolean> {
  try {
    const params: TelegramSendMessageParams = {
      chat_id: chatId,
      text,
      parse_mode: options.parseMode || "HTML",
      disable_notification: options.silent,
    }

    const response = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })

    const data: TelegramApiResponse = await response.json()

    if (!data.ok) {
      console.error("Telegram API error:", data.description)
      return false
    }

    return true
  } catch (error) {
    console.error("Error sending Telegram message:", error)
    return false
  }
}

/**
 * Generate a unique code for linking Telegram account
 */
export function generateTelegramLinkCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Format notification message for Telegram
 */
export function formatTelegramNotification(
  title: string,
  message: string,
  link?: string
): string {
  let text = `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(message)}`

  if (link) {
    // Make sure link is absolute
    const absoluteLink = link.startsWith("http")
      ? link
      : `${process.env.NEXTAUTH_URL || "https://yourapp.com"}${link}`
    text += `\n\n<a href="${absoluteLink}">Открыть в приложении</a>`
  }

  return text
}

/**
 * Escape HTML special characters for Telegram HTML parse mode
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/**
 * Notification templates for teachers
 */
export const TelegramTemplates = {
  newSubmission: (studentName: string, moduleTitle: string): string =>
    formatTelegramNotification(
      "Новая работа на проверку",
      `${studentName} отправил работу "${moduleTitle}"`
    ),

  pendingSubmissionsDigest: (count: number): string =>
    formatTelegramNotification(
      "Непроверенные работы",
      `У вас ${count} ${pluralize(count, "работа", "работы", "работ")} на проверку`
    ),

  newComment: (authorName: string, moduleTitle: string): string =>
    formatTelegramNotification(
      "Новый комментарий",
      `${authorName} оставил комментарий к работе "${moduleTitle}"`
    ),
}

/**
 * Notification templates for students
 */
export const StudentTelegramTemplates = {
  reviewReceived: (
    moduleTitle: string,
    status: "APPROVED" | "REVISION" | "FAILED",
    score: number
  ): string => {
    const statusText = {
      APPROVED: "принята",
      REVISION: "отправлена на доработку",
      FAILED: "не принята",
    }
    return formatTelegramNotification(
      `Работа ${statusText[status]}`,
      `Ваша работа "${moduleTitle}" получила оценку ${score}/10`
    )
  },

  newComment: (authorName: string, moduleTitle: string): string =>
    formatTelegramNotification(
      "Новый комментарий",
      `${authorName} оставил комментарий к вашей работе "${moduleTitle}"`
    ),
}

/**
 * Russian pluralization helper
 */
function pluralize(
  count: number,
  one: string,
  few: string,
  many: string
): string {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod100 >= 11 && mod100 <= 14) {
    return many
  }

  if (mod10 === 1) {
    return one
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return few
  }

  return many
}

/**
 * Get bot info (for testing connection)
 */
export async function getTelegramBotInfo(): Promise<{
  ok: boolean
  username?: string
  error?: string
}> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/getMe`)
    const data: TelegramApiResponse = await response.json()

    if (!data.ok) {
      return { ok: false, error: data.description }
    }

    const result = data.result as { username?: string }
    return { ok: true, username: result?.username }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
