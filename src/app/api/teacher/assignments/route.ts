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

    // ADMIN sees all trails, TEACHER sees only assigned trails
    if (session.user.role === "ADMIN") {
      const allTrails = await prisma.trail.findMany({
        select: { id: true },
      })
      return NextResponse.json(allTrails.map((t: { id: string }) => ({ trailId: t.id })))
    }

    const assignments = await prisma.trailTeacher.findMany({
      where: { teacherId: session.user.id },
      select: { trailId: true },
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Error fetching teacher assignments:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}
