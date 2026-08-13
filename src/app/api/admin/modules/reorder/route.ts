import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin, adminHasTrailAccess } from "@/lib/admin-access"
import { guardTrailPassword } from "@/lib/trail-password"

const reorderSchema = z.object({
  moduleIds: z.array(z.string()).min(1),
  trailId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const { moduleIds, trailId } = reorderSchema.parse(body)

    // CO_ADMIN: check trail access
    if (session.user.role === "CO_ADMIN") {
      const hasAccess = await adminHasTrailAccess(session.user.id, session.user.role, trailId)
      if (!hasAccess) {
        return NextResponse.json({ error: "Доступ к этому trail запрещён" }, { status: 403 })
      }
    }

    // Password check — no role exceptions, only creator bypasses
    const passwordGuard = await guardTrailPassword(trailId, session.user.id)
    if (passwordGuard.denied) {
      return NextResponse.json(
        { error: "Для изменения порядка модулей необходимо ввести пароль", passwordRequired: true },
        { status: 403 }
      )
    }

    // Get trail name for audit log
    const trail = await prisma.trail.findUnique({
      where: { id: trailId },
      select: { title: true },
    })

    // Update order for each module
    await prisma.$transaction(
      moduleIds.map((id, index) =>
        prisma.module.update({
          where: { id },
          data: { order: index },
        })
      )
    )

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        action: "REORDER",
        entityType: "TRAIL",
        entityId: trailId,
        entityName: trail?.title || "Unknown Trail",
        details: JSON.stringify({ moduleCount: moduleIds.length }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error reordering modules:", error)
    return NextResponse.json({ error: "Ошибка при изменении порядка" }, { status: 500 })
  }
}
