import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Check if exporting for a specific student
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    // Get students with their submissions and details
    const students = await prisma.user.findMany({
      where: studentId
        ? { id: studentId, role: "STUDENT" }
        : { role: "STUDENT" },
      orderBy: { name: "asc" },
      include: {
        enrollments: {
          include: {
            trail: {
              select: { title: true },
            },
          },
        },
        submissions: {
          orderBy: { createdAt: "desc" },
          include: {
            module: {
              include: {
                trail: { select: { title: true } },
              },
            },
            review: {
              select: {
                score: true,
                comment: true,
                createdAt: true,
                reviewer: { select: { name: true } },
              },
            },
          },
        },
        moduleProgress: {
          where: { status: "COMPLETED" },
        },
        _count: {
          select: {
            activityDays: true,
          },
        },
      },
    })

    // Build CSV with detailed submissions per student
    const headers = [
      "Ученик",
      "Email",
      "Trail",
      "Модуль",
      "Статус",
      "Оценка",
      "Комментарий",
      "Дата отправки",
      "Дата проверки",
      "Проверяющий",
      "XP ученика",
      "Дней активности",
      "Модулей пройдено",
    ]

    const rows: (string | number)[][] = []

    for (const student of students) {
      if (student.submissions.length === 0) {
        // Student without submissions - add one row with basic info
        rows.push([
          student.name,
          student.email,
          student.enrollments.map((e) => e.trail.title).join("; ") || "-",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-",
          student.totalXP,
          student._count.activityDays,
          student.moduleProgress.length,
        ])
      } else {
        // Add row for each submission
        for (const submission of student.submissions) {
          const statusMap: Record<string, string> = {
            PENDING: "Ожидает проверки",
            APPROVED: "Принято",
            REVISION: "На доработку",
            FAILED: "Провал",
          }

          rows.push([
            student.name,
            student.email,
            submission.module.trail.title,
            submission.module.title,
            statusMap[submission.status] || submission.status,
            submission.review?.score ? `${submission.review.score}/10` : "-",
            submission.review?.comment || "-",
            new Date(submission.createdAt).toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            submission.review?.createdAt
              ? new Date(submission.review.createdAt).toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-",
            submission.review?.reviewer?.name || "-",
            student.totalXP,
            student._count.activityDays,
            student.moduleProgress.length,
          ])
        }
      }
    }

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""').replace(/\n/g, " ")}"`).join(",")
      ),
    ].join("\n")

    // Add BOM for Excel UTF-8 support
    const bom = "\uFEFF"
    const csvWithBom = bom + csvContent

    return new NextResponse(csvWithBom, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="students-works-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error exporting stats:", error)
    return NextResponse.json({ error: "Ошибка экспорта" }, { status: 500 })
  }
}
