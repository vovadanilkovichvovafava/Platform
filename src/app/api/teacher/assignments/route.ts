import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Get current teacher's trail assignments
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    // Allow both TEACHER and ADMIN roles
    if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ADMIN sees all trails
    if (session.user.role === "ADMIN") {
      const allTrails = await prisma.trail.findMany({
        select: { id: true },
      })
      return NextResponse.json(allTrails.map(t => ({ trailId: t.id })))
    }

    // For TEACHER role:
    // 1. Get trails with teacherVisibility = "ALL_TEACHERS"
    // 2. Get trails where teacher is specifically assigned (teacherVisibility = "SPECIFIC")

    // Get all trails visible to all teachers
    const allTeacherTrails = await prisma.trail.findMany({
      where: { teacherVisibility: "ALL_TEACHERS" },
      select: { id: true },
    })

    // Get specifically assigned trails
    const specificAssignments = await prisma.trailTeacher.findMany({
      where: { teacherId: session.user.id },
      select: { trailId: true },
    })

    // Combine both lists (removing duplicates)
    const allTrailIds = new Set([
      ...allTeacherTrails.map(t => t.id),
      ...specificAssignments.map(a => a.trailId),
    ])

    return NextResponse.json(Array.from(allTrailIds).map(id => ({ trailId: id })))
  } catch (error) {
    console.error("Error fetching teacher assignments:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}
