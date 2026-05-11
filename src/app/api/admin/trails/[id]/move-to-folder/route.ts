import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin, adminHasTrailAccess } from "@/lib/admin-access"

const moveSchema = z.object({
  folderId: z.string().nullable(),
})

interface Props {
  params: Promise<{ id: string }>
}

// PATCH - move a trail into a folder (or out of any folder when folderId === null)
// This only mutates Trail.folderId. It does not touch trail content, modules, or order
// inside the trail. Folders are purely organizational.
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const trail = await prisma.trail.findUnique({
      where: { id },
      select: { id: true, title: true, folderId: true },
    })
    if (!trail) {
      return NextResponse.json({ error: "Trail не найден" }, { status: 404 })
    }

    if (session.user.role === "CO_ADMIN") {
      const hasAccess = await adminHasTrailAccess(session.user.id, session.user.role, id)
      if (!hasAccess) {
        return NextResponse.json({ error: "Доступ к этому trail запрещён" }, { status: 403 })
      }
    }

    const body = await request.json()
    const { folderId } = moveSchema.parse(body)

    if (folderId) {
      const folder = await prisma.trailFolder.findUnique({
        where: { id: folderId },
        select: { id: true },
      })
      if (!folder) {
        return NextResponse.json({ error: "Папка не найдена" }, { status: 404 })
      }
    }

    const updated = await prisma.trail.update({
      where: { id },
      data: { folderId: folderId },
      select: { id: true, folderId: true },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        action: "UPDATE",
        entityType: "TRAIL",
        entityId: trail.id,
        entityName: trail.title,
        details: JSON.stringify({
          movedToFolder: folderId,
          fromFolder: trail.folderId,
        }),
      },
    }).catch(() => {})

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error moving trail to folder:", error)
    return NextResponse.json({ error: "Ошибка при перемещении trail" }, { status: 500 })
  }
}
