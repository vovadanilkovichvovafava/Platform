import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin, getAdminAllowedTrailIds } from "@/lib/admin-access"
import { checkTrailPasswordAccess } from "@/lib/trail-password"

const bulkDeleteSchema = z.object({
  moduleIds: z.array(z.string()).min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const { moduleIds } = bulkDeleteSchema.parse(body)

    // Get module names and trail IDs for audit log and access check
    const modules = await prisma.module.findMany({
      where: { id: { in: moduleIds } },
      select: { id: true, title: true, trailId: true },
    })

    // CO_ADMIN: check trail access for all modules
    if (session.user.role === "CO_ADMIN") {
      const allowedTrailIds = await getAdminAllowedTrailIds(session.user.id, session.user.role)
      if (allowedTrailIds) {
        const unauthorizedModules = modules.filter(m => !allowedTrailIds.includes(m.trailId))
        if (unauthorizedModules.length > 0) {
          return NextResponse.json({ error: "Нет доступа к некоторым модулям" }, { status: 403 })
        }
      }
    }

    // Check password access for all unique trails that are password protected
    const uniqueTrailIds = [...new Set(modules.map(m => m.trailId))]
    const trails = await prisma.trail.findMany({
      where: { id: { in: uniqueTrailIds } },
      select: { id: true, createdById: true, isPasswordProtected: true },
    })

    for (const trail of trails) {
      const isCreator = trail.createdById === session.user.id
      if (!isCreator && trail.isPasswordProtected) {
        const passwordAccess = await checkTrailPasswordAccess(trail.id, session.user.id)
        if (!passwordAccess.hasAccess) {
          return NextResponse.json(
            { error: "Для удаления модулей из защищённого трейла необходимо ввести пароль", requiresPassword: true },
            { status: 403 }
          )
        }
      }
    }

    // Delete all selected modules
    const result = await prisma.module.deleteMany({
      where: { id: { in: moduleIds } },
    })

    // Create audit logs
    for (const module of modules) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name || session.user.email || "Unknown",
          action: "DELETE",
          entityType: "MODULE",
          entityId: module.id,
          entityName: module.title,
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
