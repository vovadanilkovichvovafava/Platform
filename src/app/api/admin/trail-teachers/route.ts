import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin } from "@/lib/admin-access"

const assignSchema = z.object({
  trailId: z.string(),
  teacherId: z.string(),
})

// GET - List all trail-teacher assignments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const trailId = searchParams.get("trailId")

    const where = trailId ? { trailId } : {}

    const assignments = await prisma.trailTeacher.findMany({
      where,
      include: {
        trail: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Error fetching trail teachers:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

// POST - Assign teacher to trail
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { trailId, teacherId } = assignSchema.parse(body)

    // Verify teacher exists and has TEACHER role
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
    })

    if (!teacher || teacher.role !== "TEACHER") {
      return NextResponse.json({ error: "Invalid teacher" }, { status: 400 })
    }

    // Check if assignment already exists
    const existing = await prisma.trailTeacher.findUnique({
      where: {
        trailId_teacherId: { trailId, teacherId },
      },
    })

    if (existing) {
      return NextResponse.json({ error: "Already assigned" }, { status: 400 })
    }

    const assignment = await prisma.trailTeacher.create({
      data: { trailId, teacherId },
      include: {
        trail: {
          select: { title: true },
        },
        teacher: {
          select: { name: true, email: true },
        },
      },
    })

    return NextResponse.json(assignment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error assigning teacher:", error)
    return NextResponse.json({ error: "Failed to assign" }, { status: 500 })
  }
}

// DELETE - Remove teacher from trail
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const trailId = searchParams.get("trailId")
    const teacherId = searchParams.get("teacherId")

    if (!trailId || !teacherId) {
      return NextResponse.json({ error: "Missing trailId or teacherId" }, { status: 400 })
    }

    await prisma.trailTeacher.delete({
      where: {
        trailId_teacherId: { trailId, teacherId },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing teacher:", error)
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 })
  }
}
