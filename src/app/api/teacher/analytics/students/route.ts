import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrivileged, getPrivilegedAllowedTrailIds } from "@/lib/admin-access"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isPrivileged(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    // Get assigned trails based on role (null = all for ADMIN)
    const allowedTrailIds = await getPrivilegedAllowedTrailIds(session.user.id, session.user.role)

    let trailIds: string[] = []

    if (allowedTrailIds === null) {
      const allTrails = await prisma.trail.findMany({ select: { id: true } })
      trailIds = allTrails.map(t => t.id)
    } else {
      trailIds = allowedTrailIds
    }

    if (trailIds.length === 0) {
      return NextResponse.json([])
    }

    // Get enrolled students for these trails
    const enrollments = await prisma.enrollment.findMany({
      where: { trailId: { in: trailIds } },
      select: {
        userId: true,
        trail: {
          select: {
            modules: { select: { id: true } },
          },
        },
      },
    })

    // Get unique student IDs
    const studentIds = [...new Set(enrollments.map(e => e.userId))]

    if (studentIds.length === 0) {
      return NextResponse.json([])
    }

    // Get module IDs from all enrolled trails
    const moduleIds = [...new Set(enrollments.flatMap(e => e.trail.modules.map(m => m.id)))]
    const totalModules = moduleIds.length

    // Get student progress
    const students = await prisma.user.findMany({
      where: {
        id: { in: studentIds },
        role: "STUDENT",
      },
      select: {
        id: true,
        name: true,
        email: true,
        totalXP: true,
        moduleProgress: {
          where: { moduleId: { in: moduleIds } },
          select: {
            status: true,
          },
        },
        submissions: {
          where: { moduleId: { in: moduleIds } },
          select: {
            status: true,
            review: {
              select: { score: true },
            },
          },
        },
      },
    })

    const studentProgress = students.map((student) => {
      const modulesCompleted = student.moduleProgress.filter(
        (p) => p.status === "COMPLETED"
      ).length

      const pendingSubmissions = student.submissions.filter(
        (s) => s.status === "PENDING"
      ).length

      // Calculate avg score from reviews
      const scores = student.submissions
        .map((s) => s.review)
        .filter((r): r is { score: number } => r !== null && r.score !== null)
        .map((r) => r.score)

      const avgScore =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        totalXP: student.totalXP,
        modulesCompleted,
        totalModules,
        avgScore,
        pendingSubmissions,
      }
    })

    // Sort by XP descending
    studentProgress.sort((a, b) => b.totalXP - a.totalXP)

    return NextResponse.json(studentProgress)
  } catch (error) {
    console.error("Error fetching student progress:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
