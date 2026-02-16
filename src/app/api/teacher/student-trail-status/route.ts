import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrivileged, isAdmin, getTeacherAllowedTrailIds, adminHasTrailAccess } from "@/lib/admin-access"

/**
 * Check if the current user has access to manage the given trail
 */
async function hasTrailAccess(
  userId: string,
  role: string,
  trailId: string
): Promise<boolean> {
  if (isAdmin(role)) return true
  if (role === "CO_ADMIN") return await adminHasTrailAccess(userId, role, trailId)
  const teacherTrailIds = await getTeacherAllowedTrailIds(userId)
  return teacherTrailIds.includes(trailId)
}

// PUT - Set student trail status (NOT_ADMITTED, LEARNING, ACCEPTED)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { studentId, trailId, status } = await request.json()

    if (!studentId || !trailId || !status) {
      return NextResponse.json({ error: "Missing studentId, trailId, or status" }, { status: 400 })
    }

    // Validate status value
    const validStatuses = ["NOT_ADMITTED", "LEARNING", "ACCEPTED"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status. Must be NOT_ADMITTED, LEARNING, or ACCEPTED" }, { status: 400 })
    }

    // Check trail access
    const canAccess = await hasTrailAccess(session.user.id, session.user.role, trailId)
    if (!canAccess) {
      return NextResponse.json({ error: "Нет доступа к этому trail" }, { status: 403 })
    }

    // Check student exists
    const student = await prisma.user.findUnique({
      where: { id: studentId, role: "STUDENT" },
      select: { id: true },
    })
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Check enrollment exists
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_trailId: { userId: studentId, trailId } },
      select: { id: true },
    })
    if (!enrollment) {
      return NextResponse.json({ error: "Student is not enrolled in this trail" }, { status: 400 })
    }

    // Upsert student trail status
    const result = await prisma.studentTrailStatus.upsert({
      where: {
        studentId_trailId: { studentId, trailId },
      },
      update: {
        status,
        setBy: session.user.id,
      },
      create: {
        studentId,
        trailId,
        status,
        setBy: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      status: result.status,
    })
  } catch (error) {
    console.error("Set student trail status error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET - Get student trail status(es)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const trailId = searchParams.get("trailId")

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 })
    }

    // If trailId is specified, return single status
    if (trailId) {
      const status = await prisma.studentTrailStatus.findUnique({
        where: { studentId_trailId: { studentId, trailId } },
        select: { status: true, updatedAt: true },
      })
      return NextResponse.json({
        status: status?.status || "LEARNING",
        updatedAt: status?.updatedAt?.toISOString() || null,
      })
    }

    // Return all statuses for this student
    const statuses = await prisma.studentTrailStatus.findMany({
      where: { studentId },
      select: {
        trailId: true,
        status: true,
        updatedAt: true,
      },
    })

    const statusMap: Record<string, string> = {}
    for (const s of statuses) {
      statusMap[s.trailId] = s.status
    }

    return NextResponse.json({ statuses: statusMap })
  } catch (error) {
    console.error("Get student trail status error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
