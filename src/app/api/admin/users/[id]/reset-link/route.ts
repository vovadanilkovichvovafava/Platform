import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/admin-access"
import {
  generateResetToken,
  buildResetUrl,
  getAppBaseUrl,
  RESET_TOKEN_TTL_MS,
} from "@/lib/password-reset"

/**
 * POST /api/admin/users/[id]/reset-link
 *
 * Создаёт одноразовую ссылку сброса пароля для пользователя и возвращает её.
 * Админ сам передаёт ссылку пользователю (в мессенджере) — почта не нужна.
 * Старые неиспользованные ссылки этого пользователя инвалидируются.
 *
 * Только ADMIN (супер-админ).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    if (!getAppBaseUrl()) {
      return NextResponse.json(
        { error: "NEXTAUTH_URL не задан — ссылку не из чего построить" },
        { status: 500 }
      )
    }

    const { id } = await params

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    })
    if (!target) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    const token = generateResetToken()
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

    // Инвалидируем прошлые неиспользованные ссылки и создаём новую.
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({
        where: { userId: target.id, usedAt: null },
      }),
      prisma.passwordResetToken.create({
        data: { token, userId: target.id, expiresAt },
      }),
    ])

    await prisma.auditLog
      .create({
        data: {
          userId: session.user.id,
          userName: session.user.name || session.user.email || "Unknown",
          action: "CREATE_RESET_LINK",
          entityType: "USER",
          entityId: target.id,
          entityName: target.email,
        },
      })
      .catch(() => {})

    return NextResponse.json({
      url: buildResetUrl(token),
      expiresAt,
      user: { id: target.id, name: target.name, email: target.email },
    })
  } catch (error) {
    console.error("[ResetLink] error:", error)
    return NextResponse.json({ error: "Ошибка при создании ссылки" }, { status: 500 })
  }
}
