import { withAuth } from "next-auth/middleware"
import { NextResponse, NextRequest } from "next/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

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
    if (token && (path === "/login" || path === "/register")) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Protect teacher routes (allow both TEACHER and ADMIN)
    if (path.startsWith("/teacher") && token?.role !== "TEACHER" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Protect admin routes
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Protect shared content editing routes (allow both TEACHER and ADMIN)
    if (path.startsWith("/content/modules/") && token?.role !== "TEACHER" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
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
          path.startsWith("/api/register")
        ) {
          return true
        }

        // All other routes require authentication
        return !!token
      },
    },
  }
)

// Combined middleware: rate limit first, then auth
export default function middleware(request: NextRequest) {
  // Check rate limit for auth endpoints
  const rateLimitResponse = checkAuthRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Proceed with auth middleware
  // @ts-expect-error - withAuth returns a middleware that accepts NextRequest
  return authMiddleware(request)
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
