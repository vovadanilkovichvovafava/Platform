/**
 * Simple in-memory rate limiter
 * Works for single-instance deployments (Railway, Vercel, etc.)
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Store: IP/identifier -> { count, resetTime }
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

interface RateLimitConfig {
  limit: number        // Max requests
  windowMs: number     // Time window in milliseconds
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetIn: number      // Seconds until reset
}

/**
 * Check if request should be rate limited
 * @param identifier - Usually IP address or user ID
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // No existing entry or window expired - create new
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return {
      success: true,
      remaining: config.limit - 1,
      resetIn: Math.ceil(config.windowMs / 1000),
    }
  }

  // Within window - check limit
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    }
  }

  // Increment counter
  entry.count++
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  // Check common headers (Railway, Cloudflare, etc.)
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }

  // Fallback
  return "unknown"
}

// Preset configurations for different endpoints
export const RATE_LIMITS = {
  // Auth endpoints - strict (brute force protection)
  auth: { limit: 5, windowMs: 60 * 1000 },           // 5 per minute

  // Registration - very strict (spam protection)
  register: { limit: 3, windowMs: 60 * 1000 },       // 3 per minute

  // Answer questions - moderate (XP farming protection)
  answer: { limit: 30, windowMs: 60 * 1000 },        // 30 per minute

  // Submissions - moderate
  submissions: { limit: 10, windowMs: 60 * 1000 },   // 10 per minute

  // General API - relaxed
  api: { limit: 100, windowMs: 60 * 1000 },          // 100 per minute
} as const
