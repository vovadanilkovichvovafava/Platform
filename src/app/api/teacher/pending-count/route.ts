import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrivileged, getPrivilegedAllowedTrailIds } from "@/lib/admin-access"

// GET - Get pending submissions count for teacher/admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Allow TEACHER, CO_ADMIN, and ADMIN roles
    if (!isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
    }

    const assignedTrailIds = await getPrivilegedAllowedTrailIds(session.user.id, session.user.role)

    let pendingCount = 0

    if (assignedTrailIds === null) {
      // ADMIN - sees all pending submissions
      pendingCount = await prisma.submission.count({
        where: { status: "PENDING" },
      })
    } else if (assignedTrailIds.length > 0) {
      // CO_ADMIN / TEACHER - sees only assigned trails
      pendingCount = await prisma.submission.count({
        where: {
          status: "PENDING",
          module: { trailId: { in: assignedTrailIds } },
        },
      })
    }

    return NextResponse.json({ pendingCount })
  } catch (error) {
    console.error("Error fetching pending count:", error)
    return NextResponse.json({ error: "Ошибка получения данных" }, { status: 500 })
  }
}
