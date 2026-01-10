import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Get top 50 students by XP
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { totalXP: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        totalXP: true,
        currentStreak: true,
        avatarUrl: true,
        _count: {
          select: {
            moduleProgress: {
              where: { status: "COMPLETED" },
            },
            certificates: true,
          },
        },
      },
    })

    // Add rank
    const leaderboard = students.map((student, index) => ({
      rank: index + 1,
      id: student.id,
      name: student.name,
      totalXP: student.totalXP,
      streak: student.currentStreak,
      avatarUrl: student.avatarUrl,
      modulesCompleted: student._count.moduleProgress,
      certificates: student._count.certificates,
    }))

    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error("Leaderboard error:", error)
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 })
  }
}
