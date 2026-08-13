import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrivileged, privilegedHasTrailAccess } from "@/lib/admin-access"

// In-memory rate limiting for delete operations (1.5s cooldown)
// Key: `userId:submissionId`, Value: timestamp of last delete attempt
const deleteAttempts = new Map<string, number>()
const DELETE_COOLDOWN_MS = 1500

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamp] of deleteAttempts.entries()) {
    if (now - timestamp > 60000) { // Remove entries older than 1 minute
      deleteAttempts.delete(key)
    }
  }
}, 300000)

// DELETE - Teacher can delete PENDING submissions (anti-spam, test cleanup)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { id } = await params

    // Server-side rate limiting to prevent double-submit
    const rateLimitKey = `${session.user.id}:${id}`
    const lastAttempt = deleteAttempts.get(rateLimitKey)
    const now = Date.now()

    if (lastAttempt && now - lastAttempt < DELETE_COOLDOWN_MS) {
      return NextResponse.json(
        { error: "Слишком частые запросы. Подождите 1.5 секунды." },
        { status: 429 }
      )
    }

    // Record this attempt
    deleteAttempts.set(rateLimitKey, now)

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

    // Check if user has access to this trail (ADMIN always, CO_ADMIN/TEACHER by assignment)
    const hasAccess = await privilegedHasTrailAccess(
      session.user.id,
      session.user.role,
      submission.module.trailId
    )
    if (!hasAccess) {
      return NextResponse.json(
        { error: "У вас нет доступа к этому направлению" },
        { status: 403 }
      )
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

    // Синхронизация уведомлений: автопрочтение SUBMISSION_PENDING для ВСЕХ учителей
    // Работа удалена — уведомления о ней у всех получателей больше не актуальны
    prisma.notification.updateMany({
      where: {
        type: "SUBMISSION_PENDING",
        link: `/teacher/reviews/${id}`,
        isRead: false,
      },
      data: { isRead: true },
    }).catch(() => {})

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
