import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { FEATURE_FLAGS } from "@/lib/feature-flags"
import { isAnyAdmin } from "@/lib/admin-access"

// DTO type for navbar items - safe for client serialization
export interface NavbarItemDTO {
  id: string
  label: string
  href: string
  icon: string
  order: number
  visibleTo: string[] // parsed JSON array
}

export interface NavbarPresetDTO {
  id: string
  name: string
  items: NavbarItemDTO[]
}

// Default navbar items when no preset is active
const DEFAULT_NAVBAR_ITEMS: NavbarItemDTO[] = [
  { id: "default-1", label: "Dashboard", href: "/dashboard", icon: "Flame", order: 0, visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { id: "default-2", label: "Trails", href: "/trails", icon: "BookOpen", order: 1, visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { id: "default-3", label: "Мои работы", href: "/my-work", icon: "ClipboardCheck", order: 2, visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { id: "default-4", label: "Лидерборд", href: "/leaderboard", icon: "Trophy", order: 3, visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { id: "default-5", label: "Панель эксперта", href: "/teacher", icon: "Settings", order: 4, visibleTo: ["TEACHER", "CO_ADMIN", "ADMIN"] },
  { id: "default-6", label: "Контент", href: "/content", icon: "FolderKanban", order: 5, visibleTo: ["TEACHER", "CO_ADMIN", "ADMIN"] },
  { id: "default-7", label: "Админ панель", href: "/admin/invites", icon: "Shield", order: 6, visibleTo: ["CO_ADMIN", "ADMIN"] },
  { id: "default-8", label: "Аналитика", href: "/admin/analytics", icon: "BarChart3", order: 7, visibleTo: ["CO_ADMIN", "ADMIN"] },
]

// Filter out items disabled by feature flags
function filterDisabledNavItems<T extends { href: string }>(items: T[]): T[] {
  return items.filter(
    (item) => item.href !== "/leaderboard" || FEATURE_FLAGS.LEADERBOARD_ENABLED
  )
}

// GET - Get active navbar preset (for any authenticated user)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Only admins have personal presets; non-admins always see defaults
    if (!isAnyAdmin(session.user.role)) {
      const defaultPreset: NavbarPresetDTO = {
        id: "default",
        name: "Default",
        items: filterDisabledNavItems(DEFAULT_NAVBAR_ITEMS),
      }
      return NextResponse.json(defaultPreset)
    }

    // Find admin's own active preset
    const activePreset = await prisma.navbarPreset.findFirst({
      where: { isActive: true, adminId: session.user.id },
      select: {
        id: true,
        name: true,
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

    // If no active preset, return default
    if (!activePreset) {
      const defaultPreset: NavbarPresetDTO = {
        id: "default",
        name: "Default",
        items: filterDisabledNavItems(DEFAULT_NAVBAR_ITEMS),
      }
      return NextResponse.json(defaultPreset)
    }

    // Transform to DTO - parse visibleTo JSON string to array
    const presetDTO: NavbarPresetDTO = {
      id: activePreset.id,
      name: activePreset.name,
      items: filterDisabledNavItems(activePreset.items.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: item.icon,
        order: item.order,
        visibleTo: safeParseVisibleTo(item.visibleTo),
      }))),
    }

    return NextResponse.json(presetDTO)
  } catch (error) {
    console.error("Error fetching navbar preset:", error)
    return NextResponse.json({ error: "Ошибка при получении настроек navbar" }, { status: 500 })
  }
}

// Safely parse visibleTo JSON string
function safeParseVisibleTo(visibleTo: string): string[] {
  try {
    const parsed = JSON.parse(visibleTo)
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string")
    }
    return ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"]
  } catch {
    return ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"]
  }
}
