import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin, isAdmin, getAdminAllowedTrailIds } from "@/lib/admin-access"

const createInviteSchema = z.object({
  code: z.string().min(3, "Код должен быть минимум 3 символа").toUpperCase(),
  email: z.string().email().optional().or(z.literal("")),
  maxUses: z.number().min(1).default(1),
  expiresAt: z.string().optional(),
  trailIds: z.array(z.string()).optional().default([]),
})

// Cleanup periods in milliseconds
const CLEANUP_PERIODS: Record<string, number> = {
  "10m": 10 * 60 * 1000,        // 10 minutes
  "1h": 60 * 60 * 1000,         // 1 hour
  "1d": 24 * 60 * 60 * 1000,    // 1 day (default)
}

// GET - List all invites (ADMIN and CO_ADMIN)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Get cleanup period from query params (default: 1 day)
    const { searchParams } = new URL(request.url)
    const cleanupPeriod = searchParams.get("cleanupPeriod") || "1d"
    const periodMs = CLEANUP_PERIODS[cleanupPeriod] || CLEANUP_PERIODS["1d"]

    // Opportunistic cleanup: delete exhausted invites older than the period
    // An invite is "exhausted" when usedCount >= maxUses
    const cutoffDate = new Date(Date.now() - periodMs)

    // Find exhausted invites to delete
    const exhaustedInvites = await prisma.invite.findMany({
      where: {
        updatedAt: { lt: cutoffDate },
      },
      select: { id: true, usedCount: true, maxUses: true },
    })

    // Filter to only exhausted ones (usedCount >= maxUses) and delete
    const idsToDelete = exhaustedInvites
      .filter((inv) => inv.usedCount >= inv.maxUses)
      .map((inv) => inv.id)

    if (idsToDelete.length > 0) {
      await prisma.invite.deleteMany({
        where: { id: { in: idsToDelete } },
      })
    }

    // Now fetch the remaining invites
    const invites = await prisma.invite.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
        trails: {
          include: {
            trail: {
              select: { id: true, title: true, slug: true },
            },
          },
        },
      },
    })

    // Transform to flatten trails for easier frontend consumption
    const invitesWithTrails = invites.map((invite) => ({
      ...invite,
      selectedTrails: invite.trails.map((t) => t.trail),
      trails: undefined, // Remove the nested structure
    }))

    return NextResponse.json(invitesWithTrails)
  } catch (error) {
    console.error("Error fetching invites:", error)
    return NextResponse.json({ error: "Ошибка при получении приглашений" }, { status: 500 })
  }
}

// POST - Create new invite (ADMIN and CO_ADMIN)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const data = createInviteSchema.parse(body)

    // Check if code already exists
    const existingInvite = await prisma.invite.findUnique({
      where: { code: data.code },
    })

    if (existingInvite) {
      return NextResponse.json({ error: "Такой код уже существует" }, { status: 400 })
    }

    // Validate trailIds if provided
    const trailIds = [...new Set(data.trailIds)] // Remove duplicates

    if (trailIds.length > 0) {
      // Verify all trails exist
      const existingTrails = await prisma.trail.findMany({
        where: { id: { in: trailIds } },
        select: { id: true },
      })

      const existingTrailIds = new Set(existingTrails.map((t) => t.id))
      const invalidIds = trailIds.filter((id) => !existingTrailIds.has(id))

      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: "Некоторые трейлы не найдены" },
          { status: 400 }
        )
      }

      // CO_ADMIN: verify access to selected trails
      if (!isAdmin(session.user.role)) {
        const allowedTrailIds = await getAdminAllowedTrailIds(
          session.user.id,
          session.user.role
        )

        if (allowedTrailIds !== null) {
          const allowedSet = new Set(allowedTrailIds)
          const forbiddenIds = trailIds.filter((id) => !allowedSet.has(id))

          if (forbiddenIds.length > 0) {
            return NextResponse.json(
              { error: "Доступ к некоторым трейлам запрещён" },
              { status: 403 }
            )
          }
        }
      }
    }

    // Create invite with trail associations in a transaction
    const invite = await prisma.$transaction(async (tx) => {
      const newInvite = await tx.invite.create({
        data: {
          code: data.code,
          email: data.email || null,
          maxUses: data.maxUses,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          createdById: session.user.id,
        },
      })

      // Create trail associations
      if (trailIds.length > 0) {
        await tx.inviteTrail.createMany({
          data: trailIds.map((trailId) => ({
            inviteId: newInvite.id,
            trailId,
          })),
        })
      }

      return newInvite
    })

    // Fetch the complete invite with trails for response
    const completeInvite = await prisma.invite.findUnique({
      where: { id: invite.id },
      include: {
        trails: {
          include: {
            trail: {
              select: { id: true, title: true, slug: true },
            },
          },
        },
      },
    })

    return NextResponse.json({
      ...completeInvite,
      selectedTrails: completeInvite?.trails.map((t) => t.trail) || [],
      trails: undefined,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error creating invite:", error)
    return NextResponse.json({ error: "Ошибка при создании приглашения" }, { status: 500 })
  }
}

// DELETE - Delete invite (ADMIN and CO_ADMIN)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID не указан" }, { status: 400 })
    }

    await prisma.invite.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invite:", error)
    return NextResponse.json({ error: "Ошибка при удалении приглашения" }, { status: 500 })
  }
}
