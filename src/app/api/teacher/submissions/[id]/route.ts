import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE - Teacher can delete PENDING submissions (anti-spam, test cleanup)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { id } = await params

    // Get the submission with related data
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        module: {
          select: { trailId: true, title: true },
        },
        user: {
          select: { name: true },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Работа не найдена" }, { status: 404 })
    }

    // Only allow deleting PENDING submissions
    if (submission.status !== "PENDING") {
      return NextResponse.json(
        { error: "Можно удалять только работы со статусом 'На проверке'" },
        { status: 400 }
      )
    }

    // Check if teacher has access to this trail (or is admin)
    if (session.user.role === "TEACHER") {
      // Check 1: Is teacher specifically assigned to this trail?
      const teacherAssignment = await prisma.trailTeacher.findUnique({
        where: {
          trailId_teacherId: {
            trailId: submission.module.trailId,
            teacherId: session.user.id,
          },
        },
      })

      // Check 2: Is trail visible to all teachers?
      const trail = await prisma.trail.findUnique({
        where: { id: submission.module.trailId },
        select: { teacherVisibility: true },
      })

      const hasAccess = teacherAssignment || trail?.teacherVisibility === "ALL_TEACHERS"

      if (!hasAccess) {
        return NextResponse.json(
          { error: "У вас нет доступа к этому направлению" },
          { status: 403 }
        )
      }
    }

    // Delete the submission
    await prisma.submission.delete({
      where: { id },
    })

    // Create audit log for this deletion
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Unknown",
        action: "DELETE",
        entityType: "SUBMISSION",
        entityId: id,
        entityName: `${submission.user.name}: ${submission.module.title}`,
        details: JSON.stringify({
          deletedBy: session.user.name,
          reason: "teacher_cleanup",
          originalStatus: submission.status,
        }),
      },
    })

    // Notify the student about deletion (optional - helpful for awareness)
    await prisma.notification.create({
      data: {
        userId: submission.userId,
        type: "SUBMISSION_DELETED",
        title: "Работа удалена учителем",
        message: `Ваша работа "${submission.module.title}" была удалена учителем. Это может быть связано с пустой или тестовой отправкой.`,
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
