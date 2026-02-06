import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin, isAdmin, adminHasTrailAccess, isPrivileged } from "@/lib/admin-access"
import { guardTrailPassword } from "@/lib/trail-password"

const moduleUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  requirements: z.string().optional(),
  type: z.enum(["THEORY", "PRACTICE", "PROJECT"]).optional(),
  level: z.enum(["Beginner", "Intermediate", "Junior", "Middle", "Senior"]).optional(),
  points: z.number().min(0, "Баллы не могут быть отрицательными").optional(),
  duration: z.string().optional(),
  requiresSubmission: z.boolean().optional(),
})

interface Props {
  params: Promise<{ id: string }>
}

// GET - Get single module with questions (with access check)
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const courseModule = await prisma.module.findUnique({
      where: { id },
      include: {
        trail: {
          include: {
            modules: {
              orderBy: { order: "asc" },
              select: { id: true, title: true, slug: true, order: true },
            },
          },
        },
        questions: {
          orderBy: { order: "asc" },
        },
      },
    })

    if (!courseModule) {
      return NextResponse.json({ error: "Модуль не найден" }, { status: 404 })
    }

    // Check trail access (deny-by-default for non-ADMIN)
    if (!isAdmin(session.user.role)) {
      const { privilegedHasTrailAccess } = await import("@/lib/admin-access")
      const hasAccess = await privilegedHasTrailAccess(session.user.id, session.user.role, courseModule.trail.id)
      if (!hasAccess) {
        return NextResponse.json({ error: "Доступ к этому модулю запрещён" }, { status: 403 })
      }
    }

    // Password check — no role exceptions, only creator bypasses
    const passwordGuard = await guardTrailPassword(courseModule.trail.id, session.user.id)
    if (passwordGuard.denied) {
      return NextResponse.json(
        { error: "Для доступа к модулям этого trail необходимо ввести пароль", passwordRequired: true },
        { status: 403 }
      )
    }

    // Find adjacent modules for navigation
    const trailModules = courseModule.trail.modules
    const currentIndex = trailModules.findIndex((m) => m.id === id)
    const prevModule = currentIndex > 0 ? trailModules[currentIndex - 1] : null
    const nextModule = currentIndex < trailModules.length - 1 ? trailModules[currentIndex + 1] : null

    return NextResponse.json({
      ...courseModule,
      prevModule,
      nextModule,
    })
  } catch (error) {
    console.error("Error fetching module:", error)
    return NextResponse.json({ error: "Ошибка при получении модуля" }, { status: 500 })
  }
}

// PATCH - Update module (ADMIN and CO_ADMIN only, TEACHER cannot edit)
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Get module to check trail
    const existingModule = await prisma.module.findUnique({
      where: { id },
      select: { trailId: true },
    })

    if (!existingModule) {
      return NextResponse.json({ error: "Модуль не найден" }, { status: 404 })
    }

    // Check access based on role
    if (session.user.role === "CO_ADMIN") {
      // CO_ADMIN - check AdminTrailAccess
      const hasAccess = await adminHasTrailAccess(session.user.id, session.user.role, existingModule.trailId)
      if (!hasAccess) {
        return NextResponse.json({ error: "Доступ к этому trail запрещён" }, { status: 403 })
      }
    }
    // ADMIN has access to all

    // Password check — no role exceptions, only creator bypasses
    const passwordGuard = await guardTrailPassword(existingModule.trailId, session.user.id)
    if (passwordGuard.denied) {
      return NextResponse.json(
        { error: "Для редактирования модулей этого trail необходимо ввести пароль", passwordRequired: true },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = moduleUpdateSchema.parse(body)

    const updatedModule = await prisma.module.update({
      where: { id },
      data,
    })

    return NextResponse.json(updatedModule)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error updating module:", error)
    return NextResponse.json({ error: "Ошибка при обновлении модуля" }, { status: 500 })
  }
}

// DELETE - Delete module (ADMIN and CO_ADMIN only, TEACHER cannot delete)
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Get module to check trail
    const existingModule = await prisma.module.findUnique({
      where: { id },
      select: { trailId: true, title: true },
    })

    if (!existingModule) {
      return NextResponse.json({ error: "Модуль не найден" }, { status: 404 })
    }

    // Check access based on role
    if (session.user.role === "CO_ADMIN") {
      // CO_ADMIN - check AdminTrailAccess
      const hasAccess = await adminHasTrailAccess(session.user.id, session.user.role, existingModule.trailId)
      if (!hasAccess) {
        return NextResponse.json({ error: "Доступ к этому trail запрещён" }, { status: 403 })
      }
    }
    // ADMIN has access to all

    // Password check — no role exceptions, only creator bypasses
    const deletePasswordGuard = await guardTrailPassword(existingModule.trailId, session.user.id)
    if (deletePasswordGuard.denied) {
      return NextResponse.json(
        { error: "Для удаления модулей этого trail необходимо ввести пароль", passwordRequired: true },
        { status: 403 }
      )
    }

    await prisma.module.delete({
      where: { id },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        action: "DELETE",
        entityType: "MODULE",
        entityId: id,
        entityName: existingModule.title,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting module:", error)
    return NextResponse.json({ error: "Ошибка при удалении модуля" }, { status: 500 })
  }
}
