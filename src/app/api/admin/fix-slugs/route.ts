import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

// Check if slug contains non-ASCII characters (Cyrillic, etc.)
function hasCyrillicOrNonAscii(slug: string): boolean {
  return /[^\x00-\x7F]/.test(slug)
}

// GET - Preview which slugs would be fixed
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Только админ" }, { status: 403 })
    }

    // Find all modules with Cyrillic/non-ASCII in slug
    const modules = await prisma.module.findMany({
      select: { id: true, title: true, slug: true },
    })

    const trails = await prisma.trail.findMany({
      select: { id: true, title: true, slug: true },
    })

    const brokenModules = modules.filter(m => hasCyrillicOrNonAscii(m.slug))
    const brokenTrails = trails.filter(t => hasCyrillicOrNonAscii(t.slug))

    return NextResponse.json({
      preview: true,
      brokenModules: brokenModules.map(m => ({
        id: m.id,
        title: m.title,
        currentSlug: m.slug,
        newSlug: `${generateSlug(m.title)}-${Date.now()}`,
      })),
      brokenTrails: brokenTrails.map(t => ({
        id: t.id,
        title: t.title,
        currentSlug: t.slug,
        newSlug: generateSlug(t.title),
      })),
      summary: {
        modulesToFix: brokenModules.length,
        trailsToFix: brokenTrails.length,
      },
    })
  } catch (error) {
    console.error("Error checking slugs:", error)
    return NextResponse.json({ error: "Ошибка проверки" }, { status: 500 })
  }
}

// POST - Fix all broken slugs
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Только админ" }, { status: 403 })
    }

    const fixedModules: { id: string; oldSlug: string; newSlug: string }[] = []
    const fixedTrails: { id: string; oldSlug: string; newSlug: string }[] = []
    const errors: string[] = []

    // Fix modules
    const modules = await prisma.module.findMany({
      select: { id: true, title: true, slug: true },
    })

    for (const m of modules) {
      if (hasCyrillicOrNonAscii(m.slug)) {
        const newSlug = `${generateSlug(m.title)}-${Date.now()}`
        try {
          await prisma.module.update({
            where: { id: m.id },
            data: { slug: newSlug },
          })
          fixedModules.push({ id: m.id, oldSlug: m.slug, newSlug })
        } catch (e) {
          errors.push(`Module ${m.id}: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
      }
    }

    // Fix trails
    const trails = await prisma.trail.findMany({
      select: { id: true, title: true, slug: true },
    })

    for (const t of trails) {
      if (hasCyrillicOrNonAscii(t.slug)) {
        const baseSlug = generateSlug(t.title)
        // Check if slug already exists
        const existing = await prisma.trail.findFirst({
          where: { slug: baseSlug, id: { not: t.id } },
        })
        const newSlug = existing ? `${baseSlug}-${Date.now()}` : baseSlug

        try {
          await prisma.trail.update({
            where: { id: t.id },
            data: { slug: newSlug },
          })
          fixedTrails.push({ id: t.id, oldSlug: t.slug, newSlug })
        } catch (e) {
          errors.push(`Trail ${t.id}: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      fixedModules,
      fixedTrails,
      errors,
      summary: {
        modulesFixed: fixedModules.length,
        trailsFixed: fixedTrails.length,
        errorsCount: errors.length,
      },
    })
  } catch (error) {
    console.error("Error fixing slugs:", error)
    return NextResponse.json({ error: "Ошибка исправления" }, { status: 500 })
  }
}
