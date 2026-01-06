import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const moduleUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  requirements: z.string().optional(),
  type: z.enum(["THEORY", "PRACTICE", "PROJECT"]).optional(),
  level: z.enum(["Beginner", "Intermediate", "Junior", "Middle", "Senior"]).optional(),
  points: z.number().optional(),
  duration: z.string().optional(),
})

interface Props {
  params: Promise<{ id: string }>
}

// GET - Get single module with questions
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const courseModule = await prisma.module.findUnique({
      where: { id },
      include: {
        trail: true,
        questions: {
          orderBy: { order: "asc" },
        },
      },
    })

    if (!courseModule) {
      return NextResponse.json({ error: "Модуль не найден" }, { status: 404 })
    }

    return NextResponse.json(courseModule)
  } catch (error) {
    console.error("Error fetching module:", error)
    return NextResponse.json({ error: "Ошибка при получении модуля" }, { status: 500 })
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

// PATCH - Update module (Admin: any, Teacher: only in assigned trails)
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
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

    // Teachers can only update modules in trails they are assigned to
    if (session.user.role === "TEACHER") {
      const isAssigned = await isTeacherAssignedToTrail(session.user.id, existingModule.trailId)
      if (!isAssigned) {
        return NextResponse.json({ error: "Вы не назначены на этот trail" }, { status: 403 })
      }
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

// DELETE - Delete module (Admin: any, Teacher: only in assigned trails)
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
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

    // Teachers can only delete modules in trails they are assigned to
    if (session.user.role === "TEACHER") {
      const isAssigned = await isTeacherAssignedToTrail(session.user.id, existingModule.trailId)
      if (!isAssigned) {
        return NextResponse.json({ error: "Вы не назначены на этот trail" }, { status: 403 })
      }
    }

    await prisma.module.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting module:", error)
    return NextResponse.json({ error: "Ошибка при удалении модуля" }, { status: 500 })
  }
}
