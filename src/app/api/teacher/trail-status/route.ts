import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrivileged, privilegedHasTrailAccess } from "@/lib/admin-access"

const VALID_TRAIL_STATUSES = ["NOT_ADMITTED", "LEARNING", "ACCEPTED"] as const
type TrailStatus = (typeof VALID_TRAIL_STATUSES)[number]

function isValidTrailStatus(value: unknown): value is TrailStatus {
  return typeof value === "string" && VALID_TRAIL_STATUSES.includes(value as TrailStatus)
}

// PATCH - Update trail status for a student enrollment
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { studentId, trailId, status } = body

    if (!studentId || !trailId || !status) {
      return NextResponse.json(
        { error: "Missing studentId, trailId, or status" },
        { status: 400 }
      )
    }

    if (!isValidTrailStatus(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: NOT_ADMITTED, LEARNING, ACCEPTED" },
        { status: 400 }
      )
    }

    // Check if user has access to this trail
    const canAccess = await privilegedHasTrailAccess(
      session.user.id,
      session.user.role,
      trailId
    )
    if (!canAccess) {
      return NextResponse.json(
        { error: "Нет доступа к этому направлению" },
        { status: 403 }
      )
    }

    // Check enrollment exists
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_trailId: { userId: studentId, trailId },
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: "Студент не записан на это направление" },
        { status: 404 }
      )
    }

    // Update the trail status
    const updated = await prisma.enrollment.update({
      where: {
        userId_trailId: { userId: studentId, trailId },
      },
      data: { trailStatus: status },
      select: {
        id: true,
        trailStatus: true,
        userId: true,
        trailId: true,
      },
    })

    return NextResponse.json({ success: true, enrollment: updated })
  } catch (error) {
    console.error("Trail status update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
