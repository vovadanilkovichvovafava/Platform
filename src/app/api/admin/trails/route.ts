import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAnyAdmin, isAdmin, isHR, getAdminTrailFilter, isPrivileged } from "@/lib/admin-access"
import { hashTrailPassword } from "@/lib/trail-password"

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

const trailSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().default(""),
  description: z.string().default(""),
  icon: z.string().default("Code"),
  color: z.string().default("#6366f1"),
  duration: z.string().default(""),
  isPublished: z.boolean().default(true),
  allowSkipReview: z.boolean().default(true), // true = students can proceed without waiting for review
  // Password protection fields
  isPasswordProtected: z.boolean().default(false),
  password: z.string().optional(), // Plaintext password, will be hashed
  passwordHint: z.string().nullable().optional(),
})

// GET - List all trails with modules (filtered by admin access)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || (!isPrivileged(session.user.role) && !isHR(session.user.role))) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    // Build where clause based on role
    // ADMIN: no filter (sees all)
    // CO_ADMIN/HR: filter by AdminTrailAccess
    // TEACHER: filter by TrailTeacher + ALL_TEACHERS visibility
    let whereClause = {}

    if ((isAnyAdmin(session.user.role) && !isAdmin(session.user.role)) || isHR(session.user.role)) {
      // CO_ADMIN or HR - filter by allowed trails
      const trailFilter = await getAdminTrailFilter(session.user.id, session.user.role)
      if (trailFilter) {
        whereClause = trailFilter
      }
    } else if (session.user.role === "TEACHER") {
      // TEACHER - filter by assigned trails (TrailTeacher + ALL_TEACHERS)
      const { getTeacherAllowedTrailIds } = await import("@/lib/admin-access")
      const allowedIds = await getTeacherAllowedTrailIds(session.user.id)
      whereClause = { id: { in: allowedIds } }
    }

    const trails = await prisma.trail.findMany({
      where: whereClause,
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
        teachers: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
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

// POST - Create new trail (Admin and CO_ADMIN only, TEACHER cannot create)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const body = await request.json()
    const data = trailSchema.parse(body)

    // Extract password fields (not stored directly)
    const { password, isPasswordProtected, passwordHint, ...trailData } = data

    // Validate: if password protected, password is required
    if (isPasswordProtected && !password) {
      return NextResponse.json(
        { error: "Пароль обязателен для защищенного трейла" },
        { status: 400 }
      )
    }

    // Hash password if provided
    let passwordHash: string | undefined
    if (isPasswordProtected && password) {
      passwordHash = await hashTrailPassword(password)
    }

    // Generate slug from title (transliterate Cyrillic to Latin)
    const slug = generateSlug(trailData.title)

    // Get max order
    const maxOrder = await prisma.trail.aggregate({
      _max: { order: true },
    })

    // New trails are restricted by default
    const trail = await prisma.trail.create({
      data: {
        ...trailData,
        slug,
        order: (maxOrder._max.order || 0) + 1,
        isRestricted: true, // By default, trails are restricted
        // Password protection
        isPasswordProtected,
        passwordHash,
        passwordHint: isPasswordProtected ? passwordHint : null,
        // Creator tracking
        createdById: session.user.id,
      },
    })

    // Auto-assign creator to the trail
    if (session.user.role === "TEACHER") {
      // Teacher -> TrailTeacher
      await prisma.trailTeacher.create({
        data: {
          trailId: trail.id,
          teacherId: session.user.id,
        },
      })
    } else if (session.user.role === "CO_ADMIN") {
      // CO_ADMIN -> AdminTrailAccess (auto-grant access to created trail)
      await prisma.adminTrailAccess.create({
        data: {
          trailId: trail.id,
          adminId: session.user.id,
        },
      })
    }
    // ADMIN doesn't need assignment - has access to all

    return NextResponse.json(trail)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error creating trail:", error)
    return NextResponse.json({ error: "Ошибка при создании trail" }, { status: 500 })
  }
}
