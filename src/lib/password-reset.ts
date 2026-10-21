import { randomBytes } from "crypto"

/**
 * Ссылки для сброса пароля.
 *
 * Админ генерирует одноразовую ссылку и сам передаёт её пользователю (в Telegram
 * и т.п.) — почтовый провайдер не нужен, работает в закрытом контуре. Пользователь
 * открывает ссылку и задаёт новый пароль сам; админу пароль знать не нужно.
 */

/** Время жизни ссылки сброса. */
export const RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 часа

/** Криптостойкий токен для ссылки (48 hex-символов). */
export function generateResetToken(): string {
  return randomBytes(24).toString("hex")
}

/** Базовый публичный origin приложения (без завершающего слэша). */
export function getAppBaseUrl(): string {
  const raw = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || ""
  const withScheme = raw.startsWith("http") ? raw : raw ? `https://${raw}` : ""
  return withScheme.replace(/\/+$/, "")
}

/** Полная ссылка сброса по токену. */
export function buildResetUrl(token: string): string {
  const base = getAppBaseUrl()
  return `${base}/reset-password?token=${token}`
}
