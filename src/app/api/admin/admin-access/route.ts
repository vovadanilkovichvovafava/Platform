import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin, setCoAdminTrailAccess, getCoAdminsWithTrailAccess, ROLE_CO_ADMIN, ROLE_HR } from "@/lib/admin-access"
import { z } from "zod"

const updateAccessSchema = z.object({
  coAdminId: z.string().min(1),
  trailIds: z.array(z.string()),
})

// GET - List all co-admins with their trail access (ADMIN only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён. Требуется роль ADMIN" }, { status: 403 })
    }

    // Get all co-admins with their trail access
    const coAdmins = await getCoAdminsWithTrailAccess()

    // Get all trails for selection
    const trails = await prisma.trail.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
        isPublished: true,
      },
    })

    return NextResponse.json({ coAdmins, trails })
  } catch (error) {
    console.error("Error fetching co-admin access:", error)
    return NextResponse.json({ error: "Ошибка загрузки данных" }, { status: 500 })
  }
}

// POST - Update co-admin's trail access (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён. Требуется роль ADMIN" }, { status: 403 })
    }

    const body = await request.json()
    const data = updateAccessSchema.parse(body)

    // Verify user exists and has CO_ADMIN or HR role
    const coAdmin = await prisma.user.findUnique({
      where: { id: data.coAdminId },
      select: { id: true, role: true },
    })

    if (!coAdmin) {
      return NextResponse.json({ error: "Со-администратор не найден" }, { status: 404 })
    }

    if (coAdmin.role !== ROLE_CO_ADMIN && coAdmin.role !== ROLE_HR) {
      return NextResponse.json({ error: "Пользователь не является со-администратором или HR" }, { status: 400 })
    }

    // Verify all trail IDs exist
    if (data.trailIds.length > 0) {
      const existingTrails = await prisma.trail.findMany({
        where: { id: { in: data.trailIds } },
        select: { id: true },
      })

      if (existingTrails.length !== data.trailIds.length) {
        return NextResponse.json({ error: "Некоторые trail не найдены" }, { status: 400 })
      }
    }

    // Update access (atomic transaction in setCoAdminTrailAccess)
    await setCoAdminTrailAccess(data.coAdminId, data.trailIds)

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        action: "UPDATE",
        entityType: "CO_ADMIN_ACCESS",
        entityId: data.coAdminId,
        entityName: `${coAdmin.role === ROLE_HR ? "HR" : "Co-admin"} access updated (${data.trailIds.length} trails)`,
        details: JSON.stringify({ trailIds: data.trailIds }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error updating co-admin access:", error)
    return NextResponse.json({ error: "Ошибка при обновлении доступа" }, { status: 500 })
  }
}
