import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { checkTrailPasswordAccess } from "@/lib/trail-password"

const updateProgressSchema = z.object({
  taskProgressId: z.string().min(1, "ID прогресса обязателен"),
  level: z.enum(["JUNIOR", "MIDDLE", "SENIOR"], {
    errorMap: () => ({ message: "Уровень должен быть JUNIOR, MIDDLE или SENIOR" })
  }),
  passed: z.boolean({ required_error: "Поле passed обязательно" }),
})

// GET - Get task progress for a trail
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const trailId = searchParams.get("trailId")

    if (!trailId) {
      return NextResponse.json({ error: "Не указан trailId" }, { status: 400 })
    }

    // Check trail password access
    const trail = await prisma.trail.findUnique({
      where: { id: trailId },
      select: { isPasswordProtected: true },
    })

    if (!trail) {
      return NextResponse.json({ error: "Trail не найден" }, { status: 404 })
    }

    if (trail.isPasswordProtected) {
      const passwordAccess = await checkTrailPasswordAccess(trailId, session.user.id)
      if (!passwordAccess.hasAccess) {
        return NextResponse.json({ error: "Доступ запрещён. Требуется пароль к trail." }, { status: 403 })
      }
    }

    let taskProgress = await prisma.taskProgress.findUnique({
      where: {
        userId_trailId: {
          userId: session.user.id,
          trailId: trailId,
        },
      },
    })

    // Create default progress if not exists (starts with MIDDLE available)
    if (!taskProgress) {
      taskProgress = await prisma.taskProgress.create({
        data: {
          userId: session.user.id,
          trailId: trailId,
          currentLevel: "MIDDLE",
          middleStatus: "PENDING",
          juniorStatus: "LOCKED",
          seniorStatus: "LOCKED",
        },
      })
    }

    return NextResponse.json(taskProgress)
  } catch (error) {
    console.error("Error getting task progress:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Update task progress (for teacher/admin review)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Check if user is teacher
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (user?.role !== "TEACHER") {
      return NextResponse.json({ error: "Только преподаватели могут обновлять прогресс" }, { status: 403 })
    }

    const body = await request.json()
    const { taskProgressId, level, passed } = updateProgressSchema.parse(body)

    const taskProgress = await prisma.taskProgress.findUnique({
      where: { id: taskProgressId },
    })

    if (!taskProgress) {
      return NextResponse.json({ error: "Task progress not found" }, { status: 404 })
    }

    let updateData: Record<string, string> = {}

    if (level === "MIDDLE") {
      if (passed) {
        // Middle passed → unlock Senior
        updateData = {
          middleStatus: "PASSED",
          seniorStatus: "PENDING",
          currentLevel: "SENIOR",
        }
      } else {
        // Middle failed → unlock Junior
        updateData = {
          middleStatus: "FAILED",
          juniorStatus: "PENDING",
          currentLevel: "JUNIOR",
        }
      }
    } else if (level === "JUNIOR") {
      updateData = {
        juniorStatus: passed ? "PASSED" : "FAILED",
      }
    } else if (level === "SENIOR") {
      updateData = {
        seniorStatus: passed ? "PASSED" : "FAILED",
      }
    }

    const updated = await prisma.taskProgress.update({
      where: { id: taskProgressId },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error updating task progress:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
