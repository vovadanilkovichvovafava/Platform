import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin } from "@/lib/admin-access"

const createInviteSchema = z.object({
  code: z.string().min(3, "Код должен быть минимум 3 символа").toUpperCase(),
  email: z.string().email().optional().or(z.literal("")),
  maxUses: z.number().min(1).default(1),
  expiresAt: z.string().optional(),
})

// GET - List all invites (ADMIN and CO_ADMIN)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const invites = await prisma.invite.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
      },
    })

    return NextResponse.json(invites)
  } catch (error) {
    console.error("Error fetching invites:", error)
    return NextResponse.json({ error: "Ошибка при получении приглашений" }, { status: 500 })
  }
}

// POST - Create new invite (ADMIN and CO_ADMIN)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const data = createInviteSchema.parse(body)

    // Check if code already exists
    const existingInvite = await prisma.invite.findUnique({
      where: { code: data.code },
    })

    if (existingInvite) {
      return NextResponse.json({ error: "Такой код уже существует" }, { status: 400 })
    }

    const invite = await prisma.invite.create({
      data: {
        code: data.code,
        email: data.email || null,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdById: session.user.id,
      },
    })

    return NextResponse.json(invite)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error creating invite:", error)
    return NextResponse.json({ error: "Ошибка при создании приглашения" }, { status: 500 })
  }
}

// DELETE - Delete invite (ADMIN and CO_ADMIN)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID не указан" }, { status: 400 })
    }

    await prisma.invite.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invite:", error)
    return NextResponse.json({ error: "Ошибка при удалении приглашения" }, { status: 500 })
  }
}
