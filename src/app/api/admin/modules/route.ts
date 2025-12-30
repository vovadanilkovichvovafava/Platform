import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { ModuleType, ModuleLevel } from "@prisma/client"

const moduleSchema = z.object({
  trailId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  content: z.string().default(""),
  requirements: z.string().default(""),
  type: z.nativeEnum(ModuleType).default(ModuleType.THEORY),
  level: z.nativeEnum(ModuleLevel).default(ModuleLevel.Beginner),
  points: z.number().default(50),
  duration: z.string().default("15 мин"),
})

// Helper to check if teacher is assigned to trail
async function isTeacherAssignedToTrail(teacherId: string, trailId: string): Promise<boolean> {
  const assignment = await prisma.trailTeacher.findUnique({
    where: {
      trailId_teacherId: { trailId, teacherId },
    },
  })
  return !!assignment
}

// POST - Create new module (Admin: any trail, Teacher: only assigned trails)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const data = moduleSchema.parse(body)

    // Teachers can only create modules in trails they are assigned to
    if (session.user.role === "TEACHER") {
      const isAssigned = await isTeacherAssignedToTrail(session.user.id, data.trailId)
      if (!isAssigned) {
        return NextResponse.json({ error: "Вы не назначены на этот trail" }, { status: 403 })
      }
    }

    // Generate slug from title
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-|-$/g, "")

    // Get max order for this trail
    const maxOrder = await prisma.module.aggregate({
      where: { trailId: data.trailId },
      _max: { order: true },
    })

    const module = await prisma.module.create({
      data: {
        ...data,
        slug: `${slug}-${Date.now()}`, // Ensure unique slug
        order: (maxOrder._max.order || 0) + 1,
      },
    })

    return NextResponse.json(module)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error creating module:", error)
    return NextResponse.json({ error: "Ошибка при создании модуля" }, { status: 500 })
  }
}
