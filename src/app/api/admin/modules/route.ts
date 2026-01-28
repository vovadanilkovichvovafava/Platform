import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Transliterate Cyrillic to Latin for URL-safe slugs
const translitMap: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
}

function transliterate(str: string): string {
  return str.toLowerCase().split('').map(char => translitMap[char] || char).join('')
}

function generateSlug(title: string): string {
  return transliterate(title)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) // Limit slug length
}

const moduleSchema = z.object({
  trailId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  content: z.string().default(""),
  requirements: z.string().default(""),
  type: z.enum(["THEORY", "PRACTICE", "PROJECT"]).default("THEORY"),
  level: z.enum(["Beginner", "Intermediate", "Junior", "Middle", "Senior"]).default("Beginner"),
  points: z.number().min(0, "Баллы не могут быть отрицательными").default(50),
  duration: z.string().default("15 мин"),
})

// Helper to check if teacher is assigned to trail
async function isTeacherAssignedToTrail(teacherId: string, trailId: string): Promise<boolean> {
  const assignment = await prisma.trailTeacher.findUnique({
    where: {
      trailId_teacherId: { trailId, teacherId },
    },
  })
  return !!assignment
}

// POST - Create new module (Admin: any trail, Teacher: only assigned trails)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const data = moduleSchema.parse(body)

    // Teachers can only create modules in trails they are assigned to
    if (session.user.role === "TEACHER") {
      const isAssigned = await isTeacherAssignedToTrail(session.user.id, data.trailId)
      if (!isAssigned) {
        return NextResponse.json({ error: "Вы не назначены на этот trail" }, { status: 403 })
      }
    }

    // Generate slug from title (transliterate Cyrillic to Latin)
    const slug = generateSlug(data.title)

    // Get max order for this trail
    const maxOrder = await prisma.module.aggregate({
      where: { trailId: data.trailId },
      _max: { order: true },
    })

    const createdModule = await prisma.module.create({
      data: {
        ...data,
        slug: `${slug}-${Date.now()}`, // Ensure unique slug
        order: (maxOrder._max.order || 0) + 1,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        action: "CREATE",
        entityType: "MODULE",
        entityId: createdModule.id,
        entityName: createdModule.title,
      },
    })

    return NextResponse.json(createdModule)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error creating module:", error)
    return NextResponse.json({ error: "Ошибка при создании модуля" }, { status: 500 })
  }
}
