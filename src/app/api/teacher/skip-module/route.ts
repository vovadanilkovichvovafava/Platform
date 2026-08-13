import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkAndAwardAchievements } from "@/lib/check-achievements"
import { isPrivileged, isAdmin, getTeacherAllowedTrailIds, adminHasTrailAccess } from "@/lib/admin-access"

/**
 * Check if the current user has access to manage the given trail
 * - ADMIN: always has access
 * - CO_ADMIN: must have explicit AdminTrailAccess
 * - TEACHER: must be assigned to trail or trail has ALL_TEACHERS visibility
 */
async function hasTrailAccess(
  userId: string,
  role: string,
  trailId: string
): Promise<boolean> {
  // ADMIN has access to all trails
  if (isAdmin(role)) {
    return true
  }

  // CO_ADMIN - check AdminTrailAccess
  if (role === "CO_ADMIN") {
    return await adminHasTrailAccess(userId, role, trailId)
  }

  // TEACHER - check TrailTeacher assignment or ALL_TEACHERS visibility
  const teacherTrailIds = await getTeacherAllowedTrailIds(userId)
  return teacherTrailIds.includes(trailId)
}

// POST - Teacher marks a module as skipped for a student
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { studentId, moduleId } = await request.json()

    if (!studentId || !moduleId) {
      return NextResponse.json({ error: "Missing studentId or moduleId" }, { status: 400 })
    }

    // Check student exists
    const student = await prisma.user.findUnique({
      where: { id: studentId, role: "STUDENT" },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Check module exists and get trail info
    const courseModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        title: true,
        points: true,
        trailId: true,
      },
    })

    if (!courseModule) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    // Check if user has access to this trail
    const canAccess = await hasTrailAccess(session.user.id, session.user.role, courseModule.trailId)
    if (!canAccess) {
      return NextResponse.json(
        { error: "Вы не назначены на этот курс" },
        { status: 403 }
      )
    }

    // Check if progress already exists
    const existingProgress = await prisma.moduleProgress.findUnique({
      where: {
        userId_moduleId: {
          userId: studentId,
          moduleId: moduleId,
        },
      },
    })

    if (existingProgress?.status === "COMPLETED" && !existingProgress.skippedByTeacher) {
      return NextResponse.json({ error: "Module already completed by student" }, { status: 400 })
    }

    // Create or update progress as COMPLETED with skipped flag
    const progress = await prisma.moduleProgress.upsert({
      where: {
        userId_moduleId: {
          userId: studentId,
          moduleId: moduleId,
        },
      },
      update: {
        status: "COMPLETED",
        completedAt: new Date(),
        hasEarnedXP: true,
        skippedByTeacher: true,
        skippedAt: new Date(),
        skippedBy: session.user.id,
      },
      create: {
        userId: studentId,
        moduleId: moduleId,
        status: "COMPLETED",
        completedAt: new Date(),
        hasEarnedXP: true,
        skippedByTeacher: true,
        skippedAt: new Date(),
        skippedBy: session.user.id,
      },
    })

    // Award XP to student (only if not already earned)
    if (!existingProgress?.hasEarnedXP) {
      await prisma.user.update({
        where: { id: studentId },
        data: {
          totalXP: { increment: courseModule.points },
        },
      })
    }

    // Auto-approve any PENDING submissions for this student + module
    // When teacher closes a module, pending works should be accepted automatically
    const pendingSubmissions = await prisma.submission.findMany({
      where: {
        userId: studentId,
        moduleId: moduleId,
        status: "PENDING",
      },
    })

    for (const submission of pendingSubmissions) {
      // Update submission status to APPROVED
      await prisma.submission.update({
        where: { id: submission.id },
        data: { status: "APPROVED" },
      })

      // Create auto-review by teacher
      await prisma.review.create({
        data: {
          submissionId: submission.id,
          reviewerId: session.user.id,
          score: 10,
          comment: "Автоматически принято при закрытии модуля учителем",
          criteria: null,
          strengths: null,
          improvements: null,
        },
      })

      // Notify student that their work was accepted
      await prisma.notification.create({
        data: {
          userId: studentId,
          type: "REVIEW_RECEIVED",
          title: "Работа принята!",
          message: `Ваша работа по модулю "${courseModule.title}" была автоматически принята при закрытии модуля`,
          link: "/my-work",
        },
      })

      // Mark SUBMISSION_PENDING notifications as read for all teachers
      prisma.notification.updateMany({
        where: {
          type: "SUBMISSION_PENDING",
          link: `/teacher/reviews/${submission.id}`,
          isRead: false,
        },
        data: { isRead: true },
      }).catch(() => {})
    }

    // Check and award achievements for the student
    const newAchievements = await checkAndAwardAchievements(studentId)

    return NextResponse.json({
      success: true,
      progress,
      achievements: newAchievements,
      autoApprovedSubmissions: pendingSubmissions.length,
    })
  } catch (error) {
    console.error("Skip module error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Teacher removes skip (reverts module to not completed)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !isPrivileged(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const moduleId = searchParams.get("moduleId")

    if (!studentId || !moduleId) {
      return NextResponse.json({ error: "Missing studentId or moduleId" }, { status: 400 })
    }

    // Get module with trail info for access check
    const courseModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        points: true,
        trailId: true,
      },
    })

    if (!courseModule) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    // Check if user has access to this trail
    const canAccess = await hasTrailAccess(session.user.id, session.user.role, courseModule.trailId)
    if (!canAccess) {
      return NextResponse.json(
        { error: "Вы не назначены на этот курс" },
        { status: 403 }
      )
    }

    // Find the progress
    const progress = await prisma.moduleProgress.findUnique({
      where: {
        userId_moduleId: {
          userId: studentId,
          moduleId: moduleId,
        },
      },
    })

    if (!progress) {
      return NextResponse.json({ error: "Progress not found" }, { status: 404 })
    }

    // Only allow reverting if it was skipped by teacher
    if (!progress.skippedByTeacher) {
      return NextResponse.json({ error: "Cannot revert - module was completed by student" }, { status: 400 })
    }

    // Delete progress
    await prisma.moduleProgress.delete({
      where: {
        userId_moduleId: {
          userId: studentId,
          moduleId: moduleId,
        },
      },
    })

    // Remove XP from student
    await prisma.user.update({
      where: { id: studentId },
      data: {
        totalXP: { decrement: courseModule.points },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Revert skip error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
