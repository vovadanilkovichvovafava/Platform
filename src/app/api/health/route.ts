import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Health checks must never be cached or statically optimized
export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * Health probe for container orchestration (liveness/readiness).
 *
 * GET /api/health        -> liveness: process is up (no DB access)
 * GET /api/health?db=1   -> readiness: also verifies the database connection
 *
 * Returns 200 when healthy, 503 when the database is unreachable.
 * Intentionally unauthenticated — it exposes no business data.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const checkDb = url.searchParams.get("db") === "1"

  if (!checkDb) {
    return NextResponse.json({ status: "ok", uptime: process.uptime() })
  }

  const startedAt = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: "ok",
      database: "up",
      latencyMs: Date.now() - startedAt,
      uptime: process.uptime(),
    })
  } catch (error) {
    console.error("Health check: database unreachable", error)
    return NextResponse.json(
      {
        status: "error",
        database: "down",
        latencyMs: Date.now() - startedAt,
      },
      { status: 503 }
    )
  }
}
