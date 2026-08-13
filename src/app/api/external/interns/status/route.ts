import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyExternalAuth } from "@/lib/external-auth"
import { computeAggregateStatus } from "@/lib/intern-status"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/external/interns/status?email=...&internId=...
 *
 * Returns the current aggregate status of a single intern.
 * Requires: Authorization: Bearer <COMMUNICATION_API_KEY>
 */
export async function GET(request: Request) {
  const authError = verifyExternalAuth(request)
  if (authError) return authError

  try {
    const url = new URL(request.url)
    const email = url.searchParams.get("email")
    const internId = url.searchParams.get("internId")

    if (!email && !internId) {
      return NextResponse.json(
        { error: "email or internId is required" },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        }
      )
    }

    const user = await prisma.user.findFirst({
      where: {
        role: "STUDENT",
        ...(internId ? { id: internId } : { email: email! }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        telegramUsername: true,
        trailStatuses: {
          select: {
            status: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { found: false },
        {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        }
      )
    }

    const { status, statusUpdatedAt } = computeAggregateStatus(user.trailStatuses)

    return NextResponse.json(
      {
        found: true,
        intern: {
          id: user.id,
          email: user.email,
          name: user.name,
          telegramUsername: user.telegramUsername ?? null,
        },
        status,
        statusUpdatedAt,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    )
  } catch (error) {
    console.error("External interns/status API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
