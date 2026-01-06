import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"

const submissionSchema = z.object({
  moduleId: z.string().min(1),
  githubUrl: z.string().url().optional().or(z.literal("")),
  deployUrl: z.string().url().optional().or(z.literal("")),
  comment: z.string().optional(),
})

export async function POST(request: Request) {
  // Rate limiting - 10 submissions per minute per IP
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(`submissions:${ip}`, RATE_LIMITS.submissions)

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: `Слишком много отправок. Попробуйте через ${rateLimit.resetIn} секунд` },
      { status: 429 }
    )
  }

  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const body = await request.json()
    const data = submissionSchema.parse(body)

    if (!data.githubUrl && !data.deployUrl) {
      return NextResponse.json(
        { error: "Укажите хотя бы GitHub или ссылку на деплой" },
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

    if (courseModule.type !== "PROJECT") {
      return NextResponse.json(
        { error: "Можно отправлять только проекты" },
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

    // Check if there's an existing submission that needs revision
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        userId: session.user.id,
        moduleId: data.moduleId,
        status: "REVISION", // Only update if status is REVISION (resubmit)
      },
      include: { review: true },
    })

    let submission

    if (existingSubmission) {
      // Update existing submission (resubmit after revision)
      // Delete old review first if exists
      if (existingSubmission.review) {
        await prisma.review.delete({
          where: { id: existingSubmission.review.id },
        })
      }

      submission = await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          githubUrl: data.githubUrl || null,
          deployUrl: data.deployUrl || null,
          comment: data.comment || null,
          status: "PENDING",
        },
      })
    } else {
      // Create new submission
      submission = await prisma.submission.create({
        data: {
          userId: session.user.id,
          moduleId: data.moduleId,
          githubUrl: data.githubUrl || null,
          deployUrl: data.deployUrl || null,
          comment: data.comment || null,
          status: "PENDING",
        },
      })
    }

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
