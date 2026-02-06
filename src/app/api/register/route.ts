import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit"

const registerSchema = z.object({
  inviteCode: z.string().min(1, "Код приглашения обязателен"),
  firstName: z.string().min(2, "Имя должно быть минимум 2 символа"),
  lastName: z.string().min(2, "Фамилия должна быть минимум 2 символа"),
  telegramUsername: z
    .string()
    .min(1, "Telegram-ник обязателен")
    .regex(/^@[a-zA-Z0-9_]{5,32}$/, "Некорректный Telegram-ник"),
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Пароль должен быть минимум 6 символов"),
})

export async function POST(request: Request) {
  try {
    // Rate limiting для защиты от брутфорса
    const clientIP = getClientIP(request)
    const rateLimit = checkRateLimit(`register:${clientIP}`, RATE_LIMITS.auth)

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn)
    }

    const body = await request.json()
    const { inviteCode, email, password, firstName, lastName, telegramUsername } = registerSchema.parse(body)
    const name = `${firstName} ${lastName}`

    // 1. Validate invite code and get associated trails
    const invite = await prisma.invite.findUnique({
      where: { code: inviteCode.toUpperCase() },
      include: {
        trails: {
          include: {
            trail: {
              select: { id: true },
            },
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json(
        { error: "Недействительный код приглашения" },
        { status: 400 }
      )
    }

    // 2. Check if code is expired
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: "Код приглашения истёк" },
        { status: 400 }
      )
    }

    // 3. Check usage limit
    if (invite.usedCount >= invite.maxUses) {
      return NextResponse.json(
        { error: "Код приглашения уже использован максимальное количество раз" },
        { status: 400 }
      )
    }

    // 4. Check if code is restricted to specific email
    if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: "Этот код приглашения предназначен для другого email" },
        { status: 400 }
      )
    }

    // 5. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Get trail IDs from invite
    // Note: If admin attached a trail to invite, student should get access regardless of isPublished status
    const validTrailIds = invite.trails
      .map((t) => t.trail)
      .filter((trail) => trail !== null) // Filter out deleted trails
      .map((trail) => trail.id)

    // Use transaction to ensure atomicity
    const user = await prisma.$transaction(async (tx) => {
      // Increment invite usage
      await tx.invite.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      })

      // Create user
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          firstName,
          lastName,
          telegramUsername,
          role: "STUDENT",
          invitedBy: invite.createdById,
        },
      })

      // Assign trail access from invite
      if (validTrailIds.length > 0) {
        await tx.studentTrailAccess.createMany({
          data: validTrailIds.map((trailId) => ({
            studentId: newUser.id,
            trailId,
          })),
          skipDuplicates: true, // Prevent errors on re-registration attempts
        })
      }

      return newUser
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Ошибка при регистрации" },
      { status: 500 }
    )
  }
}
