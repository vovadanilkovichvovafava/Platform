import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAnyAdmin } from "@/lib/admin-access"

// GET - List student access entries (optionally filtered by trailId or studentId)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !isAnyAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const trailId = searchParams.get("trailId")
  const studentId = searchParams.get("studentId")

  const where: { trailId?: string; studentId?: string } = {}
  if (trailId) where.trailId = trailId
  if (studentId) where.studentId = studentId

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

  await prisma.studentTrailAccess.delete({
    where: {
      studentId_trailId: { studentId, trailId },
    },
  })

  return NextResponse.json({ success: true })
}

// PATCH - Toggle trail restriction status
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

  const trail = await prisma.trail.update({
    where: { id: trailId },
    data: { isRestricted },
  })

  return NextResponse.json(trail)
}
