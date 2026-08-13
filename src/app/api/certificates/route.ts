import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkAndAwardAchievements } from "@/lib/check-achievements"
import crypto from "crypto"

// GET - Get user's certificates
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const certificates = await prisma.certificate.findMany({
      where: { userId: session.user.id },
      include: {
        trail: {
          select: {
            title: true,
            slug: true,
            color: true,
            icon: true,
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    })

    return NextResponse.json(certificates)
  } catch (error) {
    console.error("Error fetching certificates:", error)
    return NextResponse.json({ error: "Ошибка получения сертификатов" }, { status: 500 })
  }
}

// POST - Generate a certificate for completed trail
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const body = await request.json()
    const { trailId } = body

    if (!trailId) {
      return NextResponse.json({ error: "Trail ID обязателен" }, { status: 400 })
    }

    // Check if certificate already exists
    const existingCert = await prisma.certificate.findUnique({
      where: {
        userId_trailId: {
          userId: session.user.id,
          trailId,
        },
      },
    })

    if (existingCert) {
      return NextResponse.json({ error: "Сертификат уже выдан" }, { status: 400 })
    }

    // Get trail with modules
    const trail = await prisma.trail.findUnique({
      where: { id: trailId },
      include: {
        modules: { select: { id: true } },
      },
    })

    if (!trail) {
      return NextResponse.json({ error: "Trail не найден" }, { status: 404 })
    }

    // Check if user completed all modules
    const completedModules = await prisma.moduleProgress.count({
      where: {
        userId: session.user.id,
        moduleId: { in: trail.modules.map((m) => m.id) },
        status: "COMPLETED",
      },
    })

    if (completedModules < trail.modules.length) {
      return NextResponse.json(
        { error: `Завершено ${completedModules} из ${trail.modules.length} модулей` },
        { status: 400 }
      )
    }

    // Get user's task progress to determine level
    const taskProgress = await prisma.taskProgress.findUnique({
      where: {
        userId_trailId: {
          userId: session.user.id,
          trailId,
        },
      },
    })

    let level = "Middle"
    if (taskProgress) {
      if (taskProgress.seniorStatus === "PASSED") {
        level = "Senior"
      } else if (taskProgress.middleStatus === "PASSED") {
        level = "Middle"
      } else if (taskProgress.juniorStatus === "PASSED") {
        level = "Junior"
      }
    }

    // Get user's current XP
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { totalXP: true },
    })

    // Generate unique code
    const code = `PROM-${crypto.randomBytes(4).toString("hex").toUpperCase()}`

    // Create certificate
    const certificate = await prisma.certificate.create({
      data: {
        userId: session.user.id,
        trailId,
        code,
        totalXP: user?.totalXP || 0,
        level,
      },
      include: {
        trail: {
          select: {
            title: true,
            slug: true,
            color: true,
            icon: true,
          },
        },
      },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "CERTIFICATE_ISSUED",
        title: "Сертификат получен!",
        message: `Поздравляем! Вы получили сертификат за прохождение "${trail.title}"`,
        link: "/certificates",
      },
    })

    // Check and award achievements (for FIRST_CERTIFICATE, etc.)
    await checkAndAwardAchievements(session.user.id)

    return NextResponse.json(certificate)
  } catch (error) {
    console.error("Error creating certificate:", error)
    return NextResponse.json({ error: "Ошибка создания сертификата" }, { status: 500 })
  }
}
