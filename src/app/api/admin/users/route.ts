import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin, isAdmin, getAdminAllowedTrailIds } from "@/lib/admin-access"

const updateUserSchema = z.object({
  role: z.enum(["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"]).optional(),
})

// GET - List all users (admin only)
// CO_ADMIN sees only users connected to their assigned trails
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Get allowed trail IDs for CO_ADMIN (null for ADMIN = all trails)
    const allowedTrailIds = await getAdminAllowedTrailIds(
      session.user.id,
      session.user.role
    )

    // Build where clause based on role
    let whereClause = {}

    if (allowedTrailIds !== null) {
      // CO_ADMIN: filter users by their connection to allowed trails
      whereClause = {
        OR: [
          // Students enrolled in allowed trails
          {
            role: "STUDENT",
            enrollments: {
              some: { trailId: { in: allowedTrailIds } }
            }
          },
          // Teachers assigned to allowed trails
          {
            role: "TEACHER",
            teacherTrails: {
              some: { trailId: { in: allowedTrailIds } }
            }
          },
          // CO_ADMIN/ADMIN users assigned to allowed trails
          {
            role: { in: ["CO_ADMIN", "ADMIN"] },
            adminTrailAccess: {
              some: { trailId: { in: allowedTrailIds } }
            }
          },
          // Include self (current CO_ADMIN can always see themselves)
          {
            id: session.user.id
          }
        ]
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        totalXP: true,
        createdAt: true,
        _count: {
          select: {
            enrollments: true,
            submissions: true,
            activityDays: true,
          },
        },
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Ошибка при получении пользователей" }, { status: 500 })
  }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("id")

    if (!userId) {
      return NextResponse.json({ error: "ID пользователя не указан" }, { status: 400 })
    }

    // Don't allow deleting yourself
    if (userId === session.user.id) {
      return NextResponse.json({ error: "Нельзя удалить свой аккаунт" }, { status: 400 })
    }

    // Get target user to check role and trail connections
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        enrollments: { select: { trailId: true } },
        teacherTrails: { select: { trailId: true } },
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    // RBAC: CO_ADMIN cannot delete ADMIN or CO_ADMIN users
    if (!isAdmin(session.user.role) && (targetUser.role === "ADMIN" || targetUser.role === "CO_ADMIN")) {
      return NextResponse.json(
        { error: "Только главный админ может удалять админов" },
        { status: 403 }
      )
    }

    // CO_ADMIN: verify access to user based on trails
    if (!isAdmin(session.user.role)) {
      const allowedTrailIds = await getAdminAllowedTrailIds(
        session.user.id,
        session.user.role
      )

      if (allowedTrailIds !== null) {
        // Get target user's trail connections
        const userTrailIds = [
          ...targetUser.enrollments.map((e) => e.trailId),
          ...targetUser.teacherTrails.map((t) => t.trailId),
        ]

        // Check if there's at least one overlapping trail
        const hasAccess = userTrailIds.some((trailId) =>
          allowedTrailIds.includes(trailId)
        )

        if (!hasAccess) {
          return NextResponse.json(
            { error: "Нет доступа к этому пользователю" },
            { status: 403 }
          )
        }
      }
    }

    // Delete in transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      // First delete invites created by this user (no cascade)
      await tx.invite.deleteMany({
        where: { createdById: userId },
      })

      // Delete reviews made by this user (reviewer relation)
      await tx.review.deleteMany({
        where: { reviewerId: userId },
      })

      // Now delete the user (other relations have cascade)
      await tx.user.delete({
        where: { id: userId },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({
      error: "Ошибка при удалении пользователя",
      details: errorMessage
    }, { status: 500 })
  }
}

// PATCH - Update user (change role)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("id")

    if (!userId) {
      return NextResponse.json({ error: "ID пользователя не указан" }, { status: 400 })
    }

    // Don't allow changing own role
    if (userId === session.user.id) {
      return NextResponse.json({ error: "Нельзя изменить свою роль" }, { status: 400 })
    }

    const body = await request.json()
    const data = updateUserSchema.parse(body)

    // Get target user to check current role and trail connections
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        enrollments: { select: { trailId: true } },
        teacherTrails: { select: { trailId: true } },
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    // RBAC: Only ADMIN can assign or modify ADMIN/CO_ADMIN roles
    // CO_ADMIN cannot:
    // 1. Assign ADMIN or CO_ADMIN role to anyone
    // 2. Change the role of existing ADMIN or CO_ADMIN users
    if (!isAdmin(session.user.role)) {
      // Check if trying to assign privileged role
      if (data.role === "ADMIN" || data.role === "CO_ADMIN") {
        return NextResponse.json(
          { error: "Только главный админ может назначать роли админов" },
          { status: 403 }
        )
      }
      // Check if trying to modify privileged user
      if (targetUser.role === "ADMIN" || targetUser.role === "CO_ADMIN") {
        return NextResponse.json(
          { error: "Только главный админ может изменять роли админов" },
          { status: 403 }
        )
      }

      // CO_ADMIN: verify access to user based on trails
      const allowedTrailIds = await getAdminAllowedTrailIds(
        session.user.id,
        session.user.role
      )

      if (allowedTrailIds !== null) {
        // Get target user's trail connections
        const userTrailIds = [
          ...targetUser.enrollments.map((e) => e.trailId),
          ...targetUser.teacherTrails.map((t) => t.trailId),
        ]

        // Check if there's at least one overlapping trail
        const hasAccess = userTrailIds.some((trailId) =>
          allowedTrailIds.includes(trailId)
        )

        if (!hasAccess) {
          return NextResponse.json(
            { error: "Нет доступа к этому пользователю" },
            { status: 403 }
          )
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Ошибка при обновлении пользователя" }, { status: 500 })
  }
}
