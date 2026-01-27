import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Get pending submissions count for teacher/admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Only allow TEACHER and ADMIN roles
    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 })
    }

    const isAdmin = session.user.role === "ADMIN"

    let pendingCount = 0

    if (isAdmin) {
      // Admin sees all pending submissions
      pendingCount = await prisma.submission.count({
        where: { status: "PENDING" },
      })
    } else {
      // Teacher sees trails with teacherVisibility = "ALL_TEACHERS" + specifically assigned trails
      const allTeacherTrails = await prisma.trail.findMany({
        where: { teacherVisibility: "ALL_TEACHERS" },
        select: { id: true },
      })

      const specificAssignments = await prisma.trailTeacher.findMany({
        where: { teacherId: session.user.id },
        select: { trailId: true },
      })

      const allTrailIds = new Set([
        ...allTeacherTrails.map((t) => t.id),
        ...specificAssignments.map((a) => a.trailId),
      ])

      const assignedTrailIds = Array.from(allTrailIds)

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
