import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TrailSearch } from "@/components/trail-search"

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

  // Build query to include:
  // 1. All published trails (for everyone)
  // 2. Unpublished trails that user has explicit access to (for students with StudentTrailAccess)
  const whereClause = accessibleTrailIds.length > 0
    ? {
        OR: [
          { isPublished: true },
          { id: { in: accessibleTrailIds } }, // Include trails user has access to, even if unpublished
        ],
      }
    : { isPublished: true }

  const allTrails = await prisma.trail.findMany({
    where: whereClause,
    orderBy: { order: "asc" },
    include: {
      modules: {
        select: { id: true },
      },
    },
  })

  // Filter out restricted trails user doesn't have access to
  // Admins and teachers can see all published trails
  const trails = allTrails.filter((trail) => {
    // If user has explicit access, always show (even if unpublished or restricted)
    if (accessibleTrailIds.includes(trail.id)) return true
    // For unpublished trails without explicit access - hide
    if (!trail.isPublished) return false
    // Public trail (not restricted)
    if (!trail.isRestricted) return true
    // Admin/Teacher/CO_ADMIN can see all published trails
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
