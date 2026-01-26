import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const updateProfileSchema = z.object({
  name: z.string().min(2, "Имя должно быть минимум 2 символа").optional(),
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

    const updateData: { name?: string; password?: string } = {}

    // Update name if provided
    if (data.name) {
      updateData.name = data.name
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
        email: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Ошибка при обновлении профиля" }, { status: 500 })
  }
}
