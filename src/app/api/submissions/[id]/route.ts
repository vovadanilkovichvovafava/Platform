import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schema for updating submission
const updateSubmissionSchema = z.object({
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

// GET - Get submission details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { id } = await params

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            type: true,
            trailId: true,
          },
        },
        review: {
          select: {
            id: true,
            score: true,
            comment: true,
            createdAt: true,
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Работа не найдена" }, { status: 404 })
    }

    // Check ownership - only author can view full details
    if (submission.userId !== session.user.id && session.user.role === "STUDENT") {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 })
    }

    return NextResponse.json({
      ...submission,
      canEdit: submission.userId === session.user.id && submission.status === "PENDING",
    })
  } catch (error) {
    console.error("Error fetching submission:", error)
    return NextResponse.json(
      { error: "Ошибка загрузки работы" },
      { status: 500 }
    )
  }
}

// PATCH - Update submission
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { id } = await params

    // Find submission and check ownership
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        review: { select: { id: true } },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Работа не найдена" }, { status: 404 })
    }

    // Only author can edit
    if (submission.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Вы можете редактировать только свои работы" },
        { status: 403 }
      )
    }

    // Cannot edit after review
    if (submission.status !== "PENDING") {
      return NextResponse.json(
        { error: "Нельзя редактировать работу после проверки" },
        { status: 400 }
      )
    }

    // If there's already a review (shouldn't happen with PENDING status, but extra safety)
    if (submission.review) {
      return NextResponse.json(
        { error: "Работа уже проверена" },
        { status: 400 }
      )
    }

    // Parse and validate input
    const body = await request.json()
    const data = updateSubmissionSchema.parse(body)

    // At least one URL must be provided
    if (!data.githubUrl && !data.deployUrl && !data.fileUrl) {
      return NextResponse.json(
        { error: "Укажите хотя бы одну ссылку (GitHub, деплой или файл)" },
        { status: 400 }
      )
    }

    // Update submission
    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: {
        githubUrl: data.githubUrl || null,
        deployUrl: data.deployUrl || null,
        fileUrl: data.fileUrl || null,
        comment: data.comment || null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      ...updatedSubmission,
      canEdit: true,
      message: "Работа успешно обновлена",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error updating submission:", error)
    return NextResponse.json(
      { error: "Ошибка при обновлении работы" },
      { status: 500 }
    )
  }
}
