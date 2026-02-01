import { NextResponse } from "next/server"

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (для production использовать Redis)
const rateLimitStore = new Map<string, RateLimitEntry>()

interface RateLimitConfig {
  windowMs: number    // Окно времени в миллисекундах
  maxRequests: number // Максимум запросов за окно
}

// Предустановленные конфигурации
export const RATE_LIMITS = {
  // Строгий лимит для аутентификации (5 попыток в минуту)
  auth: { windowMs: 60 * 1000, maxRequests: 5 },
  // Стандартный для API (60 запросов в минуту)
  api: { windowMs: 60 * 1000, maxRequests: 60 },
  // Для отправки работ (10 в час)
  submissions: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
} as const

/**
 * Проверяет rate limit для указанного ключа
 * @param identifier - уникальный идентификатор (обычно IP или userId)
 * @param config - конфигурация rate limit
 * @returns объект с информацией о лимите
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const key = identifier
  const entry = rateLimitStore.get(key)

  // Очистка устаревших записей (раз в минуту)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries()
  }

  if (!entry || now > entry.resetTime) {
    // Новое окно
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    }
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    }
  }

  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  }
}

/**
 * Получает IP из заголовков запроса
 */
export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }
  const realIP = request.headers.get("x-real-ip")
  if (realIP) {
    return realIP
  }
  return "unknown"
}

/**
 * Middleware-хелпер для rate limiting
 */
export function rateLimitResponse(resetIn: number): NextResponse {
  return NextResponse.json(
    {
      error: "Слишком много запросов. Попробуйте позже.",
      retryAfter: Math.ceil(resetIn / 1000)
    },
    {
      status: 429,
      headers: {
        "Retry-After": Math.ceil(resetIn / 1000).toString(),
      }
    }
  )
}

/**
 * Очистка устаревших записей
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}
