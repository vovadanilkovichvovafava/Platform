import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import fs from "fs"
import path from "path"

interface MarketingModule {
  id: number
  title: string
  description: string
  type: string
  content?: string
  theory?: string
  practice?: string
}

interface MarketingCourse {
  course: {
    slug: string
    title: string
    description: string
    icon: string
    totalModules: number
  }
  modules: MarketingModule[]
}

// GET - Check existing Marketing trail
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Только админ" }, { status: 403 })
    }

    const trail = await prisma.trail.findFirst({
      where: {
        OR: [
          { title: { contains: "маркетинг", mode: "insensitive" } },
          { title: { contains: "Marketing", mode: "insensitive" } },
          { slug: { contains: "marketing" } },
        ],
      },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: { questions: true },
        },
      },
    })

    return NextResponse.json({
      found: !!trail,
      trail: trail ? {
        id: trail.id,
        title: trail.title,
        slug: trail.slug,
        modulesCount: trail.modules.length,
        modules: trail.modules.map((m) => ({
          id: m.id,
          title: m.title,
          type: m.type,
          order: m.order,
        })),
      } : null,
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Ошибка" }, { status: 500 })
  }
}

// POST - Create new Marketing trail with all modules
export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Только админ" }, { status: 403 })
    }

    // Read marketing course data from JSON file
    const jsonPath = path.join(process.cwd(), "marketing-course.json")

    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ error: "Файл marketing-course.json не найден" }, { status: 404 })
    }

    const courseData: MarketingCourse = JSON.parse(fs.readFileSync(jsonPath, "utf-8"))

    // Check if trail already exists
    const existingTrail = await prisma.trail.findFirst({
      where: {
        OR: [
          { slug: "marketing" },
          { title: { contains: "маркетинг", mode: "insensitive" } },
        ],
      },
    })

    if (existingTrail) {
      return NextResponse.json({
        error: "Trail маркетинга уже существует",
        trailId: existingTrail.id
      }, { status: 400 })
    }

    // Create new trail
    const trail = await prisma.trail.create({
      data: {
        slug: "marketing",
        title: "Digital Marketing",
        subtitle: "Маркетинг для фармеров",
        description: courseData.course.description,
        icon: "Target",
        color: "#8B5CF6", // Purple
        duration: "8 недель",
        isPublished: true,
      },
    })

    const results: string[] = []

    // Create modules
    for (const mod of courseData.modules) {
      // Build content from theory + practice or just content
      let moduleContent = ""
      if (mod.type === "intro" && mod.content) {
        moduleContent = mod.content
      } else if (mod.theory && mod.practice) {
        moduleContent = `${mod.theory}\n\n---\n\n${mod.practice}`
      }

      // Determine module type based on the module structure
      let moduleType: "THEORY" | "PRACTICE" | "PROJECT" = "THEORY"
      if (mod.type === "intro") {
        moduleType = "THEORY"
      } else if (mod.practice) {
        moduleType = "PRACTICE"
      }

      // Generate slug
      const slug = `marketing-${mod.id}-${mod.title
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]+/gi, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 30)}`

      await prisma.module.create({
        data: {
          trailId: trail.id,
          slug,
          title: mod.title,
          description: mod.description,
          content: moduleContent,
          type: moduleType,
          level: "Middle",
          points: mod.id === 0 ? 50 : 100, // Intro module has fewer points
          duration: mod.id === 0 ? "15 мин" : "2-3 часа",
          order: mod.id,
        },
      })

      results.push(`✅ Создан модуль ${mod.id}: ${mod.title}`)
    }

    return NextResponse.json({
      success: true,
      trailId: trail.id,
      trailSlug: trail.slug,
      modulesCreated: courseData.modules.length,
      results,
    })
  } catch (error) {
    console.error("Error creating marketing trail:", error)
    return NextResponse.json({
      error: "Ошибка создания trail",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// DELETE - Remove Marketing trail (for testing)
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Только админ" }, { status: 403 })
    }

    const trail = await prisma.trail.findFirst({
      where: {
        OR: [
          { slug: "marketing" },
          { title: { contains: "маркетинг", mode: "insensitive" } },
        ],
      },
    })

    if (!trail) {
      return NextResponse.json({ error: "Trail не найден" }, { status: 404 })
    }

    // Delete all related data
    await prisma.question.deleteMany({
      where: { module: { trailId: trail.id } },
    })
    await prisma.moduleProgress.deleteMany({
      where: { module: { trailId: trail.id } },
    })
    await prisma.submission.deleteMany({
      where: { module: { trailId: trail.id } },
    })
    await prisma.module.deleteMany({
      where: { trailId: trail.id },
    })
    await prisma.enrollment.deleteMany({
      where: { trailId: trail.id },
    })
    await prisma.trailTeacher.deleteMany({
      where: { trailId: trail.id },
    })
    await prisma.taskProgress.deleteMany({
      where: { trailId: trail.id },
    })
    await prisma.trail.delete({
      where: { id: trail.id },
    })

    return NextResponse.json({ success: true, deleted: trail.title })
  } catch (error) {
    console.error("Error deleting marketing trail:", error)
    return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 })
  }
}
