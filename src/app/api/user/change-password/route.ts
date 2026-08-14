import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Пароль должен быть минимум 6 символов"),
})

/**
 * POST /api/user/change-password
 *
 * Смена собственного пароля.
 * - Обычный режим: требуется currentPassword и проверяется.
 * - Режим форс-смены (mustChangePassword=true, пароль сброшен админом на временный):
 *   currentPassword не требуется — пользователь только что подтвердил личность,
 *   войдя по временному паролю. После смены флаг снимается.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = changePasswordSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, mustChangePassword: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    // В обычном режиме требуем и проверяем текущий пароль.
    if (!user.mustChangePassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Введите текущий пароль" }, { status: 400 })
      }
      const isValid = await bcrypt.compare(currentPassword, user.password)
      if (!isValid) {
        return NextResponse.json({ error: "Неверный текущий пароль" }, { status: 400 })
      }
    }

    // Новый пароль не должен совпадать с временным/текущим.
    const sameAsOld = await bcrypt.compare(newPassword, user.password)
    if (sameAsOld) {
      return NextResponse.json(
        { error: "Новый пароль не должен совпадать с текущим" },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashed, mustChangePassword: false },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("[ChangePassword] error:", error)
    return NextResponse.json({ error: "Ошибка при смене пароля" }, { status: 500 })
  }
}
