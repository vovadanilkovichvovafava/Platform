import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdminOrHR } from "@/lib/admin-access"

// Valid icon names from lucide-react used in navbar
const VALID_ICONS = [
  "Flame", "BookOpen", "ClipboardCheck", "Trophy", "Settings",
  "FolderKanban", "Shield", "BarChart3", "User", "Award",
  "Home", "Star", "Heart", "Bell", "Search", "Menu", "Plus",
  "Check", "X", "ArrowRight", "ExternalLink", "FileText",
  "Users", "Calendar", "Clock", "Target", "Zap", "Code",
  "Database", "Globe", "Lock", "Unlock", "Edit", "Trash",
  "GraduationCap", "History", "UserCheck", "BookMarked",
  "Layers", "PenTool", "Eye", "MessageSquare",
]

const VALID_ROLES = ["STUDENT", "TEACHER", "HR", "CO_ADMIN", "ADMIN"]

// Schema for navbar item
const navbarItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Label обязателен").max(50, "Label слишком длинный"),
  href: z.string().min(1, "Href обязателен").regex(/^\//, "Href должен начинаться с /"),
  icon: z.string().refine((val) => VALID_ICONS.includes(val), {
    message: `Иконка должна быть одной из: ${VALID_ICONS.slice(0, 10).join(", ")}...`,
  }),
  order: z.number().int().min(0),
  visibleTo: z.array(z.enum(["STUDENT", "TEACHER", "HR", "CO_ADMIN", "ADMIN"])).min(1, "Выберите хотя бы одну роль"),
})

// Schema for updating preset
const updatePresetSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(50, "Название слишком длинное"),
  items: z.array(navbarItemSchema).min(1, "Добавьте хотя бы один элемент"),
})

// DTO types
interface NavbarItemDTO {
  id: string
  label: string
  href: string
  icon: string
  order: number
  visibleTo: string[]
}

interface NavbarPresetDetailDTO {
  id: string
  name: string
  isActive: boolean
  items: NavbarItemDTO[]
  createdAt: string
  updatedAt: string
}

type RouteParams = { params: Promise<{ id: string }> }

// GET - Get single preset by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdminOrHR(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { id } = await params

    const preset = await prisma.navbarPreset.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isActive: true,
        adminId: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            label: true,
            href: true,
            icon: true,
            order: true,
            visibleTo: true,
          },
          orderBy: { order: "asc" },
        },
      },
    })

    if (!preset) {
      return NextResponse.json({ error: "Пресет не найден" }, { status: 404 })
    }

    // Verify ownership - admin can only access their own presets
    if (preset.adminId !== session.user.id) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const presetDTO: NavbarPresetDetailDTO = {
      id: preset.id,
      name: preset.name,
      isActive: preset.isActive,
      items: preset.items.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: item.icon,
        order: item.order,
        visibleTo: safeParseVisibleTo(item.visibleTo),
      })),
      createdAt: preset.createdAt.toISOString(),
      updatedAt: preset.updatedAt.toISOString(),
    }

    return NextResponse.json(presetDTO)
  } catch (error) {
    console.error("Error fetching navbar preset:", error)
    return NextResponse.json({ error: "Ошибка при получении пресета" }, { status: 500 })
  }
}

