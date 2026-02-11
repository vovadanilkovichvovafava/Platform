import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrivileged, isAdmin as checkIsAdmin, getAdminAllowedTrailIds, getTeacherAllowedTrailIds } from "@/lib/admin-access"

export const dynamic = "force-dynamic"
import { Users } from "lucide-react"
import { StudentsSearch } from "@/components/students-search"

export default async function TeacherStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; trail?: string; sort?: string; page?: string; perPage?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const session = await getServerSession(authOptions)

  // Allow TEACHER, CO_ADMIN, and ADMIN roles
  if (!session || !isPrivileged(session.user.role)) {
    redirect("/dashboard")
  }

  const isAdmin = checkIsAdmin(session.user.role)
  const isCoAdmin = session.user.role === "CO_ADMIN"

  // Get assigned trail IDs based on role
  let assignedTrailIds: string[] | null = null // null = all trails (ADMIN)

  if (isCoAdmin) {
    // CO_ADMIN - get trails from AdminTrailAccess
    assignedTrailIds = await getAdminAllowedTrailIds(session.user.id, session.user.role)
  } else if (!isAdmin) {
    // TEACHER role - get assigned trails
    assignedTrailIds = await getTeacherAllowedTrailIds(session.user.id)
  }

  // Build filter for students: only those enrolled in assigned trails
  // ADMIN sees all students, others see only students in their assigned trails
  const studentFilter = assignedTrailIds === null
    ? { role: "STUDENT" as const }
    : {
        role: "STUDENT" as const,
        enrollments: {
          some: {
            trailId: { in: assignedTrailIds },
          },
        },
      }

  // Get students with their progress (filtered by assigned trails)
  const students = await prisma.user.findMany({
    where: studentFilter,
    orderBy: { totalXP: "desc" },
    include: {
      enrollments: {
        // For non-admin, only show enrollments in assigned trails
        where: assignedTrailIds !== null ? { trailId: { in: assignedTrailIds } } : undefined,
        include: {
          trail: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      },
      moduleProgress: {
        where: {
          status: "COMPLETED",
          // Only count completed modules from enrolled trails
          ...(assignedTrailIds !== null ? { module: { trailId: { in: assignedTrailIds } } } : {}),
        },
        select: {
          id: true,
          module: {
            select: {
              points: true,
              trailId: true,
            },
          },
        },
      },
      submissions: {
        // Filter submissions by assigned trails for non-admin
        where: assignedTrailIds !== null ? { module: { trailId: { in: assignedTrailIds } } } : undefined,
        include: {
          module: {
            select: { title: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      activityDays: {
        orderBy: { date: "desc" as const },
        take: 1,
        select: { date: true },
      },
      _count: {
        select: {
          submissions: true,
          activityDays: true,
        },
      },
    },
  })

  // Filter out inactive students, but keep newcomers (registered < 14 days ago)
  const now = new Date()
  const NEWCOMER_DAYS = 14
  const INACTIVE_DAYS = 7

  const activeStudents = students.filter((student) => {
    // Newcomers always visible regardless of activity
    const daysSinceRegistered = Math.floor(
      (now.getTime() - new Date(student.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceRegistered < NEWCOMER_DAYS) return true

    // Non-newcomer with zero activity — inactive, hide
    if (student._count.activityDays === 0) return false

    // Check last activity date
    const lastActivity = student.activityDays[0]?.date
    if (!lastActivity) return false
    const daysSinceActive = Math.floor(
      (now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    )
    // 7+ days without activity — at risk, hide
    return daysSinceActive < INACTIVE_DAYS
  })

  // Get trails with their modules to calculate max XP (filtered for non-admin)
  const allTrails = await prisma.trail.findMany({
    where: assignedTrailIds !== null ? { id: { in: assignedTrailIds } } : undefined,
    include: {
      modules: {
        select: {
          points: true,
        },
      },
    },
  })

  // Calculate max XP per trail (sum of all module points)
  const maxXPByTrail: Record<string, number> = {}
  for (const trail of allTrails) {
    maxXPByTrail[trail.id] = trail.modules.reduce((sum, m) => sum + m.points, 0)
  }

  // Get submission stats per student (filtered by assigned trails for non-admin)
  const submissionStats = await prisma.submission.groupBy({
    by: ["userId", "status"],
    where: assignedTrailIds !== null ? { module: { trailId: { in: assignedTrailIds } } } : undefined,
    _count: true,
  })

  const getStudentStats = (userId: string) => {
    const stats = submissionStats.filter((s) => s.userId === userId)
    return {
      pending: stats.find((s) => s.status === "PENDING")?._count || 0,
      approved: stats.find((s) => s.status === "APPROVED")?._count || 0,
      revision: stats.find((s) => s.status === "REVISION")?._count || 0,
    }
  }

  // Get unique trail names for filter
  const trailNames = [...new Set(allTrails.map((t) => t.title))].sort()

  // Serialize students data for client component (inactive/at-risk filtered out, newcomers kept)
  const serializedStudents = activeStudents.map((student) => {
    // Get enrolled trail IDs for this student
    const enrolledTrailIds = new Set(student.enrollments.map((e) => e.trail.id))

    // Calculate XP only from completed modules in enrolled trails
    const calculatedXP = student.moduleProgress
      .filter((mp) => mp.module && enrolledTrailIds.has(mp.module.trailId))
      .reduce((sum, mp) => sum + (mp.module?.points || 0), 0)

    // Calculate max XP for enrolled trails
    const maxXP = student.enrollments.reduce(
      (sum, e) => sum + (maxXPByTrail[e.trail.id] || 0),
      0
    )

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      telegramUsername: student.telegramUsername,
      totalXP: calculatedXP,
      enrollments: student.enrollments,
      moduleProgress: student.moduleProgress,
      submissions: student.submissions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
      _count: student._count,
      stats: getStudentStats(student.id),
      maxXP,
    }
  })

  // Handle empty state for teachers with no assigned trails
  const hasNoAccess = assignedTrailIds !== null && assignedTrailIds.length === 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Users className="h-6 w-6" />
          Ученики
        </h1>
        <p className="text-gray-600">
          {hasNoAccess
            ? "У вас пока нет назначенных направлений"
            : isAdmin
              ? `${activeStudents.length} активных студентов на платформе`
              : `${activeStudents.length} активных студентов в ваших направлениях`}
        </p>
      </div>

      <StudentsSearch
        students={serializedStudents}
        trails={trailNames}
        initialFilters={{
          q: resolvedSearchParams.q || "",
          trail: resolvedSearchParams.trail || "all",
          sort: resolvedSearchParams.sort || "xp",
          page: resolvedSearchParams.page || "1",
          perPage: resolvedSearchParams.perPage || "10",
        }}
      />
    </div>
  )
}
