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
    .slice(0, 50)
}

const trailSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().default(""),
  description: z.string().default(""),
  icon: z.string().default("Code"),
  color: z.string().default("#6366f1"),
  duration: z.string().default(""),
  isPublished: z.boolean().default(true),
})

// GET - List all trails with modules
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const trails = await prisma.trail.findMany({
      orderBy: { order: "asc" },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            _count: {
              select: { questions: true },
            },
          },
        },
      },
    })

    return NextResponse.json(trails)
  } catch (error) {
    console.error("Error fetching trails:", error)
    return NextResponse.json({ error: "Ошибка при получении trails" }, { status: 500 })
  }
}

// POST - Create new trail (Admin or Teacher - teacher gets auto-assigned)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const data = trailSchema.parse(body)

    // Generate slug from title (transliterate Cyrillic to Latin)
    const slug = generateSlug(data.title)

    // Get max order
    const maxOrder = await prisma.trail.aggregate({
      _max: { order: true },
    })

    // New trails are restricted by default
    const trail = await prisma.trail.create({
      data: {
        ...data,
        slug,
        order: (maxOrder._max.order || 0) + 1,
        isRestricted: true, // By default, trails are restricted
      },
    })

    // If teacher creates trail, automatically assign them to it
    if (session.user.role === "TEACHER") {
      await prisma.trailTeacher.create({
        data: {
          trailId: trail.id,
          teacherId: session.user.id,
        },
      })
    }

    return NextResponse.json(trail)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error creating trail:", error)
    return NextResponse.json({ error: "Ошибка при создании trail" }, { status: 500 })
  }
}
