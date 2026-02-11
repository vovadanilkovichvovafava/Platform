import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const updateProfileSchema = z.object({
  firstName: z.string().min(2, "Имя должно быть минимум 2 символа").optional(),
  lastName: z.string().min(2, "Фамилия должна быть минимум 2 символа").optional(),
  telegramUsername: z
    .string()
    .regex(/^@[a-zA-Z0-9_]{5,32}$/, "Формат: @username (от 5 символов, латиница, цифры, _)")
    .optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Пароль должен быть минимум 6 символов").optional(),
})

// GET - Get current user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        telegramUsername: true,
        email: true,
        role: true,
        totalXP: true,
        createdAt: true,
        _count: {
          select: {
            submissions: true,
            moduleProgress: true,
            activityDays: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Ошибка при получении профиля" }, { status: 500 })
  }
}

// PATCH - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const body = await request.json()
    const data = updateProfileSchema.parse(body)

    const updateData: {
      name?: string
      firstName?: string
      lastName?: string
      telegramUsername?: string
      password?: string
    } = {}

    // Update firstName/lastName and recompute name
    if (data.firstName !== undefined || data.lastName !== undefined) {
      // Need current values to compute the full name
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true },
      })

      if (!currentUser) {
        return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
      }

      const newFirstName = data.firstName ?? currentUser.firstName ?? ""
      const newLastName = data.lastName ?? currentUser.lastName ?? ""

      if (data.firstName !== undefined) updateData.firstName = data.firstName
      if (data.lastName !== undefined) updateData.lastName = data.lastName
      updateData.name = `${newFirstName} ${newLastName}`.trim()
    }

    // Update telegramUsername if provided
    if (data.telegramUsername !== undefined) {
      updateData.telegramUsername = data.telegramUsername
    }

    // Update password if provided
    if (data.newPassword) {
      if (!data.currentPassword) {
        return NextResponse.json(
          { error: "Введите текущий пароль" },
          { status: 400 }
        )
      }

      // Verify current password
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true },
      })

      if (!user) {
        return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
      }

      const isValid = await bcrypt.compare(data.currentPassword, user.password)
      if (!isValid) {
        return NextResponse.json(
          { error: "Неверный текущий пароль" },
          { status: 400 }
        )
      }

      updateData.password = await bcrypt.hash(data.newPassword, 10)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Нечего обновлять" }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        telegramUsername: true,
        email: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {}
      for (const e of error.errors) {
        const field = e.path.join(".")
        if (!fieldErrors[field]) fieldErrors[field] = e.message
      }
      return NextResponse.json({ error: error.errors[0].message, fieldErrors }, { status: 400 })
    }
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Ошибка при обновлении профиля" }, { status: 500 })
  }
}
