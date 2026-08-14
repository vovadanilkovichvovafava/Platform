import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/admin-access"
import { generateTempPassword } from "@/lib/temp-password"
import bcrypt from "bcryptjs"

/**
 * POST /api/admin/users/[id]/reset-password
 *
 * Сброс пароля пользователя супер-админом. Генерирует одноразовый временный
 * пароль, сохраняет его bcrypt-хеш и ставит mustChangePassword=true — при входе
 * пользователю показывается модалка смены пароля. Плейн-текст временного пароля
 * возвращается ОДИН раз, чтобы админ передал его пользователю; в базе он не хранится.
 *
 * Только ADMIN (супер-админ). CO_ADMIN/HR доступа не имеют.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { id } = await params

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    })

    if (!target) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    const tempPassword = generateTempPassword()
    const hashed = await bcrypt.hash(tempPassword, 10)

    await prisma.user.update({
      where: { id },
      data: { password: hashed, mustChangePassword: true },
    })

    // Аудит — без самого пароля
    await prisma.auditLog
      .create({
        data: {
          userId: session.user.id,
          userName: session.user.name || session.user.email || "Unknown",
          action: "RESET_PASSWORD",
          entityType: "USER",
          entityId: target.id,
          entityName: target.email,
        },
      })
      .catch(() => {}) // Non-blocking audit

    return NextResponse.json({
      tempPassword,
      user: { id: target.id, name: target.name, email: target.email },
    })
  } catch (error) {
    console.error("[ResetPassword] error:", error)
    return NextResponse.json(
      { error: "Ошибка при сбросе пароля" },
      { status: 500 }
    )
  }
}
