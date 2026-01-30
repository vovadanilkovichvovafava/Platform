/**
 * Setup Telegram Bot Webhook
 *
 * Usage:
 *   npx ts-node --project tsconfig.seed.json scripts/setup-telegram-webhook.ts
 *
 * Required environment variables:
 *   TELEGRAM_BOT_TOKEN     - Bot API token from BotFather
 *   TELEGRAM_WEBHOOK_SECRET - Secret for webhook header validation
 *   NEXTAUTH_URL           - Base URL of the application (e.g., https://your-domain.com)
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
const APP_URL = process.env.NEXTAUTH_URL || process.env.VERCEL_URL

async function main() {
  console.log("🤖 Telegram Webhook Setup\n")

  // Validate environment
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not set")
    process.exit(1)
  }

  if (!TELEGRAM_WEBHOOK_SECRET) {
    console.error("❌ TELEGRAM_WEBHOOK_SECRET is not set")
    process.exit(1)
  }

  if (!APP_URL) {
    console.error("❌ NEXTAUTH_URL is not set")
    process.exit(1)
  }

  const baseUrl = APP_URL.startsWith("http") ? APP_URL : `https://${APP_URL}`
  const webhookUrl = `${baseUrl}/api/telegram/webhook`

  console.log(`📍 Webhook URL: ${webhookUrl}`)
  console.log(`🔐 Secret header: configured\n`)

  // First, get current webhook info
  console.log("📋 Checking current webhook status...")

  const infoResponse = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
  )

  if (!infoResponse.ok) {
    console.error("❌ Failed to get webhook info:", await infoResponse.text())
    process.exit(1)
  }

  const infoData = await infoResponse.json()

  if (infoData.result.url) {
    console.log(`   Current URL: ${infoData.result.url}`)
    console.log(`   Pending updates: ${infoData.result.pending_update_count || 0}`)
    if (infoData.result.last_error_message) {
      console.log(`   ⚠️  Last error: ${infoData.result.last_error_message}`)
    }
  } else {
    console.log("   No webhook configured yet")
  }

  console.log("")

  // Set the webhook
  console.log("🔧 Setting webhook...")

  const setResponse = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ["message"], // Only receive message updates
        drop_pending_updates: true, // Clear any pending updates
      }),
    }
  )

  if (!setResponse.ok) {
    console.error("❌ Failed to set webhook:", await setResponse.text())
    process.exit(1)
  }

  const setData = await setResponse.json()

  if (!setData.ok) {
    console.error("❌ Telegram API error:", setData.description)
    process.exit(1)
  }

  console.log("✅ Webhook set successfully!\n")

  // Verify the webhook was set correctly
  console.log("🔍 Verifying webhook configuration...")

  const verifyResponse = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
  )

  const verifyData = await verifyResponse.json()

  if (verifyData.result.url === webhookUrl) {
    console.log("✅ Webhook URL verified")
    console.log(`   URL: ${verifyData.result.url}`)
    console.log(`   Has custom certificate: ${verifyData.result.has_custom_certificate || false}`)
    console.log(`   Max connections: ${verifyData.result.max_connections || 40}`)
    console.log(`   Allowed updates: ${verifyData.result.allowed_updates?.join(", ") || "all"}`)
    console.log("")
    console.log("🎉 Telegram bot is ready to receive messages!")
  } else {
    console.error("❌ Webhook URL mismatch after setting")
    console.error(`   Expected: ${webhookUrl}`)
    console.error(`   Got: ${verifyData.result.url}`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("❌ Unexpected error:", error.message)
  process.exit(1)
})
