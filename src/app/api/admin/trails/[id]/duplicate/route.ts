import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAnyAdmin } from "@/lib/admin-access"

// Determine the next version number for a duplicated trail slug
async function getNextVersion(baseSlug: string): Promise<number> {
  const existing = await prisma.trail.findMany({
    where: { slug: { startsWith: `${baseSlug}_ver_` } },
    select: { slug: true },
  })

  let maxVer = 0
  for (const t of existing) {
    const match = t.slug.match(/_ver_(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxVer) maxVer = num
    }
  }
  return maxVer + 1
}

// Determine the next copy number for a duplicated trail title
async function getNextCopyNumber(baseTitle: string): Promise<number> {
  const existing = await prisma.trail.findMany({
    where: { title: { startsWith: baseTitle } },
    select: { title: true },
  })

  let maxNum = 0
  for (const t of existing) {
    const match = t.title.match(/\(копия (\d+)\)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNum) maxNum = num
    }
  }
  return maxNum + 1
}

// Strip existing copy suffix from title to get the base title
function getBaseTitle(title: string): string {
  return title.replace(/\s*\(копия \d+\)$/, "")
}

// Strip existing version suffix from slug to get the base slug
function getBaseSlug(slug: string): string {
  return slug.replace(/_ver_\d+$/, "")
}

// POST - Duplicate trail with deep copy of modules, units, questions, content blocks
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { id } = await params

    // Fetch the original trail with all nested content
    const original = await prisma.trail.findUnique({
      where: { id },
      select: {
        slug: true,
        title: true,
        subtitle: true,
        description: true,
        icon: true,
        color: true,
        duration: true,
        isPublished: true,
        isRestricted: true,
        allowSkipReview: true,
        teacherVisibility: true,
        modules: {
          select: {
            slug: true,
            title: true,
            description: true,
            type: true,
            level: true,
            points: true,
            duration: true,
            content: true,
            requirements: true,
            requiresSubmission: true,
            order: true,
            units: {
              select: {
                title: true,
                content: true,
                duration: true,
                points: true,
                isChallenge: true,
                order: true,
              },
            },
            questions: {
              select: {
                type: true,
                question: true,
                options: true,
                correctAnswer: true,
                data: true,
                order: true,
              },
            },
            contentBlocks: {
              select: {
                type: true,
                url: true,
                fileKey: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                title: true,
                description: true,
                content: true,
                order: true,
              },
            },
          },
        },
      },
    })

    if (!original) {
      return NextResponse.json({ error: "Trail не найден" }, { status: 404 })
    }

    // Generate new title and slug
    const baseTitle = getBaseTitle(original.title)
    const baseSlug = getBaseSlug(original.slug)

    const copyNumber = await getNextCopyNumber(baseTitle)
    const version = await getNextVersion(baseSlug)

    const newTitle = `${baseTitle} (копия ${copyNumber})`
    const newSlug = `${baseSlug}_ver_${version}`

    // Get max order for positioning
    const maxOrder = await prisma.trail.aggregate({
      _max: { order: true },
    })

    // Create duplicated trail with all nested content
    const duplicated = await prisma.trail.create({
      data: {
        slug: newSlug,
        title: newTitle,
        subtitle: original.subtitle,
        description: original.description,
        icon: original.icon,
        color: original.color,
        duration: original.duration,
        order: (maxOrder._max.order || 0) + 1,
        isPublished: original.isPublished,
        isRestricted: original.isRestricted,
        allowSkipReview: original.allowSkipReview,
        teacherVisibility: original.teacherVisibility,
        // Password is NOT copied — duplicate starts without password
        isPasswordProtected: false,
        passwordHash: null,
        passwordHint: null,
        // Creator is the current user
        createdById: session.user.id,
        // Deep copy modules with all nested content
        modules: {
          create: original.modules.map((mod) => ({
            slug: `${getBaseSlug(mod.slug)}_ver_${version}`,
            title: mod.title,
            description: mod.description,
            type: mod.type,
            level: mod.level,
            points: mod.points,
            duration: mod.duration,
            content: mod.content,
            requirements: mod.requirements,
            requiresSubmission: mod.requiresSubmission,
            order: mod.order,
            units: {
              create: mod.units.map((unit) => ({
                title: unit.title,
                content: unit.content,
                duration: unit.duration,
                points: unit.points,
                isChallenge: unit.isChallenge,
                order: unit.order,
              })),
            },
            questions: {
              create: mod.questions.map((q) => ({
                type: q.type,
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                data: q.data,
                order: q.order,
              })),
            },
            contentBlocks: {
              create: mod.contentBlocks.map((cb) => ({
                type: cb.type,
                url: cb.url,
                fileKey: cb.fileKey,
                fileName: cb.fileName,
                fileSize: cb.fileSize,
                mimeType: cb.mimeType,
                title: cb.title,
                description: cb.description,
                content: cb.content,
                order: cb.order,
              })),
            },
          })),
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    })

    // Auto-assign creator to the trail (same pattern as trail creation)
    if (session.user.role === "TEACHER") {
      await prisma.trailTeacher.create({
        data: {
          trailId: duplicated.id,
          teacherId: session.user.id,
        },
      })
    } else if (session.user.role === "CO_ADMIN") {
      await prisma.adminTrailAccess.create({
        data: {
          trailId: duplicated.id,
          adminId: session.user.id,
        },
      })
    }

    return NextResponse.json(duplicated)
  } catch (error) {
    console.error("Error duplicating trail:", error)
    return NextResponse.json(
      { error: "Ошибка при дублировании trail" },
      { status: 500 }
    )
  }
}
