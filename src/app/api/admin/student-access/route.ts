import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAnyAdmin, isAdmin, getAdminAllowedTrailIds } from "@/lib/admin-access"

// GET - List student access entries (optionally filtered by trailId or studentId)
// CO_ADMIN sees only entries for their assigned trails
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !isAnyAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const trailId = searchParams.get("trailId")
  const studentId = searchParams.get("studentId")

  // Build where clause
  const where: { trailId?: string | { in: string[] }; studentId?: string } = {}
  if (studentId) where.studentId = studentId

  // CO_ADMIN: filter by allowed trails
  if (!isAdmin(session.user.role)) {
    const allowedTrailIds = await getAdminAllowedTrailIds(
      session.user.id,
      session.user.role
    )

    if (allowedTrailIds !== null) {
      // If specific trailId requested, verify access
      if (trailId) {
        if (!allowedTrailIds.includes(trailId)) {
          return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
        }
        where.trailId = trailId
      } else {
        // No specific trail - filter by allowed trails
        where.trailId = { in: allowedTrailIds }
      }
    }
  } else if (trailId) {
    // ADMIN with specific trailId filter
    where.trailId = trailId
  }

  const access = await prisma.studentTrailAccess.findMany({
    where,
    include: {
      student: {
        select: { id: true, name: true, email: true },
      },
      trail: {
        select: { id: true, title: true, slug: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(access)
}

// POST - Grant student access to a trail
// CO_ADMIN can only grant access to their assigned trails
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !isAnyAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { studentId, trailId } = await request.json()

  if (!studentId || !trailId) {
    return NextResponse.json(
      { error: "studentId and trailId are required" },
      { status: 400 }
    )
  }

  // CO_ADMIN: verify access to this trail
  if (!isAdmin(session.user.role)) {
    const allowedTrailIds = await getAdminAllowedTrailIds(
      session.user.id,
      session.user.role
    )

    if (allowedTrailIds !== null && !allowedTrailIds.includes(trailId)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }
  }

  // Check if already exists
  const existing = await prisma.studentTrailAccess.findUnique({
    where: {
      studentId_trailId: { studentId, trailId },
    },
  })

  if (existing) {
    return NextResponse.json(
      { error: "Доступ уже выдан" },
      { status: 400 }
    )
  }

  const access = await prisma.studentTrailAccess.create({
    data: { studentId, trailId },
    include: {
      student: {
        select: { id: true, name: true, email: true },
      },
      trail: {
        select: { id: true, title: true, slug: true },
      },
    },
  })

  return NextResponse.json(access)
}

// DELETE - Remove student access
// CO_ADMIN can only remove access for their assigned trails
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !isAnyAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get("studentId")
  const trailId = searchParams.get("trailId")

  if (!studentId || !trailId) {
    return NextResponse.json(
      { error: "studentId and trailId are required" },
      { status: 400 }
    )
  }

  // CO_ADMIN: verify access to this trail
  if (!isAdmin(session.user.role)) {
    const allowedTrailIds = await getAdminAllowedTrailIds(
      session.user.id,
      session.user.role
    )

    if (allowedTrailIds !== null && !allowedTrailIds.includes(trailId)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }
  }

  await prisma.studentTrailAccess.delete({
    where: {
      studentId_trailId: { studentId, trailId },
    },
  })

  return NextResponse.json({ success: true })
}

// PATCH - Toggle trail restriction status
// CO_ADMIN can only modify restriction for their assigned trails
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !isAnyAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { trailId, isRestricted } = await request.json()

  if (!trailId || typeof isRestricted !== "boolean") {
    return NextResponse.json(
      { error: "trailId and isRestricted are required" },
      { status: 400 }
    )
  }

  // CO_ADMIN: verify access to this trail
  if (!isAdmin(session.user.role)) {
    const allowedTrailIds = await getAdminAllowedTrailIds(
      session.user.id,
      session.user.role
    )

    if (allowedTrailIds !== null && !allowedTrailIds.includes(trailId)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }
  }

  const trail = await prisma.trail.update({
    where: { id: trailId },
    data: { isRestricted },
  })

  return NextResponse.json(trail)
}
