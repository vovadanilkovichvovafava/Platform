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

    // Verify module exists
    const courseModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { id: true },
    })

    if (!courseModule) {
      return NextResponse.json({ error: "Модуль не найден" }, { status: 404 })
    }

    // Upsert module progress — create IN_PROGRESS if doesn't exist,
    // don't overwrite if already started/completed
    await prisma.moduleProgress.upsert({
      where: {
        userId_moduleId: {
          userId: session.user.id,
          moduleId,
        },
      },
      update: {}, // Don't overwrite existing progress
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
