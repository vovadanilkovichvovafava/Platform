import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin } from "@/lib/admin-access"

const reorderSchema = z.object({
  folderIds: z.array(z.string()).min(1),
})

// POST - persist global folder order (ADMIN/CO_ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const { folderIds } = reorderSchema.parse(body)

    await prisma.$transaction(
      folderIds.map((id, index) =>
        prisma.trailFolder.update({
          where: { id },
          data: { order: index },
        })
      )
    )

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        action: "REORDER",
        entityType: "TRAIL_FOLDER",
        entityId: "*",
        entityName: "Папки трейлов",
        details: JSON.stringify({ folderCount: folderIds.length }),
      },
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error reordering folders:", error)
    return NextResponse.json({ error: "Ошибка при изменении порядка папок" }, { status: 500 })
  }
}
