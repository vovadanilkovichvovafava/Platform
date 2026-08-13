import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin } from "@/lib/admin-access"

const folderUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
})

interface Props {
  params: Promise<{ id: string }>
}

// PATCH - rename / edit description (ADMIN/CO_ADMIN only)
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const existing = await prisma.trailFolder.findUnique({
      where: { id },
      select: { id: true, name: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Папка не найдена" }, { status: 404 })
    }

    const body = await request.json()
    const data = folderUpdateSchema.parse(body)

    const updateData: { name?: string; description?: string } = {}
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.description !== undefined) updateData.description = data.description.trim()

    const folder = await prisma.trailFolder.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        order: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        action: "UPDATE",
        entityType: "TRAIL_FOLDER",
        entityId: folder.id,
        entityName: folder.name,
      },
    }).catch(() => {})

    return NextResponse.json(folder)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error updating folder:", error)
    return NextResponse.json({ error: "Ошибка при обновлении папки" }, { status: 500 })
  }
}

// DELETE - delete folder, only if empty. Never deletes trails inside.
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const existing = await prisma.trailFolder.findUnique({
      where: { id },
      select: { id: true, name: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Папка не найдена" }, { status: 404 })
    }

    const trailsInFolder = await prisma.trail.count({ where: { folderId: id } })
    if (trailsInFolder > 0) {
      return NextResponse.json(
        {
          error: "Нельзя удалить папку, в которой есть trails. Сначала вынесите все trails из папки.",
          trailsCount: trailsInFolder,
        },
        { status: 400 }
      )
    }

    await prisma.trailFolder.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        action: "DELETE",
        entityType: "TRAIL_FOLDER",
        entityId: id,
        entityName: existing.name,
      },
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting folder:", error)
    return NextResponse.json({ error: "Ошибка при удалении папки" }, { status: 500 })
  }
}
