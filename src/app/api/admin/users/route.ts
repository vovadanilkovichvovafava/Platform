import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin, isAdmin } from "@/lib/admin-access"

const updateUserSchema = z.object({
  role: z.enum(["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"]).optional(),
})

// GET - List all users (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const users = await prisma.user.findMany({
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

    // Only ADMIN can assign ADMIN role
    if (data.role === "ADMIN" && !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Только админ может назначать роль админа" }, { status: 403 })
    }

    // Get target user to check if trying to demote ADMIN
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (targetUser?.role === "ADMIN" && !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Только админ может изменять роль админа" }, { status: 403 })
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
