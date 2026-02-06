import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TrailSearch } from "@/components/trail-search"
import { ROLE_STUDENT } from "@/lib/admin-access"

export const dynamic = "force-dynamic"

export default async function TrailsPage() {
  const session = await getServerSession(authOptions)

  // Get user's trail access if logged in
  let accessibleTrailIds: string[] = []
  if (session) {
    const userAccess = await prisma.studentTrailAccess.findMany({
      where: { studentId: session.user.id },
      select: { trailId: true },
    })
    accessibleTrailIds = userAccess.map((a) => a.trailId)
  }

  const isPrivileged = session?.user.role === "ADMIN" || session?.user.role === "TEACHER" || session?.user.role === "CO_ADMIN"
  const isStudent = session?.user.role === ROLE_STUDENT

  // Build query based on role:
  // Students: ONLY see trails they have explicit StudentTrailAccess to
  // Privileged/unauthenticated: see published + explicitly accessible
  let whereClause
  if (isStudent) {
    // Students only see assigned trails
    whereClause = { id: { in: accessibleTrailIds } }
  } else if (accessibleTrailIds.length > 0) {
    whereClause = {
      OR: [
        { isPublished: true },
        { id: { in: accessibleTrailIds } },
      ],
    }
  } else {
    whereClause = { isPublished: true }
  }

  const allTrails = await prisma.trail.findMany({
    where: whereClause,
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      description: true,
      icon: true,
      color: true,
      duration: true,
      isPublished: true,
      isRestricted: true,
      isPasswordProtected: true,
      createdById: true,
      modules: {
        select: { id: true },
      },
    },
  })

  // Get password access records for logged in user
  let passwordAccessTrailIds: string[] = []
  let enrolledTrailIdsForPassword: string[] = []
  if (session) {
    const passwordAccessRecords = await prisma.trailPasswordAccess.findMany({
      where: { userId: session.user.id },
      select: { trailId: true },
    })
    passwordAccessTrailIds = passwordAccessRecords.map((r) => r.trailId)

    // Get enrollments for password-protected trail access check
    const enrollmentsForPassword = await prisma.enrollment.findMany({
      where: { userId: session.user.id },
      select: { trailId: true },
    })
    enrolledTrailIdsForPassword = enrollmentsForPassword.map((e) => e.trailId)
  }

  // Filter out trails user doesn't have access to
  // Students: already filtered by query (only assigned trails), show all
  // Privileged: see all published trails
  // IMPORTANT: Password-protected trails are hidden unless user has access
  const trails = allTrails.filter((trail) => {
    // Students already got only their assigned trails from the query - show all
    if (isStudent) return true

    // If user has explicit StudentTrailAccess, always show
    if (accessibleTrailIds.includes(trail.id)) return true
    // For unpublished trails without explicit access - hide
    if (!trail.isPublished) return false

    // Check password protection
    // Password-protected trails should only show if:
    // 1. User is the creator
    // 2. User has password access
    // 3. User is enrolled (student bound)
    // Note: isPrivileged (admin/teacher) does NOT grant automatic access to password-protected trails
    if (trail.isPasswordProtected) {
      if (!session) return false

      // Creator always has access
      if (trail.createdById === session.user.id) return true

      // User has unlocked via password
      if (passwordAccessTrailIds.includes(trail.id)) return true

      // User is enrolled (student bound to trail)
      if (enrolledTrailIdsForPassword.includes(trail.id)) return true

      // No password access - hide trail
      return false
    }

    // Public trail (not restricted)
    if (!trail.isRestricted) return true
    // Admin/Teacher/CO_ADMIN can see all published non-password-protected trails
    if (isPrivileged) return true
    // Not logged in, can't see restricted
    if (!session) return false
    return false
  })

  let enrolledTrailIds: string[] = []
  const progressMap: Record<string, number> = {}

  if (session) {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: session.user.id },
      select: { trailId: true },
    })
    enrolledTrailIds = enrollments.map((e) => e.trailId)

    const moduleProgress = await prisma.moduleProgress.findMany({
      where: {
        userId: session.user.id,
        status: "COMPLETED",
      },
      select: { moduleId: true },
    })

    const completedModuleIds = moduleProgress.map((p) => p.moduleId)

    trails.forEach((trail) => {
      const moduleIds = trail.modules.map((m) => m.id)
      const completedCount = moduleIds.filter((id) =>
        completedModuleIds.includes(id)
      ).length
      progressMap[trail.id] =
        trail.modules.length > 0
          ? Math.round((completedCount / trail.modules.length) * 100)
          : 0
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Trails
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Выберите направление обучения и начните свой путь к мастерству
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <TrailSearch
          trails={trails}
          enrolledTrailIds={enrolledTrailIds}
          progressMap={progressMap}
        />
      </div>
    </div>
  )
}
