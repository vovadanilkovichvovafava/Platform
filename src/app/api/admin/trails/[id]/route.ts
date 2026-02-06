import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin, isAdmin, adminHasTrailAccess, isPrivileged } from "@/lib/admin-access"
import { hashTrailPassword, revokeAllPasswordAccess } from "@/lib/trail-password"

const trailUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  duration: z.string().optional(),
  isPublished: z.boolean().optional(),
  isRestricted: z.boolean().optional(), // true = hidden/assigned, false = public to all students
  teacherVisibility: z.enum(["ADMIN_ONLY", "ALL_TEACHERS", "SPECIFIC"]).optional(),
  assignedTeacherId: z.string().nullable().optional(), // For SPECIFIC visibility
  // Password protection fields
  isPasswordProtected: z.boolean().optional(),
  password: z.string().optional(), // New password (will be hashed)
  passwordHint: z.string().nullable().optional(),
  removePassword: z.boolean().optional(), // Flag to remove password protection
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

    // Check trail access (deny-by-default for non-ADMIN)
    if (!isAdmin(session.user.role)) {
      const { privilegedHasTrailAccess } = await import("@/lib/admin-access")
      const hasAccess = await privilegedHasTrailAccess(session.user.id, session.user.role, id)
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

// PATCH - Update trail (ADMIN and CO_ADMIN only, TEACHER cannot edit)
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Get trail to check creator
    const existingTrail = await prisma.trail.findUnique({
      where: { id },
      select: { createdById: true, isPasswordProtected: true },
    })

    if (!existingTrail) {
      return NextResponse.json({ error: "Trail не найден" }, { status: 404 })
    }

    const isCreator = existingTrail.createdById === session.user.id

    // Check access based on role
    if (session.user.role === "CO_ADMIN") {
      // CO_ADMIN - check AdminTrailAccess
      const hasAccess = await adminHasTrailAccess(session.user.id, session.user.role, id)
      if (!hasAccess) {
        return NextResponse.json({ error: "Доступ к этому trail запрещён" }, { status: 403 })
      }
    }
    // ADMIN has access to all

    const body = await request.json()
    const data = trailUpdateSchema.parse(body)

    // Extract special fields
    const {
      assignedTeacherId,
      teacherVisibility,
      password,
      isPasswordProtected,
      passwordHint,
      removePassword,
      ...trailData
    } = data

    // RBAC: Only ADMIN can change teacherVisibility
    if (!isAdmin(session.user.role) && teacherVisibility !== undefined) {
      return NextResponse.json(
        { error: "Только админ может изменять видимость для учителей" },
        { status: 403 }
      )
    }

    // RBAC: Only creator can change password settings
    const wantsPasswordChange = password !== undefined || isPasswordProtected !== undefined || removePassword
    if (wantsPasswordChange && !isCreator) {
      return NextResponse.json(
        { error: "Только создатель трейла может изменять настройки пароля" },
        { status: 403 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = { ...trailData }

    // Include teacherVisibility only for ADMIN
    if (isAdmin(session.user.role) && teacherVisibility !== undefined) {
      updateData.teacherVisibility = teacherVisibility
    }

    // Handle password changes (only for creator)
    if (isCreator) {
      if (removePassword) {
        // Remove password protection
        updateData.isPasswordProtected = false
        updateData.passwordHash = null
        updateData.passwordHint = null
        // Revoke all password access (they can re-enter password if protection is re-enabled)
        await revokeAllPasswordAccess(id)
      } else if (isPasswordProtected !== undefined) {
        updateData.isPasswordProtected = isPasswordProtected

        if (isPasswordProtected) {
          // If enabling protection with new password
          if (password) {
            updateData.passwordHash = await hashTrailPassword(password)
            // Revoke existing access since password changed
            await revokeAllPasswordAccess(id)
          } else if (!existingTrail.isPasswordProtected) {
            // Enabling protection without providing password
            return NextResponse.json(
              { error: "Пароль обязателен для включения защиты" },
              { status: 400 }
            )
          }

          // Update hint
          if (passwordHint !== undefined) {
            updateData.passwordHint = passwordHint
          }
        } else {
          // Disabling protection
          updateData.passwordHash = null
          updateData.passwordHint = null
        }
      } else if (password) {
        // Just changing password (not toggling protection)
        updateData.passwordHash = await hashTrailPassword(password)
        // Revoke existing access since password changed
        await revokeAllPasswordAccess(id)

        if (passwordHint !== undefined) {
          updateData.passwordHint = passwordHint
        }
      } else if (passwordHint !== undefined) {
        // Just updating hint
        updateData.passwordHint = passwordHint
      }
    }

    const trail = await prisma.trail.update({
      where: { id },
      data: updateData,
    })

    // Handle teacher assignment for SPECIFIC visibility (ADMIN only)
    if (isAdmin(session.user.role) && teacherVisibility === "SPECIFIC") {
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
    } else if (isAdmin(session.user.role) && teacherVisibility && teacherVisibility !== "SPECIFIC") {
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

// DELETE - Delete trail (ADMIN and CO_ADMIN only, TEACHER cannot delete)
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Check access based on role
    if (session.user.role === "CO_ADMIN") {
      // CO_ADMIN - check AdminTrailAccess
      const hasAccess = await adminHasTrailAccess(session.user.id, session.user.role, id)
      if (!hasAccess) {
        return NextResponse.json({ error: "Доступ к этому trail запрещён" }, { status: 403 })
      }
    }
    // ADMIN has access to all

    await prisma.trail.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting trail:", error)
    return NextResponse.json({ error: "Ошибка при удалении trail" }, { status: 500 })
  }
}
