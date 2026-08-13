import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  isAdmin,
  isHR,
  isPrivileged,
  getAdminAllowedTrailIds,
  getTeacherAllowedTrailIds,
  ROLE_TEACHER,
  ROLE_HR,
} from "@/lib/admin-access"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Allow ADMIN, CO_ADMIN, TEACHER, and HR (read-only)
    if (!session?.user?.id || (!isPrivileged(session.user.role) && !isHR(session.user.role))) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const entityType = searchParams.get("entityType")

    // ADMIN sees all logs
    if (isAdmin(session.user.role)) {
      const logs = await prisma.auditLog.findMany({
        where: entityType ? { entityType } : undefined,
        orderBy: { createdAt: "desc" },
        take: limit,
      })
      return NextResponse.json(logs)
    }

    // CO_ADMIN, TEACHER, and HR: filter by accessible trails
    let allowedTrailIds: string[]

    if (session.user.role === ROLE_TEACHER) {
      // TEACHER: get trails from TrailTeacher + ALL_TEACHERS visibility
      allowedTrailIds = await getTeacherAllowedTrailIds(session.user.id)
    } else {
      // CO_ADMIN or HR: get trails from AdminTrailAccess
      const trailIds = await getAdminAllowedTrailIds(session.user.id, session.user.role)
      allowedTrailIds = trailIds || []
    }

    // If no trails assigned, return empty
    if (allowedTrailIds.length === 0) {
      return NextResponse.json([])
    }

    // Get module IDs that belong to allowed trails
    const allowedModules = await prisma.module.findMany({
      where: { trailId: { in: allowedTrailIds } },
      select: { id: true },
    })
    const allowedModuleIds = allowedModules.map((m) => m.id)

    // Build filter: only show logs for TRAIL/MODULE entities that user has access to
    // Other entity types (USER, etc.) are not shown to non-admins
    const baseWhere = entityType ? { entityType } : undefined

    const logs = await prisma.auditLog.findMany({
      where: {
        ...baseWhere,
        OR: [
          // TRAIL entity: must be in allowed trails
          {
            entityType: "TRAIL",
            entityId: { in: allowedTrailIds },
          },
          // MODULE entity: must belong to allowed trails
          {
            entityType: "MODULE",
            entityId: { in: allowedModuleIds },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return NextResponse.json({ error: "Ошибка загрузки логов" }, { status: 500 })
  }
}

// Helper function to create audit log (exported for use in other routes)
export async function createAuditLog(data: {
  userId: string
  userName: string
  action: string
  entityType: string
  entityId: string
  entityName: string
  details?: string
}) {
  try {
    await prisma.auditLog.create({ data })
  } catch (error) {
    console.error("Error creating audit log:", error)
  }
}
