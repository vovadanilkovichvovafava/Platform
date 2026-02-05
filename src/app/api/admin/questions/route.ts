import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { checkTrailPasswordAccess } from "@/lib/trail-password"

const questionSchema = z.object({
  moduleId: z.string().min(1),
  type: z.enum(["SINGLE_CHOICE", "MATCHING", "ORDERING", "CASE_ANALYSIS"]).default("SINGLE_CHOICE"),
  question: z.string().min(1),
  options: z.array(z.string()).default([]),
  correctAnswer: z.number().min(0).default(0),
  data: z.any().optional(), // JSON data for interactive question types
}).refine(
  (data) => {
    // For SINGLE_CHOICE, validate correctAnswer
    if (data.type === "SINGLE_CHOICE") {
      return data.options.length >= 2 && data.correctAnswer < data.options.length
    }
    // For interactive types, data is required
    return ["MATCHING", "ORDERING", "CASE_ANALYSIS"].includes(data.type) ? !!data.data : true
  },
  { message: "Невалидные данные для типа вопроса", path: ["type"] }
)

// Helper to check if teacher is assigned to trail via module
async function isTeacherAssignedToModule(teacherId: string, moduleId: string): Promise<boolean> {
  const courseModule = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { trailId: true },
  })
  if (!courseModule) return false

  const assignment = await prisma.trailTeacher.findUnique({
    where: {
      trailId_teacherId: { trailId: courseModule.trailId, teacherId },
    },
  })
  return !!assignment
}

// POST - Create new question (Admin: any, Teacher: only in assigned trails)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const data = questionSchema.parse(body)

    // Teachers can only create questions in modules belonging to assigned trails
    if (session.user.role === "TEACHER") {
      const isAssigned = await isTeacherAssignedToModule(session.user.id, data.moduleId)
      if (!isAssigned) {
        return NextResponse.json({ error: "Вы не назначены на этот trail" }, { status: 403 })
      }
    }

    // Check password access for protected trails (non-creators must enter password)
    const courseModule = await prisma.module.findUnique({
      where: { id: data.moduleId },
      select: { trail: { select: { id: true, createdById: true, isPasswordProtected: true } } },
    })

    if (!courseModule) {
      return NextResponse.json({ error: "Модуль не найден" }, { status: 404 })
    }

    const isCreator = courseModule.trail.createdById === session.user.id
    if (!isCreator && courseModule.trail.isPasswordProtected) {
      const passwordAccess = await checkTrailPasswordAccess(courseModule.trail.id, session.user.id)
      if (!passwordAccess.hasAccess) {
        return NextResponse.json(
          { error: "Для создания вопроса в защищённом трейле необходимо ввести пароль", requiresPassword: true },
          { status: 403 }
        )
      }
    }

    // Get max order for this module
    const maxOrder = await prisma.question.aggregate({
      where: { moduleId: data.moduleId },
      _max: { order: true },
    })

    const question = await prisma.question.create({
      data: {
        moduleId: data.moduleId,
        type: data.type,
        question: data.question,
        options: JSON.stringify(data.options),
        correctAnswer: data.correctAnswer,
        data: data.data ? JSON.stringify(data.data) : null,
        order: (maxOrder._max.order || 0) + 1,
      },
    })

    return NextResponse.json(question)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error creating question:", error)
    return NextResponse.json({ error: "Ошибка при создании вопроса" }, { status: 500 })
  }
}
