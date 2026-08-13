import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkAndAwardAchievements } from "@/lib/check-achievements"

// POST - Sync achievements for all users
export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Only admins can sync achievements
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Get all students
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true },
    })

    const results: { userId: string; name: string; awarded: string[] }[] = []

    // Check achievements for each student
    for (const student of students) {
      const awarded = await checkAndAwardAchievements(student.id)
      if (awarded.length > 0) {
        results.push({
          userId: student.id,
          name: student.name,
          awarded,
        })
      }
    }

    const totalAwarded = results.reduce((sum, r) => sum + r.awarded.length, 0)

    return NextResponse.json({
      message: `Синхронизация завершена`,
      usersProcessed: students.length,
      usersWithNewAchievements: results.length,
      totalAchievementsAwarded: totalAwarded,
      details: results,
    })
  } catch (error) {
    console.error("Sync achievements error:", error)
    return NextResponse.json(
      { error: "Ошибка синхронизации достижений" },
      { status: 500 }
    )
  }
}
