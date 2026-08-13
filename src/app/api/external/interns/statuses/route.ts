import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyExternalAuth } from "@/lib/external-auth"
import { computeAggregateStatus } from "@/lib/intern-status"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_EMAILS = 200
const MAX_INTERN_IDS = 200

/**
 * POST /api/external/interns/statuses
 *
 * Bulk status lookup for a list of emails or internIds.
 * Body: { "emails": ["a@b.com", ...] } or { "internIds": ["id1", ...] }
 * Requires: Authorization: Bearer <COMMUNICATION_API_KEY>
 */
export async function POST(request: Request) {
  const authError = verifyExternalAuth(request)
  if (authError) return authError

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        }
      )
    }

    const { emails, internIds } = body as {
      emails?: string[]
      internIds?: string[]
    }

    const useEmails = Array.isArray(emails) && emails.length > 0
    const useInternIds = Array.isArray(internIds) && internIds.length > 0

    if (!useEmails && !useInternIds) {
      return NextResponse.json(
        { error: "emails or internIds array is required and must not be empty" },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        }
      )
    }

    if (useEmails && emails!.length > MAX_EMAILS) {
      return NextResponse.json(
        { error: `emails array exceeds maximum of ${MAX_EMAILS}` },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        }
      )
    }

    if (useInternIds && internIds!.length > MAX_INTERN_IDS) {
      return NextResponse.json(
        { error: `internIds array exceeds maximum of ${MAX_INTERN_IDS}` },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        }
      )
    }

    // Query all matching students in one DB call
    const users = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        ...(useEmails
          ? { email: { in: emails! } }
          : { id: { in: internIds! } }),
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

    // Build lookup maps for fast matching
    const byEmail = new Map<string, (typeof users)[number]>()
    const byId = new Map<string, (typeof users)[number]>()
    for (const u of users) {
      byEmail.set(u.email, u)
      byId.set(u.id, u)
    }

    // Build results preserving input order
    const results = useEmails
      ? emails!.map((email) => {
          const user = byEmail.get(email)
          if (!user) {
            return { email, found: false as const }
          }
          const { status, statusUpdatedAt } = computeAggregateStatus(user.trailStatuses)
          return {
            email: user.email,
            found: true as const,
            internId: user.id,
            telegramUsername: user.telegramUsername ?? null,
            status,
            statusUpdatedAt,
          }
        })
      : internIds!.map((id) => {
          const user = byId.get(id)
          if (!user) {
            return { internId: id, found: false as const }
          }
          const { status, statusUpdatedAt } = computeAggregateStatus(user.trailStatuses)
          return {
            email: user.email,
            found: true as const,
            internId: user.id,
            telegramUsername: user.telegramUsername ?? null,
            status,
            statusUpdatedAt,
          }
        })

    return NextResponse.json(
      { results },
      {
        headers: { "Cache-Control": "no-store" },
      }
    )
  } catch (error) {
    console.error("External interns/statuses API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
