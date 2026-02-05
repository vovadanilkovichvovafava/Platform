import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { verifyTrailPassword, getTrailPasswordHint } from "@/lib/trail-password"
import { getClientIP } from "@/lib/rate-limit"

const unlockSchema = z.object({
  password: z.string().min(1, "Пароль обязателен"),
})

interface Props {
  params: Promise<{ id: string }>
}

// POST - Unlock trail with password
export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { id: trailId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 })
    }

    const body = await request.json()
    const data = unlockSchema.parse(body)

    const ipAddress = getClientIP(request)

    const result = await verifyTrailPassword(
      trailId,
      session.user.id,
      data.password,
      ipAddress
    )

    if (result.success) {
      return NextResponse.json({ success: true })
    }

    // Return safe error without leaking details
    const response: {
      error: string
      hint?: string | null
      rateLimited?: boolean
      retryAfter?: number
    } = {
      error: result.error || "Неверный пароль",
    }

    // Include hint if password was wrong
    if (result.hint) {
      response.hint = result.hint
    }

    // Include rate limit info
    if (result.rateLimited && result.resetIn) {
      response.rateLimited = true
      response.retryAfter = result.resetIn
      return NextResponse.json(response, {
        status: 429,
        headers: {
          "Retry-After": result.resetIn.toString(),
        },
      })
    }

    return NextResponse.json(response, { status: 401 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error unlocking trail:", error)
    return NextResponse.json(
      { error: "Ошибка разблокировки" },
      { status: 500 }
    )
  }
}

// GET - Get password hint (for displaying on lock screen)
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id: trailId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 })
    }

    const hint = await getTrailPasswordHint(trailId)

    return NextResponse.json({ hint })
  } catch (error) {
    console.error("Error getting hint:", error)
    return NextResponse.json({ error: "Ошибка получения подсказки" }, { status: 500 })
  }
}
