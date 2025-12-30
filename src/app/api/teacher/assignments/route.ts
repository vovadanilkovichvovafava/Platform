import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Get current teacher's trail assignments
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
