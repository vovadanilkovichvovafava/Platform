import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAnyAdminOrHR } from "@/lib/admin-access"

const VALID_COLORS = ["gray", "blue", "green", "red", "purple", "amber", "pink"]

// GET - List all student tags
export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || !isAnyAdminOrHR(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tags = await prisma.studentTag.findMany({
    select: {
      id: true,
      name: true,
      color: true,
      _count: {
        select: { assignments: true },
      },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(tags)
}

// POST - Create a new tag
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !isAnyAdminOrHR(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, color } = await request.json()

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Название тега обязательно" },
      { status: 400 }
    )
  }

  const trimmedName = name.trim()
  const safeColor = VALID_COLORS.includes(color) ? color : "gray"

  // Check uniqueness
  const existing = await prisma.studentTag.findUnique({
    where: { name: trimmedName },
  })

  if (existing) {
    return NextResponse.json(
      { error: "Тег с таким названием уже существует", tag: { id: existing.id, name: existing.name, color: existing.color } },
      { status: 400 }
    )
  }

  const tag = await prisma.studentTag.create({
    data: { name: trimmedName, color: safeColor },
    select: { id: true, name: true, color: true },
  })

  return NextResponse.json(tag)
}

// DELETE - Delete a tag by id
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !isAnyAdminOrHR(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 }
    )
  }

  await prisma.studentTag.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
