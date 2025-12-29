import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const questionUpdateSchema = z.object({
  question: z.string().min(1).optional(),
  options: z.array(z.string()).min(2).optional(),
  correctAnswer: z.number().min(0).optional(),
  order: z.number().optional(),
})

interface Props {
  params: Promise<{ id: string }>
}

// PATCH - Update question
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const data = questionUpdateSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (data.question) updateData.question = data.question
    if (data.options) updateData.options = JSON.stringify(data.options)
    if (data.correctAnswer !== undefined) updateData.correctAnswer = data.correctAnswer
    if (data.order !== undefined) updateData.order = data.order

    const question = await prisma.question.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(question)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error updating question:", error)
    return NextResponse.json({ error: "Ошибка при обновлении вопроса" }, { status: 500 })
  }
}

// DELETE - Delete question
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    await prisma.question.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting question:", error)
    return NextResponse.json({ error: "Ошибка при удалении вопроса" }, { status: 500 })
  }
}
