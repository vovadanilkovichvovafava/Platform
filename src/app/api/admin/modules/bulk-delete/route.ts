import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const bulkDeleteSchema = z.object({
  moduleIds: z.array(z.string()).min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const { moduleIds } = bulkDeleteSchema.parse(body)

    // Get module names for audit log
    const modules = await prisma.module.findMany({
      where: { id: { in: moduleIds } },
      select: { id: true, title: true },
    })

    // Delete all selected modules
    const result = await prisma.module.deleteMany({
      where: { id: { in: moduleIds } },
    })

    // Create audit logs
    for (const mod of modules) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name || session.user.email || "Unknown",
          action: "DELETE",
          entityType: "MODULE",
          entityId: mod.id,
          entityName: mod.title,
          details: JSON.stringify({ bulkDelete: true, count: moduleIds.length }),
        },
      })
    }

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `Удалено ${result.count} модулей`
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error bulk deleting modules:", error)
    return NextResponse.json({ error: "Ошибка при удалении" }, { status: 500 })
  }
}
