import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const trailUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  duration: z.string().optional(),
  isPublished: z.boolean().optional(),
  teacherVisibility: z.enum(["ADMIN_ONLY", "ALL_TEACHERS", "SPECIFIC"]).optional(),
  assignedTeacherId: z.string().nullable().optional(), // For SPECIFIC visibility
})

interface Props {
  params: Promise<{ id: string }>
}

// GET - Get single trail
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const trail = await prisma.trail.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
        teachers: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!trail) {
      return NextResponse.json({ error: "Trail не найден" }, { status: 404 })
    }

    return NextResponse.json(trail)
  } catch (error) {
    console.error("Error fetching trail:", error)
    return NextResponse.json({ error: "Ошибка при получении trail" }, { status: 500 })
  }
}

// Helper to check if teacher is assigned to trail
async function isTeacherAssignedToTrail(teacherId: string, trailId: string): Promise<boolean> {
  const assignment = await prisma.trailTeacher.findUnique({
    where: {
      trailId_teacherId: { trailId, teacherId },
    },
  })
  return !!assignment
}

// PATCH - Update trail (Admin: any, Teacher: only assigned)
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Teachers can only update trails they are assigned to
    if (session.user.role === "TEACHER") {
      const isAssigned = await isTeacherAssignedToTrail(session.user.id, id)
      if (!isAssigned) {
        return NextResponse.json({ error: "Вы не назначены на этот trail" }, { status: 403 })
      }
    }

    const body = await request.json()
    const data = trailUpdateSchema.parse(body)

    // Extract teacher assignment data
    const { assignedTeacherId, teacherVisibility, ...trailData } = data

    // RBAC: Teachers cannot change teacherVisibility
    if (session.user.role === "TEACHER" && teacherVisibility !== undefined) {
      return NextResponse.json(
        { error: "Учителям запрещено изменять видимость для учителей" },
        { status: 403 }
      )
    }

    // Update trail (include teacherVisibility only for admins)
    const updateData = session.user.role === "ADMIN"
      ? { ...trailData, ...(teacherVisibility !== undefined && { teacherVisibility }) }
      : trailData

    const trail = await prisma.trail.update({
      where: { id },
      data: updateData,
    })

    // Handle teacher assignment for SPECIFIC visibility (Admin only)
    if (session.user.role === "ADMIN" && teacherVisibility === "SPECIFIC") {
      // Clear existing assignments for this trail
      await prisma.trailTeacher.deleteMany({
        where: { trailId: id },
      })

      // Add new assignment if teacher specified
      if (assignedTeacherId) {
        // Verify teacher exists and has TEACHER role
        const teacher = await prisma.user.findUnique({
          where: { id: assignedTeacherId },
        })

        if (teacher && teacher.role === "TEACHER") {
          await prisma.trailTeacher.create({
            data: {
              trailId: id,
              teacherId: assignedTeacherId,
            },
          })
        }
      }
    } else if (session.user.role === "ADMIN" && teacherVisibility && teacherVisibility !== "SPECIFIC") {
      // Clear assignments when switching away from SPECIFIC
      await prisma.trailTeacher.deleteMany({
        where: { trailId: id },
      })
    }

    return NextResponse.json(trail)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error updating trail:", error)
    return NextResponse.json({ error: "Ошибка при обновлении trail" }, { status: 500 })
  }
}

// DELETE - Delete trail (Admin: any, Teacher: only assigned)
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Teachers can only delete trails they are assigned to
    if (session.user.role === "TEACHER") {
      const isAssigned = await isTeacherAssignedToTrail(session.user.id, id)
      if (!isAssigned) {
        return NextResponse.json({ error: "Вы не назначены на этот trail" }, { status: 403 })
      }
    }

    await prisma.trail.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting trail:", error)
    return NextResponse.json({ error: "Ошибка при удалении trail" }, { status: 500 })
  }
}
