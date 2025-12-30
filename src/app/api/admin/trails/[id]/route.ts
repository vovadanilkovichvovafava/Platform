import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const trailUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  duration: z.string().optional(),
  isPublished: z.boolean().optional(),
})

interface Props {
  params: Promise<{ id: string }>
}

// GET - Get single trail
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const trail = await prisma.trail.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    })

    if (!trail) {
      return NextResponse.json({ error: "Trail не найден" }, { status: 404 })
    }

    return NextResponse.json(trail)
  } catch (error) {
    console.error("Error fetching trail:", error)
    return NextResponse.json({ error: "Ошибка при получении trail" }, { status: 500 })
  }
}

// PATCH - Update trail
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const data = trailUpdateSchema.parse(body)

    const trail = await prisma.trail.update({
      where: { id },
      data,
    })

    return NextResponse.json(trail)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error updating trail:", error)
    return NextResponse.json({ error: "Ошибка при обновлении trail" }, { status: 500 })
  }
}

// DELETE - Delete trail
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    await prisma.trail.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting trail:", error)
    return NextResponse.json({ error: "Ошибка при удалении trail" }, { status: 500 })
  }
}
