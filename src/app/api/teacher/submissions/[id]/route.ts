import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface Props {
  params: Promise<{ id: string }>
}

// DELETE - Teacher/Admin deletes a submission
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)

    // Only TEACHER and ADMIN can delete submissions
    if (
      !session?.user?.id ||
      (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")
    ) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { id } = await params

    // Find the submission with related data
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        module: {
          select: {
            title: true,
            trailId: true,
            trail: { select: { title: true } },
          },
        },
        review: true,
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Работа не найдена" }, { status: 404 })
    }

    const isAdmin = session.user.role === "ADMIN"

    // For teachers, verify they are assigned to this trail
    if (!isAdmin) {
      const assignment = await prisma.trailTeacher.findUnique({
        where: {
          trailId_teacherId: {
            trailId: submission.module.trailId,
            teacherId: session.user.id,
          },
        },
      })

      if (!assignment) {
        return NextResponse.json(
          { error: "Вы не назначены на этот trail" },
          { status: 403 }
        )
      }
    }

    // Delete the submission and related review (cascade should handle this)
    await prisma.submission.delete({
      where: { id },
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        action: "SUBMISSION_DELETED",
        entityType: "Submission",
        entityId: id,
        entityName: `${submission.user.name || "Student"} - ${submission.module.title}`,
        details: JSON.stringify({
          studentName: submission.user.name,
          studentEmail: submission.user.email,
          moduleTitle: submission.module.title,
          trailTitle: submission.module.trail.title,
          submissionStatus: submission.status,
          hadReview: !!submission.review,
          deletedBy: session.user.name || session.user.email,
          deletedByRole: session.user.role,
        }),
      },
    })

    // Notify the student about deletion
    await prisma.notification.create({
      data: {
        userId: submission.userId,
        type: "SUBMISSION_DELETED",
        title: "Работа удалена",
        message: `Ваша работа по модулю "${submission.module.title}" была удалена преподавателем`,
        link: `/dashboard`,
      },
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

// GET - Get submission details (for confirmation dialog)
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)

    if (
      !session?.user?.id ||
      (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")
    ) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { id } = await params

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        module: {
          select: {
            title: true,
            trail: { select: { title: true } },
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Работа не найдена" }, { status: 404 })
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
