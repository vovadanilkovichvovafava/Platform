import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getAdminAllowedTrailIds, getStudentAllowedTrailIds, ROLE_STUDENT, ROLE_CO_ADMIN } from "@/lib/admin-access"
import { FEATURE_FLAGS } from "@/lib/feature-flags"

export async function GET() {
  if (!FEATURE_FLAGS.LEADERBOARD_ENABLED) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const session = await getServerSession(authOptions)

    // Build where clause based on role
    let whereClause: { role: string; enrollments?: { some: { trailId: { in: string[] } } } } = {
      role: "STUDENT"
    }

    // STUDENT: only see students enrolled in their assigned trails
    if (session?.user?.role === ROLE_STUDENT) {
      const allowedTrailIds = await getStudentAllowedTrailIds(session.user.id)

      whereClause = {
        role: "STUDENT",
        enrollments: {
          some: { trailId: { in: allowedTrailIds } }
        }
      }
    }
    // CO_ADMIN: filter by their assigned trails
    else if (session?.user?.role === ROLE_CO_ADMIN) {
      const allowedTrailIds = await getAdminAllowedTrailIds(
        session.user.id,
        session.user.role
      )

      if (allowedTrailIds !== null) {
        whereClause = {
          role: "STUDENT",
          enrollments: {
            some: { trailId: { in: allowedTrailIds } }
          }
        }
      }
    }

    // Get top 10 students by XP
    const students = await prisma.user.findMany({
      where: whereClause,
      orderBy: { totalXP: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        totalXP: true,
        avatarUrl: true,
        _count: {
          select: {
            moduleProgress: {
              where: { status: "COMPLETED" },
            },
            certificates: true,
          },
        },
      },
    })

    // Add rank
    const leaderboard = students.map((student, index) => ({
      rank: index + 1,
      id: student.id,
      name: student.name,
      totalXP: student.totalXP,
      avatarUrl: student.avatarUrl,
      modulesCompleted: student._count.moduleProgress,
      certificates: student._count.certificates,
    }))

    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error("Leaderboard error:", error)
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 })
  }
}
