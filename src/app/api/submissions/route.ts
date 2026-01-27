import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit"
import { recordActivity } from "@/lib/activity"
import { notifyTeachersAboutSubmission } from "@/lib/notifications"

const submissionSchema = z.object({
  moduleId: z.string().min(1),
  githubUrl: z
    .string()
    .url()
    .refine(
      (url) => url.startsWith("https://github.com/"),
      "GitHub URL должен начинаться с https://github.com/"
    )
    .optional()
    .or(z.literal("")),
  deployUrl: z
    .string()
    .url()
    .refine(
      (url) => url.startsWith("https://"),
      "URL деплоя должен использовать HTTPS"
    )
    .optional()
    .or(z.literal("")),
  fileUrl: z
    .string()
    .url("Некорректная ссылка на файл")
    .refine(
      (url) => url.startsWith("https://"),
      "Ссылка должна использовать HTTPS"
    )
    .optional()
    .or(z.literal("")),
  comment: z.string().max(2000, "Комментарий слишком длинный").optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Rate limiting - 10 отправок в час
    const rateLimit = checkRateLimit(`submissions:${session.user.id}`, RATE_LIMITS.submissions)
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn)
    }

    // Record daily activity
    await recordActivity(session.user.id)

    const body = await request.json()
    const data = submissionSchema.parse(body)

    if (!data.githubUrl && !data.deployUrl && !data.fileUrl) {
      return NextResponse.json(
        { error: "Укажите хотя бы одну ссылку (GitHub, деплой или файл)" },
        { status: 400 }
      )
    }

    // Check if module exists and is a project
    const courseModule = await prisma.module.findUnique({
      where: { id: data.moduleId },
    })

    if (!courseModule) {
      return NextResponse.json(
        { error: "Модуль не найден" },
        { status: 404 }
      )
    }

    // Разрешаем отправку для проектов и модулей с requiresSubmission
    if (courseModule.type !== "PROJECT" && !courseModule.requiresSubmission) {
      return NextResponse.json(
        { error: "Этот модуль не требует отправки работы" },
        { status: 400 }
      )
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_trailId: {
          userId: session.user.id,
          trailId: courseModule.trailId,
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: "Вы не записаны на этот trail" },
        { status: 403 }
      )
    }

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        userId: session.user.id,
        moduleId: data.moduleId,
        githubUrl: data.githubUrl || null,
        deployUrl: data.deployUrl || null,
        fileUrl: data.fileUrl || null,
        comment: data.comment || null,
        status: "PENDING",
      },
    })

    // Update module progress to in_progress if not already
    await prisma.moduleProgress.upsert({
      where: {
        userId_moduleId: {
          userId: session.user.id,
          moduleId: data.moduleId,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        moduleId: data.moduleId,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    })

    // Notify teachers about new submission
    await notifyTeachersAboutSubmission({
      trailId: courseModule.trailId,
      studentName: session.user.name || "Студент",
      moduleTitle: courseModule.title,
      submissionId: submission.id,
    })

    return NextResponse.json(submission)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Submission error:", error)
    return NextResponse.json(
      { error: "Ошибка при отправке работы" },
      { status: 500 }
    )
  }
}
