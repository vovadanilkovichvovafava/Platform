import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notifyAboutComment } from "@/lib/notifications"

interface Props {
  params: Promise<{ id: string }>
}

const MAX_COMMENT_DEPTH = 3 // 0-3 = 4 levels

// GET - Get all comments for a submission
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { id: submissionId } = await params

    // Verify the submission exists and user has access
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        module: {
          select: { trailId: true },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Работа не найдена" }, { status: 404 })
    }

    // Check access: student owns submission, or teacher/admin
    const isOwner = submission.userId === session.user.id
    const isTeacherOrAdmin =
      session.user.role === "TEACHER" || session.user.role === "ADMIN"

    if (!isOwner && !isTeacherOrAdmin) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 })
    }

    // For teachers, verify they're assigned to this trail
    if (session.user.role === "TEACHER") {
      const assignment = await prisma.trailTeacher.findUnique({
        where: {
          trailId_teacherId: {
            trailId: submission.module.trailId,
            teacherId: session.user.id,
          },
        },
      })

      if (!assignment && !isOwner) {
        return NextResponse.json(
          { error: "Вы не назначены на этот trail" },
          { status: 403 }
        )
      }
    }

    // Get all comments for this submission
    const comments = await prisma.comment.findMany({
      where: { submissionId },
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
      orderBy: { createdAt: "asc" },
    })

    // Define types for tree building
    type CommentWithAuthor = (typeof comments)[number]
    type CommentWithReplies = CommentWithAuthor & { replies: CommentWithReplies[] }

    // Build tree structure
    const commentMap = new Map<string, CommentWithReplies>()
    const rootComments: CommentWithReplies[] = []

    // First pass: create map with empty replies arrays
    for (const comment of comments) {
      commentMap.set(comment.id, { ...comment, replies: [] })
    }

    // Second pass: build tree
    for (const comment of comments) {
      const commentWithReplies = commentMap.get(comment.id)!
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId)
        if (parent) {
          parent.replies.push(commentWithReplies)
        }
      } else {
        rootComments.push(commentWithReplies)
      }
    }

    return NextResponse.json(rootComments)
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json(
      { error: "Ошибка получения комментариев" },
      { status: 500 }
    )
  }
}

// POST - Create a new comment
export async function POST(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { id: submissionId } = await params
    const body = await request.json()
    const { content, parentId } = body

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Комментарий не может быть пустым" },
        { status: 400 }
      )
    }

    // Verify the submission exists
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        user: { select: { id: true, name: true } },
        module: {
          select: { title: true, trailId: true },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Работа не найдена" }, { status: 404 })
    }

    // Check access: student owns submission, or teacher/admin
    const isOwner = submission.userId === session.user.id
    const isTeacherOrAdmin =
      session.user.role === "TEACHER" || session.user.role === "ADMIN"

    if (!isOwner && !isTeacherOrAdmin) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 })
    }

    // For teachers, verify they're assigned to this trail
    if (session.user.role === "TEACHER") {
      const assignment = await prisma.trailTeacher.findUnique({
        where: {
          trailId_teacherId: {
            trailId: submission.module.trailId,
            teacherId: session.user.id,
          },
        },
      })

      if (!assignment && !isOwner) {
        return NextResponse.json(
          { error: "Вы не назначены на этот trail" },
          { status: 403 }
        )
      }
    }

    // Calculate depth
    let depth = 0
    let parentComment = null

    if (parentId) {
      parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        include: {
          author: { select: { id: true, name: true } },
        },
      })

      if (!parentComment) {
        return NextResponse.json(
          { error: "Родительский комментарий не найден" },
          { status: 404 }
        )
      }

      if (parentComment.submissionId !== submissionId) {
        return NextResponse.json(
          { error: "Родительский комментарий из другой работы" },
          { status: 400 }
        )
      }

      depth = parentComment.depth + 1

      if (depth > MAX_COMMENT_DEPTH) {
        return NextResponse.json(
          { error: "Достигнута максимальная глубина вложенности (4 уровня)" },
          { status: 400 }
        )
      }
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        submissionId,
        authorId: session.user.id,
        parentId: parentId || null,
        depth,
        content: content.trim(),
      },
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

    // Send notifications
    await notifyAboutComment({
      submissionId,
      moduleTitle: submission.module.title,
      commentAuthorId: session.user.id,
      commentAuthorName: session.user.name || "Пользователь",
      commentContent: content.trim(),
      submissionOwnerId: submission.userId,
      parentCommentAuthorId: parentComment?.authorId,
      parentCommentAuthorName: parentComment?.author.name,
    })

    return NextResponse.json({ ...comment, replies: [] })
  } catch (error) {
    console.error("Error creating comment:", error)
    return NextResponse.json(
      { error: "Ошибка создания комментария" },
      { status: 500 }
    )
  }
}
