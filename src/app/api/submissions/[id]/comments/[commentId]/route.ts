import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface Props {
  params: Promise<{ id: string; commentId: string }>
}

// PATCH - Edit a comment
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { id: submissionId, commentId } = await params
    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Комментарий не может быть пустым" },
        { status: 400 }
      )
    }

    // Find the comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    })

    if (!comment) {
      return NextResponse.json(
        { error: "Комментарий не найден" },
        { status: 404 }
      )
    }

    if (comment.submissionId !== submissionId) {
      return NextResponse.json(
        { error: "Комментарий из другой работы" },
        { status: 400 }
      )
    }

    // Only author can edit their comment (or admin)
    if (comment.authorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Вы можете редактировать только свои комментарии" },
        { status: 403 }
      )
    }

    // Update the comment
    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating comment:", error)
    return NextResponse.json(
      { error: "Ошибка обновления комментария" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a comment
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { id: submissionId, commentId } = await params

    // Find the comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        replies: { select: { id: true } },
      },
    })

    if (!comment) {
      return NextResponse.json(
        { error: "Комментарий не найден" },
        { status: 404 }
      )
    }

    if (comment.submissionId !== submissionId) {
      return NextResponse.json(
        { error: "Комментарий из другой работы" },
        { status: 400 }
      )
    }

    // Author can delete their comment, or admin
    const isAuthor = comment.authorId === session.user.id
    const isAdmin = session.user.role === "ADMIN"

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: "Вы можете удалять только свои комментарии" },
        { status: 403 }
      )
    }

    // Delete comment (cascade will delete replies)
    await prisma.comment.delete({
      where: { id: commentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting comment:", error)
    return NextResponse.json(
      { error: "Ошибка удаления комментария" },
      { status: 500 }
    )
  }
}
