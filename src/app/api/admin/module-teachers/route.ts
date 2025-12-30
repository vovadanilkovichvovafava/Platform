import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const assignSchema = z.object({
  moduleId: z.string(),
  teacherId: z.string(),
})

// GET - List all module-teacher assignments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get("moduleId")

    const where = moduleId ? { moduleId } : {}

    const assignments = await prisma.moduleTeacher.findMany({
      where,
      include: {
        module: {
          select: {
            id: true,
            title: true,
            slug: true,
            trail: {
              select: { title: true },
            },
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
    console.error("Error fetching module teachers:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

// POST - Assign teacher to module
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { moduleId, teacherId } = assignSchema.parse(body)

    // Verify teacher exists and has TEACHER role
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
    })

    if (!teacher || teacher.role !== "TEACHER") {
      return NextResponse.json({ error: "Invalid teacher" }, { status: 400 })
    }

    // Check if assignment already exists
    const existing = await prisma.moduleTeacher.findUnique({
      where: {
        moduleId_teacherId: { moduleId, teacherId },
      },
    })

    if (existing) {
      return NextResponse.json({ error: "Already assigned" }, { status: 400 })
    }

    const assignment = await prisma.moduleTeacher.create({
      data: { moduleId, teacherId },
      include: {
        module: {
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

// DELETE - Remove teacher from module
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get("moduleId")
    const teacherId = searchParams.get("teacherId")

    if (!moduleId || !teacherId) {
      return NextResponse.json({ error: "Missing moduleId or teacherId" }, { status: 400 })
    }

    await prisma.moduleTeacher.delete({
      where: {
        moduleId_teacherId: { moduleId, teacherId },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing teacher:", error)
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 })
  }
}
