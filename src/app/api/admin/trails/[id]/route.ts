import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin, isAdmin, adminHasTrailAccess, isPrivileged } from "@/lib/admin-access"
import { hashTrailPassword, revokeAllPasswordAccess, guardTrailPassword } from "@/lib/trail-password"
import { canViewTrail, canEditTrail } from "@/lib/trail-policy"

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

// GET - Get single trail (with access check + password enforcement)
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // For admin/co-admin: use centralized policy (role + assignment + password)
    if (isAnyAdmin(session.user.role)) {
      const accessResult = await canViewTrail(session.user.id, session.user.role, id)

      if (!accessResult.allowed) {
        // Audit: access attempt to password-protected trail
        if (accessResult.reason === "password_required" || accessResult.reason === "password_expired") {
          await prisma.auditLog.create({
            data: {
              userId: session.user.id,
              userName: session.user.name || session.user.email || "Unknown",
              action: "ACCESS_DENIED",
              entityType: "TRAIL",
              entityId: id,
              entityName: `Password-protected trail access attempt`,
              details: JSON.stringify({ reason: accessResult.reason }),
            },
          }).catch(() => {}) // Non-blocking audit

          const errorMsg = accessResult.reason === "password_expired"
            ? "Срок верификации истёк, введите пароль снова"
            : "Для доступа к этому trail необходимо ввести пароль"

          return NextResponse.json(
            { error: errorMsg, passwordRequired: true },
            { status: 403 }
          )
        }

        return NextResponse.json({ error: "Доступ к этому trail запрещён" }, { status: 403 })
      }
    } else {
      // For TEACHER: check trail access (deny-by-default for non-ADMIN)
      const { privilegedHasTrailAccess } = await import("@/lib/admin-access")
      const hasAccess = await privilegedHasTrailAccess(session.user.id, session.user.role, id)
      if (!hasAccess) {
        return NextResponse.json({ error: "Доступ к этому trail запрещён" }, { status: 403 })
      }

      // TEACHER: password check (no role exceptions)
      const passwordGuard = await guardTrailPassword(id, session.user.id)
      if (passwordGuard.denied) {
        return NextResponse.json(
          { error: "Для доступа к этому trail необходимо ввести пароль", passwordRequired: true },
          { status: 403 }
        )
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

    // Get trail to check creator and current state for audit logging
    const existingTrail = await prisma.trail.findUnique({
      where: { id },
      select: {
        title: true,
        createdById: true,
        isPublished: true,
        isRestricted: true,
        isPasswordProtected: true,
      },
    })

    if (!existingTrail) {
      return NextResponse.json({ error: "Trail не найден" }, { status: 404 })
    }

    const isCreator = existingTrail.createdById === session.user.id
    // For legacy trails with no recorded creator, ADMIN can manage password settings
    const canManagePassword = isCreator || (isAdmin(session.user.role) && !existingTrail.createdById)

    // Check access: role + assignment + password (centralized policy)
    const editAccess = await canEditTrail(session.user.id, session.user.role, id)
    if (!editAccess.allowed) {
      // Audit: edit attempt on password-protected trail
      if (editAccess.reason === "password_required" || editAccess.reason === "password_expired") {
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            userName: session.user.name || session.user.email || "Unknown",
            action: "EDIT_DENIED",
            entityType: "TRAIL",
            entityId: id,
            entityName: existingTrail.title,
            details: JSON.stringify({ reason: editAccess.reason }),
          },
        }).catch(() => {}) // Non-blocking audit

        const errorMsg = editAccess.reason === "password_expired"
          ? "Срок верификации истёк, введите пароль снова"
          : "Для редактирования этого trail необходимо ввести пароль"

        return NextResponse.json(
          { error: errorMsg, passwordRequired: true },
          { status: 403 }
        )
      }

      return NextResponse.json({ error: "Доступ к этому trail запрещён" }, { status: 403 })
    }

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

    // RBAC: Only creator (or ADMIN on legacy trails without creator) can change password settings
    const wantsPasswordChange = password !== undefined || isPasswordProtected !== undefined || removePassword
    if (wantsPasswordChange && !canManagePassword) {
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

    // Handle password changes (creator or ADMIN on legacy trails without creator)
    if (canManagePassword) {
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

    // Audit: edit after password verification (non-creator editing password-protected trail)
    if (existingTrail.isPasswordProtected && !isCreator) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name || session.user.email || "Unknown",
          action: "EDIT_AFTER_VERIFY",
          entityType: "TRAIL",
          entityId: id,
          entityName: existingTrail.title,
          details: JSON.stringify({ editedFields: Object.keys(data) }),
        },
      }).catch(() => {}) // Non-blocking audit
    }

    // Audit logging for access-related status changes
    const auditChanges: string[] = []
    if (data.isPublished !== undefined && data.isPublished !== existingTrail.isPublished) {
      auditChanges.push(data.isPublished ? "published" : "unpublished")
    }
    if (data.isRestricted !== undefined && data.isRestricted !== existingTrail.isRestricted) {
      auditChanges.push(data.isRestricted ? "restricted" : "made_public")
    }
    if (removePassword) {
      auditChanges.push("password_removed")
    } else if (isPasswordProtected !== undefined && isPasswordProtected !== existingTrail.isPasswordProtected) {
      auditChanges.push(isPasswordProtected ? "password_enabled" : "password_disabled")
    } else if (password) {
      auditChanges.push("password_changed")
    }

    if (auditChanges.length > 0) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name || session.user.email || "Unknown",
          action: "UPDATE",
          entityType: "TRAIL",
          entityId: id,
          entityName: existingTrail.title,
          details: JSON.stringify({ statusChanges: auditChanges }),
        },
      })
    }

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

    // Password check for deletion (no role exceptions — only creator bypasses)
    const passwordGuard = await guardTrailPassword(id, session.user.id)
    if (passwordGuard.denied) {
      return NextResponse.json(
        { error: "Для удаления этого trail необходимо ввести пароль", passwordRequired: true },
        { status: 403 }
      )
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
