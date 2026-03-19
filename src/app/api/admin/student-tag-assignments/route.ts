import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrivileged, isHR } from "@/lib/admin-access"

// GET - List tag assignments (optionally filtered by studentId)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || (!isPrivileged(session.user.role) && !isHR(session.user.role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get("studentId")

  const where: { studentId?: string } = {}
  if (studentId) where.studentId = studentId

  const assignments = await prisma.studentTagAssignment.findMany({
    where,
    select: {
      id: true,
      studentId: true,
      tagId: true,
      tag: {
        select: { id: true, name: true, color: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(assignments)
}

// POST - Assign tag to student
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || (!isPrivileged(session.user.role) && !isHR(session.user.role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { studentId, tagId } = await request.json()

  if (!studentId || !tagId) {
    return NextResponse.json(
      { error: "studentId and tagId are required" },
      { status: 400 }
    )
  }

  // Check if already assigned
  const existing = await prisma.studentTagAssignment.findUnique({
    where: { studentId_tagId: { studentId, tagId } },
  })

  if (existing) {
    return NextResponse.json(
      { error: "Тег уже назначен" },
      { status: 400 }
    )
  }

  const assignment = await prisma.studentTagAssignment.create({
    data: {
      studentId,
      tagId,
      assignedBy: session.user.id,
    },
    select: {
      id: true,
      studentId: true,
      tagId: true,
      tag: {
        select: { id: true, name: true, color: true },
      },
    },
  })

  return NextResponse.json(assignment)
}

// DELETE - Remove tag from student
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || (!isPrivileged(session.user.role) && !isHR(session.user.role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get("studentId")
  const tagId = searchParams.get("tagId")

  if (!studentId || !tagId) {
    return NextResponse.json(
      { error: "studentId and tagId are required" },
      { status: 400 }
    )
  }

  await prisma.studentTagAssignment.delete({
    where: { studentId_tagId: { studentId, tagId } },
  })

  return NextResponse.json({ success: true })
}
