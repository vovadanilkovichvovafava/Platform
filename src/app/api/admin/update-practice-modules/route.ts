import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Обновляет модули Digital Marketing чтобы требовали отправку файла
// GET для удобства вызова из браузера
export async function GET() {
  return POST()
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Только для админов" }, { status: 403 })
    }

    // Обновляем ВСЕ модули Digital Marketing (кроме проектов - у них своя форма)
    const result = await prisma.module.updateMany({
      where: {
        slug: {
          in: [
            "marketing-intro",      // Теория с заданиями
            "marketing-audience",   // Практика
            "marketing-copywriting" // Практика
          ]
        },
        type: { not: "PROJECT" }
      },
      data: {
        requiresSubmission: true
      }
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
      message: `Обновлено ${result.count} модулей`
    })
  } catch (error) {
    console.error("Update error:", error)
    return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 })
  }
}
