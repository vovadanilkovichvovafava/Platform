import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ACHIEVEMENTS, getAchievement } from "@/lib/achievements"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    // Only ADMIN and CO_ADMIN can grant achievements
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "CO_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get user's existing achievements
    const existingAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    })
    const existingIds = new Set(existingAchievements.map((a) => a.achievementId))

    // Get all possible achievements that user doesn't have
    const allAchievementIds = Object.keys(ACHIEVEMENTS)
    const availableAchievements = allAchievementIds.filter((id) => !existingIds.has(id))

    if (availableAchievements.length === 0) {
      return NextResponse.json({
        error: "User already has all achievements",
        message: "Пользователь уже имеет все достижения",
      }, { status: 400 })
    }

    // Pick a random achievement
    const randomIndex = Math.floor(Math.random() * availableAchievements.length)
    const randomAchievementId = availableAchievements[randomIndex]
    const achievementDef = getAchievement(randomAchievementId)

    if (!achievementDef) {
      return NextResponse.json({ error: "Achievement definition not found" }, { status: 500 })
    }

    // Grant the achievement
    await prisma.userAchievement.create({
      data: {
        userId,
        achievementId: randomAchievementId,
      },
    })

    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId,
        type: "ACHIEVEMENT_EARNED",
        title: `Достижение: ${achievementDef.name}`,
        message: achievementDef.description,
        link: "/profile",
      },
    })

    return NextResponse.json({
      success: true,
      achievement: {
        id: achievementDef.id,
        name: achievementDef.name,
        description: achievementDef.description,
        rarity: achievementDef.rarity,
      },
      userName: user.name,
    })
  } catch (error) {
    console.error("Grant random achievement error:", error)
    return NextResponse.json({ error: "Failed to grant achievement" }, { status: 500 })
  }
}
