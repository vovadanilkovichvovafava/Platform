import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const startSchema = z.object({
  moduleId: z.string().min(1, "moduleId обязателен"),
  skipModuleWarning: z.boolean().optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { moduleId, skipModuleWarning } = startSchema.parse(body)

    // Verify module exists with trail context for progression check
    const courseModule = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        trail: {
          include: {
            modules: {
              orderBy: { order: "asc" },
              select: { id: true, order: true, type: true },
            },
          },
        },
      },
    })

    if (!courseModule) {
      return NextResponse.json({ error: "Модуль не найден" }, { status: 404 })
    }

    // Check if progress already exists (may have been auto-started from previous submission)
    const existingProgress = await prisma.moduleProgress.findUnique({
      where: { userId_moduleId: { userId: session.user.id, moduleId } },
      select: { startedAt: true },
    })

    // Server-side module progression check — prevent starting locked modules
    // Only check if module hasn't been started yet (existing progress = already allowed)
    const isPrivileged = session.user.role === "ADMIN" || session.user.role === "TEACHER" || session.user.role === "CO_ADMIN"
    if (!isPrivileged && !existingProgress) {
      const allTrailModules = courseModule.trail.modules

      if (courseModule.type === "PROJECT") {
        // PROJECT modules: all assessment modules must be COMPLETED
        const assessmentModuleIds = allTrailModules
          .filter((m: { type: string }) => m.type !== "PROJECT")
          .map((m: { id: string }) => m.id)

        if (assessmentModuleIds.length > 0) {
          const completedCount = await prisma.moduleProgress.count({
            where: {
              userId: session.user.id,
              moduleId: { in: assessmentModuleIds },
              status: "COMPLETED",
            },
          })
          if (completedCount < assessmentModuleIds.length) {
            return NextResponse.json(
              { error: "Завершите все предыдущие модули перед началом проекта" },
              { status: 403 }
            )
          }
        }
      } else {
        // ASSESSMENT module: previous assessment must allow progression
        const assessmentModules = allTrailModules.filter((m: { type: string }) => m.type !== "PROJECT")
        const currentIdx = assessmentModules.findIndex((m: { id: string }) => m.id === courseModule.id)

        if (currentIdx > 0) {
          const prevModule = assessmentModules[currentIdx - 1]
          const prevProgress = await prisma.moduleProgress.findUnique({
            where: { userId_moduleId: { userId: session.user.id, moduleId: prevModule.id } },
          })

          const prevCompleted = prevProgress?.status === "COMPLETED"

          let canProgress = prevCompleted
          if (!prevCompleted && courseModule.trail.allowSkipReview) {
            // Free mode: allow if previous is IN_PROGRESS with a PENDING submission
            if (prevProgress?.status === "IN_PROGRESS") {
              const prevPendingSubmission = await prisma.submission.findFirst({
                where: { userId: session.user.id, moduleId: prevModule.id, status: "PENDING" },
                select: { id: true },
              })
              canProgress = !!prevPendingSubmission
            }
          }

          if (!canProgress) {
            return NextResponse.json(
              { error: "Завершите предыдущий модуль перед началом следующего" },
              { status: 403 }
            )
          }
        }
      }
    }

    // Upsert module progress — create IN_PROGRESS if doesn't exist
    // If exists but startedAt is null (auto-started), set it now
    await prisma.moduleProgress.upsert({
      where: {
        userId_moduleId: {
          userId: session.user.id,
          moduleId,
        },
      },
      update: existingProgress && !existingProgress.startedAt
        ? { startedAt: new Date() }
        : {},
      create: {
        userId: session.user.id,
        moduleId,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    })

    // Optionally persist "don't show again" preference
    if (skipModuleWarning !== undefined) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { skipModuleWarning },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Module start error:", error)
    return NextResponse.json(
      { error: "Ошибка запуска модуля" },
      { status: 500 }
    )
  }
}
