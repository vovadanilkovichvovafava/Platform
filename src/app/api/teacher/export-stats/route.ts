import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Get all students with their stats
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { totalXP: "desc" },
      include: {
        enrollments: {
          include: {
            trail: {
              select: { title: true },
            },
          },
        },
        moduleProgress: {
          where: { status: "COMPLETED" },
        },
        _count: {
          select: {
            submissions: true,
            activityDays: true,
          },
        },
      },
    })

    // Get submission stats per student
    const submissionStats = await prisma.submission.groupBy({
      by: ["userId", "status"],
      _count: true,
    })

    const getStudentStats = (userId: string) => {
      const stats = submissionStats.filter((s) => s.userId === userId)
      return {
        pending: stats.find((s) => s.status === "PENDING")?._count || 0,
        approved: stats.find((s) => s.status === "APPROVED")?._count || 0,
        revision: stats.find((s) => s.status === "REVISION")?._count || 0,
        failed: stats.find((s) => s.status === "FAILED")?._count || 0,
      }
    }

    // Build CSV
    const headers = [
      "Имя",
      "Email",
      "Trails",
      "XP",
      "Модулей пройдено",
      "Дней активности",
      "Работ сдано",
      "Принято",
      "Ожидает",
      "На доработку",
      "Провал",
      "Дата регистрации",
    ]

    const rows = students.map((student) => {
      const stats = getStudentStats(student.id)
      return [
        student.name,
        student.email,
        student.enrollments.map((e) => e.trail.title).join("; "),
        student.totalXP,
        student.moduleProgress.length,
        student._count.activityDays,
        student._count.submissions,
        stats.approved,
        stats.pending,
        stats.revision,
        stats.failed,
        new Date(student.createdAt).toLocaleDateString("ru-RU"),
      ]
    })

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")

    // Add BOM for Excel UTF-8 support
    const bom = "\uFEFF"
    const csvWithBom = bom + csvContent

    return new NextResponse(csvWithBom, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="students-stats-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error exporting stats:", error)
    return NextResponse.json({ error: "Ошибка экспорта" }, { status: 500 })
  }
}
