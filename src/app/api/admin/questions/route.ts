import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const questionSchema = z.object({
  moduleId: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctAnswer: z.number().min(0),
})

// POST - Create new question
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const data = questionSchema.parse(body)

    // Get max order for this module
    const maxOrder = await prisma.question.aggregate({
      where: { moduleId: data.moduleId },
      _max: { order: true },
    })

    const question = await prisma.question.create({
      data: {
        moduleId: data.moduleId,
        question: data.question,
        options: JSON.stringify(data.options),
        correctAnswer: data.correctAnswer,
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
