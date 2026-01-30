import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin, isSuperAdmin, adminHasTrailAccess, isPrivileged } from "@/lib/admin-access"

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

// GET - Get single trail (with access check)
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Check admin access to this specific trail (deny-by-default)
    if (isAnyAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      const hasAccess = await adminHasTrailAccess(session.user.id, session.user.role, id)
      if (!hasAccess) {
        return NextResponse.json({ error: "Доступ к этому trail запрещён" }, { status: 403 })
      }
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

// PATCH - Update trail (with access check)
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Check access based on role
    if (session.user.role === "TEACHER") {
      // Teachers can only update trails they are assigned to
      const isAssigned = await isTeacherAssignedToTrail(session.user.id, id)
      if (!isAssigned) {
        return NextResponse.json({ error: "Вы не назначены на этот trail" }, { status: 403 })
      }
    } else if (session.user.role === "ADMIN") {
      // Regular ADMIN - check AdminTrailAccess
      const hasAccess = await adminHasTrailAccess(session.user.id, session.user.role, id)
      if (!hasAccess) {
        return NextResponse.json({ error: "Доступ к этому trail запрещён" }, { status: 403 })
      }
    }
    // SUPER_ADMIN has access to all

    const body = await request.json()
    const data = trailUpdateSchema.parse(body)

    // Extract teacher assignment data
    const { assignedTeacherId, teacherVisibility, ...trailData } = data

    // RBAC: Only SUPER_ADMIN can change teacherVisibility
    if (!isSuperAdmin(session.user.role) && teacherVisibility !== undefined) {
      return NextResponse.json(
        { error: "Только суперадмин может изменять видимость для учителей" },
        { status: 403 }
      )
    }

    // Update trail (include teacherVisibility only for SUPER_ADMIN)
    const updateData = isSuperAdmin(session.user.role)
      ? { ...trailData, ...(teacherVisibility !== undefined && { teacherVisibility }) }
      : trailData

    const trail = await prisma.trail.update({
      where: { id },
      data: updateData,
    })

    // Handle teacher assignment for SPECIFIC visibility (SUPER_ADMIN only)
    if (isSuperAdmin(session.user.role) && teacherVisibility === "SPECIFIC") {
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
    } else if (isSuperAdmin(session.user.role) && teacherVisibility && teacherVisibility !== "SPECIFIC") {
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

// DELETE - Delete trail (with access check)
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Check access based on role
    if (session.user.role === "TEACHER") {
      // Teachers can only delete trails they are assigned to
      const isAssigned = await isTeacherAssignedToTrail(session.user.id, id)
      if (!isAssigned) {
        return NextResponse.json({ error: "Вы не назначены на этот trail" }, { status: 403 })
      }
    } else if (session.user.role === "ADMIN") {
      // Regular ADMIN - check AdminTrailAccess
      const hasAccess = await adminHasTrailAccess(session.user.id, session.user.role, id)
      if (!hasAccess) {
        return NextResponse.json({ error: "Доступ к этому trail запрещён" }, { status: 403 })
      }
    }
    // SUPER_ADMIN has access to all

    await prisma.trail.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting trail:", error)
    return NextResponse.json({ error: "Ошибка при удалении trail" }, { status: 500 })
  }
}
