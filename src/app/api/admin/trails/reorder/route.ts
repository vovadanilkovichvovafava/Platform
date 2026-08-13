import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin } from "@/lib/admin-access"

const reorderSchema = z.object({
  trailIds: z.array(z.string()).min(1),
})

// POST - persist relative order for a set of trails (ADMIN/CO_ADMIN only).
// The client sends the IDs of trails belonging to the same group (folder or root)
// in their new sequence. We take the existing `order` values of these trails,
// sort them ascending and reassign them in the new sequence. This preserves
// global ordering for any trails outside the group.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const { trailIds } = reorderSchema.parse(body)

    const trails = await prisma.trail.findMany({
      where: { id: { in: trailIds } },
      select: { id: true, order: true },
    })
    if (trails.length !== trailIds.length) {
      return NextResponse.json({ error: "Часть trails не найдена" }, { status: 404 })
    }

    const sortedOrders = trails.map((t) => t.order).sort((a, b) => a - b)

    await prisma.$transaction(
      trailIds.map((id, index) =>
        prisma.trail.update({
          where: { id },
          data: { order: sortedOrders[index] },
        })
      )
    )

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        action: "REORDER",
        entityType: "TRAIL",
        entityId: "*",
        entityName: "Trails",
        details: JSON.stringify({ trailCount: trailIds.length }),
      },
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error reordering trails:", error)
    return NextResponse.json({ error: "Ошибка при изменении порядка trails" }, { status: 500 })
  }
}
