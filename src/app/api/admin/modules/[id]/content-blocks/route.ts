import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin, isAdmin, adminHasTrailAccess } from "@/lib/admin-access"
import { guardTrailPassword } from "@/lib/trail-password"

const contentBlockSchema = z.object({
  type: z.enum(["VIDEO", "AUDIO", "TEXT"]),
  url: z.string().optional().nullable(),
  fileKey: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  mimeType: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  order: z.number().default(0),
})

const bulkSaveSchema = z.object({
  blocks: z.array(
    z.object({
      id: z.string().optional(),
      type: z.enum(["VIDEO", "AUDIO", "TEXT"]),
      url: z.string().optional().nullable(),
      fileKey: z.string().optional().nullable(),
      fileName: z.string().optional().nullable(),
      fileSize: z.number().optional().nullable(),
      mimeType: z.string().optional().nullable(),
      title: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      content: z.string().optional().nullable(),
      order: z.number().default(0),
    })
  ),
})

interface Props {
  params: Promise<{ id: string }>
}

// GET - Get all content blocks for a module
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id: moduleId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const courseModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { trailId: true },
    })

    if (!courseModule) {
      return NextResponse.json({ error: "Модуль не найден" }, { status: 404 })
    }

    const blocks = await prisma.moduleContentBlock.findMany({
      where: { moduleId },
      orderBy: { order: "asc" },
    })

    return NextResponse.json(blocks)
  } catch (error) {
    console.error("Error fetching content blocks:", error)
    return NextResponse.json({ error: "Ошибка при получении блоков контента" }, { status: 500 })
  }
}

// PUT - Bulk save content blocks (replace all blocks for a module)
export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const { id: moduleId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const courseModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { trailId: true },
    })

    if (!courseModule) {
      return NextResponse.json({ error: "Модуль не найден" }, { status: 404 })
    }

    // Check access based on role
    if (session.user.role === "CO_ADMIN") {
      const hasAccess = await adminHasTrailAccess(session.user.id, session.user.role, courseModule.trailId)
      if (!hasAccess) {
        return NextResponse.json({ error: "Доступ к этому trail запрещён" }, { status: 403 })
      }
    }

    // Password check
    const passwordGuard = await guardTrailPassword(courseModule.trailId, session.user.id)
    if (passwordGuard.denied) {
      return NextResponse.json(
        { error: "Для редактирования модулей этого trail необходимо ввести пароль", passwordRequired: true },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { blocks } = bulkSaveSchema.parse(body)

    // Delete all existing blocks and recreate
    await prisma.moduleContentBlock.deleteMany({
      where: { moduleId },
    })

    // Create new blocks
    const createdBlocks = []
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      const created = await prisma.moduleContentBlock.create({
        data: {
          moduleId,
          type: block.type,
          url: block.url || null,
          fileKey: block.fileKey || null,
          fileName: block.fileName || null,
          fileSize: block.fileSize || null,
          mimeType: block.mimeType || null,
          title: block.title || null,
          description: block.description || null,
          content: block.content || null,
          order: i,
        },
      })
      createdBlocks.push(created)
    }

    // Also update Module.content with the first TEXT block's content for backward compatibility
    const firstTextBlock = blocks.find((b) => b.type === "TEXT")
    if (firstTextBlock) {
      await prisma.module.update({
        where: { id: moduleId },
        data: { content: firstTextBlock.content || "" },
      })
    }

    return NextResponse.json(createdBlocks)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error saving content blocks:", error)
    return NextResponse.json({ error: "Ошибка при сохранении блоков контента" }, { status: 500 })
  }
}

// POST - Add a single content block
export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { id: moduleId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const courseModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { trailId: true },
    })

    if (!courseModule) {
      return NextResponse.json({ error: "Модуль не найден" }, { status: 404 })
    }

    if (session.user.role === "CO_ADMIN") {
      const hasAccess = await adminHasTrailAccess(session.user.id, session.user.role, courseModule.trailId)
      if (!hasAccess) {
        return NextResponse.json({ error: "Доступ к этому trail запрещён" }, { status: 403 })
      }
    }

    const passwordGuard = await guardTrailPassword(courseModule.trailId, session.user.id)
    if (passwordGuard.denied) {
      return NextResponse.json(
        { error: "Для редактирования модулей этого trail необходимо ввести пароль", passwordRequired: true },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = contentBlockSchema.parse(body)

    // Get max order
    const maxOrder = await prisma.moduleContentBlock.aggregate({
      where: { moduleId },
      _max: { order: true },
    })

    const block = await prisma.moduleContentBlock.create({
      data: {
        moduleId,
        type: data.type,
        url: data.url || null,
        fileKey: data.fileKey || null,
        fileName: data.fileName || null,
        fileSize: data.fileSize || null,
        mimeType: data.mimeType || null,
        title: data.title || null,
        description: data.description || null,
        content: data.content || null,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    })

    return NextResponse.json(block)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error creating content block:", error)
    return NextResponse.json({ error: "Ошибка при создании блока контента" }, { status: 500 })
  }
}
