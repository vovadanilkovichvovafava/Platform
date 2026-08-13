import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin, isHR, isPrivileged } from "@/lib/admin-access"

const folderSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(120),
  description: z.string().max(500).default(""),
})

// GET - list all folders (any privileged user can read; positions are global)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || (!isPrivileged(session.user.role) && !isHR(session.user.role))) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const folders = await prisma.trailFolder.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        order: true,
      },
    })

    return NextResponse.json(folders)
  } catch (error) {
    console.error("Error fetching folders:", error)
    return NextResponse.json({ error: "Ошибка при получении папок" }, { status: 500 })
  }
}

// POST - create folder (ADMIN/CO_ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const data = folderSchema.parse(body)

    const maxOrder = await prisma.trailFolder.aggregate({ _max: { order: true } })

    const folder = await prisma.trailFolder.create({
      data: {
        name: data.name.trim(),
        description: data.description.trim(),
        order: (maxOrder._max.order || 0) + 1,
      },
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
        action: "CREATE",
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
    console.error("Error creating folder:", error)
    return NextResponse.json({ error: "Ошибка при создании папки" }, { status: 500 })
  }
}
