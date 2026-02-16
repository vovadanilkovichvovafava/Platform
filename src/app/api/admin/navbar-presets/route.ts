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

// Valid roles for visibility
const VALID_ROLES = ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"]

// Schema for navbar item
const navbarItemSchema = z.object({
  id: z.string().optional(), // optional for new items
  label: z.string().min(1, "Label обязателен").max(50, "Label слишком длинный"),
  href: z.string().min(1, "Href обязателен").regex(/^\//, "Href должен начинаться с /"),
  icon: z.string().refine((val) => VALID_ICONS.includes(val), {
    message: `Иконка должна быть одной из: ${VALID_ICONS.slice(0, 10).join(", ")}...`,
  }),
  order: z.number().int().min(0),
  visibleTo: z.array(z.enum(["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"])).min(1, "Выберите хотя бы одну роль"),
})

// Schema for creating/updating preset
const presetSchema = z.object({
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

interface NavbarPresetListDTO {
  id: string
  name: string
  isActive: boolean
  itemsCount: number
  createdAt: string // ISO string
  updatedAt: string // ISO string
}

interface NavbarPresetDetailDTO {
  id: string
  name: string
  isActive: boolean
  items: NavbarItemDTO[]
  createdAt: string
  updatedAt: string
}

// GET - List all presets (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdminOrHR(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const presets = await prisma.navbarPreset.findMany({
      where: { adminId: session.user.id },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { items: true },
        },
      },
      orderBy: [
        { isActive: "desc" }, // Active first
        { updatedAt: "desc" },
      ],
    })

    // Transform to DTO with serialized dates
    const presetsDTO: NavbarPresetListDTO[] = presets.map((p) => ({
      id: p.id,
      name: p.name,
      isActive: p.isActive,
      itemsCount: p._count.items,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))

    return NextResponse.json(presetsDTO)
  } catch (error) {
    console.error("Error fetching navbar presets:", error)
    return NextResponse.json({ error: "Ошибка при получении пресетов" }, { status: 500 })
  }
}

// POST - Create new preset (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdminOrHR(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const data = presetSchema.parse(body)

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

    // Create preset with items (owned by current admin)
    const preset = await prisma.navbarPreset.create({
      data: {
        name: data.name,
        isActive: false, // New presets are not active by default
        adminId: session.user.id,
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

    // Transform to DTO
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error creating navbar preset:", error)
    return NextResponse.json({ error: "Ошибка при создании пресета" }, { status: 500 })
  }
}

// PATCH - Deactivate all presets (switch to default)
export async function PATCH() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdminOrHR(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Deactivate all presets belonging to this admin
    await prisma.navbarPreset.updateMany({
      where: { isActive: true, adminId: session.user.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: "Все пресеты деактивированы" })
  } catch (error) {
    console.error("Error deactivating navbar presets:", error)
    return NextResponse.json({ error: "Ошибка при деактивации пресетов" }, { status: 500 })
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
