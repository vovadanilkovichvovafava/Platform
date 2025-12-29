import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

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

    if (!session?.user?.id || session.user.role !== "ADMIN") {
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

// POST - Create new trail
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const data = trailSchema.parse(body)

    // Generate slug from title
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-|-$/g, "")

    // Get max order
    const maxOrder = await prisma.trail.aggregate({
      _max: { order: true },
    })

    const trail = await prisma.trail.create({
      data: {
        ...data,
        slug,
        order: (maxOrder._max.order || 0) + 1,
      },
    })

    return NextResponse.json(trail)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error creating trail:", error)
    return NextResponse.json({ error: "Ошибка при создании trail" }, { status: 500 })
  }
}
