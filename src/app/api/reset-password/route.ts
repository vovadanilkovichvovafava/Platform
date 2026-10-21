import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

/**
 * Публичный сброс пароля по одноразовой ссылке (токену).
 * Токен создаётся админом (POST /api/admin/users/[id]/reset-link).
 *
 * GET  ?token=...                 → проверка токена { valid, email? }
 * POST { token, newPassword }     → установка нового пароля, токен гасится
 *
 * Роут публичный: пользователь не залогинен (забыл пароль). Единственный секрет —
 * сам токен (криптослучайный, одноразовый, с TTL).
 */

const resetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6, "Пароль должен быть минимум 6 символов"),
})

// GET — проверить валидность токена (для страницы).
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || ""
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 200 })
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { usedAt: true, expiresAt: true, user: { select: { email: true } } },
  })

  const valid = !!record && !record.usedAt && record.expiresAt > new Date()
  return NextResponse.json({
    valid,
    email: valid ? record!.user.email : undefined,
  })
}

// POST — применить новый пароль по токену.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, newPassword } = resetSchema.parse(body)

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      select: { id: true, userId: true, usedAt: true, expiresAt: true },
    })

    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Ссылка недействительна или устарела. Запросите новую." },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(newPassword, 10)

    // Ставим пароль, гасим токен и снимаем флаг форс-смены — атомарно.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed, mustChangePassword: false },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Остальные неиспользованные ссылки этого пользователя тоже гасим.
      prisma.passwordResetToken.deleteMany({
        where: { userId: record.userId, usedAt: null },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("[ResetPassword] error:", error)
    return NextResponse.json({ error: "Ошибка при сбросе пароля" }, { status: 500 })
  }
}
