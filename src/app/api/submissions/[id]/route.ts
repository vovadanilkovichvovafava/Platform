import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface Props {
  params: Promise<{ id: string }>
}

// DELETE - Student deletes their own submission
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { id } = await params

    // Find the submission
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        module: {
          select: { title: true },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Работа не найдена" }, { status: 404 })
    }

    // Verify the student owns this submission
    if (submission.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Вы можете удалять только свои работы" },
        { status: 403 }
      )
    }

    // Only allow deleting PENDING submissions
    if (submission.status !== "PENDING") {
      return NextResponse.json(
        { error: "Можно удалять только работы на проверке" },
        { status: 400 }
      )
    }

    // Delete the submission
    await prisma.submission.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting submission:", error)
    return NextResponse.json(
      { error: "Ошибка удаления работы" },
      { status: 500 }
    )
  }
}

// GET - Get own submission details
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { id } = await params

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        module: {
          select: {
            title: true,
            description: true,
            trail: { select: { title: true } },
          },
        },
        review: true,
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Работа не найдена" }, { status: 404 })
    }

    // Verify the student owns this submission
    if (submission.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Доступ запрещён" },
        { status: 403 }
      )
    }

    return NextResponse.json(submission)
  } catch (error) {
    console.error("Error fetching submission:", error)
    return NextResponse.json(
      { error: "Ошибка получения данных" },
      { status: 500 }
    )
  }
}