// PUT - Update preset
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdminOrHR(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updatePresetSchema.parse(body)

    // Check if preset exists and belongs to current admin
    const existingPreset = await prisma.navbarPreset.findUnique({
      where: { id },
      select: { id: true, adminId: true },
    })

    if (!existingPreset) {
      return NextResponse.json({ error: "Пресет не найден" }, { status: 404 })
    }

    if (existingPreset.adminId !== session.user.id) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Validate no duplicate hrefs
    const hrefs = data.items.map((i) => i.href)
    const uniqueHrefs = new Set(hrefs)
    if (hrefs.length !== uniqueHrefs.size) {
      return NextResponse.json({ error: "Duplicate href values are not allowed" }, { status: 400 })
    }

    // Validate no duplicate labels
    const labels = data.items.map((i) => i.label)
    const uniqueLabels = new Set(labels)
    if (labels.length !== uniqueLabels.size) {
      return NextResponse.json({ error: "Duplicate label values are not allowed" }, { status: 400 })
    }

    // Update preset: delete all items and recreate
    await prisma.$transaction(async (tx) => {
      // Delete existing items
      await tx.navbarItem.deleteMany({
        where: { presetId: id },
      })

      // Update preset name and create new items
      await tx.navbarPreset.update({
        where: { id },
        data: {
          name: data.name,
          items: {
            create: data.items.map((item, index) => ({
              label: item.label,
              href: item.href,
              icon: item.icon,
              order: item.order ?? index,
              visibleTo: JSON.stringify(item.visibleTo),
            })),
          },
        },
      })
    })

    // Fetch updated preset
    const updatedPreset = await prisma.navbarPreset.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            label: true,
            href: true,
            icon: true,
            order: true,
            visibleTo: true,
          },
          orderBy: { order: "asc" },
        },
      },
    })

    if (!updatedPreset) {
      return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 })
    }

    const presetDTO: NavbarPresetDetailDTO = {
      id: updatedPreset.id,
      name: updatedPreset.name,
      isActive: updatedPreset.isActive,
      items: updatedPreset.items.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: item.icon,
        order: item.order,
        visibleTo: safeParseVisibleTo(item.visibleTo),
      })),
      createdAt: updatedPreset.createdAt.toISOString(),
      updatedAt: updatedPreset.updatedAt.toISOString(),
    }

    return NextResponse.json(presetDTO)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error updating navbar preset:", error)
    return NextResponse.json({ error: "Ошибка при обновлении пресета" }, { status: 500 })
  }
}

// DELETE - Delete preset
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdminOrHR(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { id } = await params

    // Check if preset exists, belongs to admin, and is not active
    const preset = await prisma.navbarPreset.findUnique({
      where: { id },
      select: { id: true, isActive: true, adminId: true },
    })

    if (!preset) {
      return NextResponse.json({ error: "Пресет не найден" }, { status: 404 })
    }

    if (preset.adminId !== session.user.id) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    if (preset.isActive) {
      return NextResponse.json(
        { error: "Нельзя удалить активный пресет. Сначала активируйте другой пресет." },
        { status: 400 }
      )
    }

    // Delete preset (cascade deletes items)
    await prisma.navbarPreset.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting navbar preset:", error)
    return NextResponse.json({ error: "Ошибка при удалении пресета" }, { status: 500 })
  }
}

// PATCH - Activate preset
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdminOrHR(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { id } = await params

    // Check if preset exists and belongs to current admin
    const preset = await prisma.navbarPreset.findUnique({
      where: { id },
      select: { id: true, name: true, adminId: true },
    })

    if (!preset) {
      return NextResponse.json({ error: "Пресет не найден" }, { status: 404 })
    }

    if (preset.adminId !== session.user.id) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Deactivate only this admin's presets and activate selected one
    await prisma.$transaction([
      prisma.navbarPreset.updateMany({
        where: { isActive: true, adminId: session.user.id },
        data: { isActive: false },
      }),
      prisma.navbarPreset.update({
        where: { id },
        data: { isActive: true },
      }),
    ])

    return NextResponse.json({ success: true, message: `Пресет "${preset.name}" активирован` })
  } catch (error) {
    console.error("Error activating navbar preset:", error)
    return NextResponse.json({ error: "Ошибка при активации пресета" }, { status: 500 })
  }
}

// Safely parse visibleTo JSON string
function safeParseVisibleTo(visibleTo: string): string[] {
  try {
    const parsed = JSON.parse(visibleTo)
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string" && VALID_ROLES.includes(v))
    }
    return VALID_ROLES
  } catch {
    return VALID_ROLES
  }
}
