import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isPrivileged, getPrivilegedAllowedTrailIds } from "@/lib/admin-access"

// GET - Get current user's trail assignments (TEACHER, CO_ADMIN, ADMIN)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    // Allow TEACHER, CO_ADMIN, and ADMIN roles
    if (!session?.user?.id || !isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const allowedTrailIds = await getPrivilegedAllowedTrailIds(session.user.id, session.user.role)

    if (allowedTrailIds === null) {
      // ADMIN - return all trail IDs
      const { prisma } = await import("@/lib/prisma")
      const allTrails = await prisma.trail.findMany({
        select: { id: true },
      })
      return NextResponse.json(allTrails.map(t => ({ trailId: t.id })))
    }

    return NextResponse.json(allowedTrailIds.map(id => ({ trailId: id })))
  } catch (error) {
    console.error("Error fetching teacher assignments:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}
