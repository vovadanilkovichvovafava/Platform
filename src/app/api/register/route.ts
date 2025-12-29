import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const registerSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Пароль должен быть минимум 6 символов"),
  name: z.string().min(2, "Имя должно быть минимум 2 символа"),
  inviteCode: z.string().min(1, "Введите код приглашения"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, inviteCode } = registerSchema.parse(body)

    // Check invite code
    const invite = await prisma.invite.findUnique({
      where: { code: inviteCode },
    })

    if (!invite) {
      return NextResponse.json(
        { error: "Неверный код приглашения" },
        { status: 400 }
      )
    }

    // Check if invite is expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Код приглашения истёк" },
        { status: 400 }
      )
    }

    // Check if invite has uses left
    if (invite.usedCount >= invite.maxUses) {
      return NextResponse.json(
        { error: "Код приглашения уже использован максимальное количество раз" },
        { status: 400 }
      )
    }

    // Check if invite is restricted to specific email
    if (invite.email && invite.email !== email) {
      return NextResponse.json(
        { error: "Этот код приглашения предназначен для другого email" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user and update invite in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: "STUDENT",
          invitedBy: invite.createdById,
        },
      })

      // Increment invite usage
      await tx.invite.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      })

      return newUser
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Ошибка при регистрации" },
      { status: 500 }
    )
  }
}
