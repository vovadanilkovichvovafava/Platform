import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Helper to check if teacher is assigned to trail
async function isTeacherAssignedToTrail(teacherId: string, trailId: string): Promise<boolean> {
  const assignment = await prisma.trailTeacher.findUnique({
    where: {
      trailId_teacherId: { trailId, teacherId },
    },
  })
  return !!assignment
}

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE - Delete a pending submission (anti-spam, cleanup)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: submissionId } = await params
    const session = await getServerSession(authOptions)

    // Allow both TEACHER and ADMIN roles
    if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const isAdmin = session.user.role === "ADMIN"

    // Get submission with module info
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        module: {
          select: { id: true, title: true, trailId: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Работа не найдена" }, { status: 404 })
    }

    // Only allow deletion of PENDING submissions
    if (submission.status !== "PENDING") {
      return NextResponse.json(
        { error: "Можно удалять только работы со статусом 'На проверке'" },
        { status: 400 }
      )
    }

    // Verify teacher is assigned to this trail (ADMIN can delete any)
    if (!isAdmin) {
      const isAssigned = await isTeacherAssignedToTrail(session.user.id, submission.module.trailId)
      if (!isAssigned) {
        return NextResponse.json({ error: "Вы не назначены на этот trail" }, { status: 403 })
      }
    }

    // Delete the submission
    await prisma.submission.delete({
      where: { id: submissionId },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        action: "DELETE",
        entityType: "SUBMISSION",
        entityId: submissionId,
        entityName: `${submission.user.name}: ${submission.module.title}`,
        details: JSON.stringify({
          studentId: submission.user.id,
          studentName: submission.user.name,
          moduleId: submission.module.id,
          moduleTitle: submission.module.title,
          reason: "Teacher deletion (anti-spam/cleanup)",
        }),
      },
    })

    // Optionally notify the student that their submission was removed
    await prisma.notification.create({
      data: {
        userId: submission.userId,
        type: "SUBMISSION_DELETED",
        title: "Работа удалена",
        message: `Ваша работа по модулю "${submission.module.title}" была удалена учителем. Если это ошибка, свяжитесь с преподавателем.`,
        link: `/trails`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete submission error:", error)
    return NextResponse.json(
      { error: "Ошибка при удалении работы" },
      { status: 500 }
    )
  }
}
