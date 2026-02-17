import { withAuth } from "next-auth/middleware"
import { NextResponse, NextRequest } from "next/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

// Generate simple request ID for tracing (no crypto needed)
function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Get client IP from request
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }
  return "unknown"
}

// Rate limit check for auth endpoints
function checkAuthRateLimit(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname

  // Only rate limit auth callback (login attempts)
  if (path === "/api/auth/callback/credentials" && request.method === "POST") {
    const ip = getClientIp(request)
    const rateLimit = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Слишком много попыток входа. Попробуйте через ${rateLimit.resetIn} секунд` },
        { status: 429 }
      )
    }
  }

  return null
}

// Main auth middleware
const authMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Redirect authenticated users away from login/register pages
    // Check token.id (not just token) to avoid redirect loop when session is invalidated
    if (token?.id && (path === "/login" || path === "/register")) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Protect teacher routes (allow TEACHER, CO_ADMIN, ADMIN, and HR for read-only analytics)
    if (path.startsWith("/teacher") && token?.role !== "TEACHER" && token?.role !== "CO_ADMIN" && token?.role !== "ADMIN" && token?.role !== "HR") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Protect admin routes (allow CO_ADMIN, ADMIN, and HR)
    if (path.startsWith("/admin") && token?.role !== "CO_ADMIN" && token?.role !== "ADMIN" && token?.role !== "HR") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Redirect /admin to /admin/invites (default admin landing page)
    if (path === "/admin" && (token?.role === "CO_ADMIN" || token?.role === "ADMIN" || token?.role === "HR")) {
      return NextResponse.redirect(new URL("/admin/invites", req.url))
    }

    // HR: block access to admin pages and teacher pages that HR should not see
    if (token?.role === "HR") {
      const hrDeniedAdminPaths = ["/admin/users", "/admin/access", "/admin/content", "/admin/history"]
      if (hrDeniedAdminPaths.some(p => path === p || path.startsWith(p + "/"))) {
        return NextResponse.redirect(new URL("/admin/invites", req.url))
      }
      // HR cannot edit content via teacher routes (but CAN view submissions read-only)
      const hrDeniedTeacherPaths = ["/teacher/content"]
      if (hrDeniedTeacherPaths.some(p => path === p || path.startsWith(p + "/"))) {
        return NextResponse.redirect(new URL("/teacher/stats", req.url))
      }
    }

    // Protect shared content editing routes (allow TEACHER, CO_ADMIN, and ADMIN — NOT HR)
    if (path.startsWith("/content/modules/") && token?.role !== "TEACHER" && token?.role !== "CO_ADMIN" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Protect /content main page (allow TEACHER, CO_ADMIN, and ADMIN — NOT HR)
    if (path === "/content" && token?.role !== "TEACHER" && token?.role !== "CO_ADMIN" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Redirects for backward compatibility: /admin/content → /content (not for HR)
    if (path === "/admin/content" && (token?.role === "CO_ADMIN" || token?.role === "ADMIN")) {
      return NextResponse.redirect(new URL("/content", req.url))
    }

    // Redirects for backward compatibility: /teacher/content → /content
    if (path === "/teacher/content" && (token?.role === "TEACHER" || token?.role === "CO_ADMIN" || token?.role === "ADMIN")) {
      return NextResponse.redirect(new URL("/content", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        // Public routes
        if (
          path === "/" ||
          path === "/login" ||
          path === "/register" ||
          path.startsWith("/trails") ||
          path.startsWith("/api/auth") ||
          path.startsWith("/api/register") ||
          // Telegram webhook must bypass auth - Telegram sends requests without session
          // Security is handled via X-Telegram-Bot-Api-Secret-Token header in the handler
          path.startsWith("/api/telegram")
        ) {
          return true
        }

        // All other routes require authentication
        // Check token.id specifically — a token without id means the user was invalidated
        return !!token?.id
      },
    },
  }
)

// Feature flag: leaderboard enabled (hardcoded, change in src/lib/feature-flags.ts to re-enable)
const LEADERBOARD_ENABLED = false

// Combined middleware: rate limit first, then auth
export default function middleware(request: NextRequest) {
  const requestId = generateRequestId()
  const path = request.nextUrl.pathname

  try {
    // Block /leaderboard and /api/leaderboard when feature is disabled
    if (!LEADERBOARD_ENABLED && (path === "/leaderboard" || path.startsWith("/leaderboard/") || path === "/api/leaderboard" || path.startsWith("/api/leaderboard/"))) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      // Rewrite to a path that doesn't exist, triggering Next.js 404 page
      const url = request.nextUrl.clone()
      url.pathname = "/__disabled"
      return NextResponse.rewrite(url)
    }

    // Check rate limit for auth endpoints
    const rateLimitResponse = checkAuthRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Proceed with auth middleware
    // @ts-expect-error - withAuth returns a middleware that accepts NextRequest
    return authMiddleware(request)
  } catch (error) {
    // Log error with request ID for tracing (no sensitive data)
    console.error(`[middleware] requestId=${requestId} path=${path} error=${error instanceof Error ? error.message : "unknown"}`)

    // Return a safe response instead of 503
    // For auth pages, allow the request to proceed
    if (path === "/login" || path === "/register") {
      return NextResponse.next()
    }

    // For other routes, redirect to login as a safe fallback
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
