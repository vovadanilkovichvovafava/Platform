import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSuperAdmin, setAdminTrailAccess, getAdminsWithTrailAccess, ROLE_ADMIN } from "@/lib/admin-access"
import { z } from "zod"

const updateAccessSchema = z.object({
  adminId: z.string().min(1),
  trailIds: z.array(z.string()),
})

// GET - List all admins with their trail access (SUPER_ADMIN only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён. Требуется роль SUPER_ADMIN" }, { status: 403 })
    }

    // Get all admins with their trail access
    const admins = await getAdminsWithTrailAccess()

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

    return NextResponse.json({ admins, trails })
  } catch (error) {
    console.error("Error fetching admin access:", error)
    return NextResponse.json({ error: "Ошибка загрузки данных" }, { status: 500 })
  }
}

// POST - Update admin's trail access (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён. Требуется роль SUPER_ADMIN" }, { status: 403 })
    }

    const body = await request.json()
    const data = updateAccessSchema.parse(body)

    // Verify admin exists and has ADMIN role
    const admin = await prisma.user.findUnique({
      where: { id: data.adminId },
      select: { id: true, role: true },
    })

    if (!admin) {
      return NextResponse.json({ error: "Администратор не найден" }, { status: 404 })
    }

    if (admin.role !== ROLE_ADMIN) {
      return NextResponse.json({ error: "Пользователь не является администратором" }, { status: 400 })
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

    // Update access (atomic transaction in setAdminTrailAccess)
    await setAdminTrailAccess(data.adminId, data.trailIds)

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        action: "UPDATE",
        entityType: "ADMIN_ACCESS",
        entityId: data.adminId,
        entityName: `Admin access updated (${data.trailIds.length} trails)`,
        details: JSON.stringify({ trailIds: data.trailIds }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error updating admin access:", error)
    return NextResponse.json({ error: "Ошибка при обновлении доступа" }, { status: 500 })
  }
}
