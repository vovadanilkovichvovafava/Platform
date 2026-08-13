import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAnyAdmin, isAdmin, getAdminAllowedTrailIds } from "@/lib/admin-access"

// GET - List all teachers (users with TEACHER role, not ADMIN)
// CO_ADMIN sees only teachers assigned to their trails
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Build where clause based on role
    let whereClause: {
      role: string
      teacherTrails?: { some: { trailId: { in: string[] } } }
    } = { role: "TEACHER" }

    // CO_ADMIN: filter teachers by their assigned trails
    if (!isAdmin(session.user.role)) {
      const allowedTrailIds = await getAdminAllowedTrailIds(
        session.user.id,
        session.user.role
      )

      if (allowedTrailIds !== null) {
        whereClause = {
          role: "TEACHER",
          teacherTrails: {
            some: { trailId: { in: allowedTrailIds } }
          }
        }
      }
    }

    const teachers = await prisma.user.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    return NextResponse.json(teachers)
  } catch (error) {
    console.error("Error fetching teachers:", error)
    return NextResponse.json({ error: "Ошибка при получении учителей" }, { status: 500 })
  }
}
