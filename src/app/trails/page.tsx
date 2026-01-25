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
    accessibleTrailIds = userAccess.map((a: { trailId: string }) => a.trailId)
  }

  const allTrails = await prisma.trail.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      modules: {
        select: { id: true },
      },
    },
  })

  // Filter out restricted trails user doesn't have access to
  // Admins and teachers can see all trails
  const isPrivileged = session?.user.role === "ADMIN" || session?.user.role === "TEACHER"
  const trails = allTrails.filter((trail: typeof allTrails[number]) => {
    if (!trail.isRestricted) return true // Public trail
    if (isPrivileged) return true // Admin/Teacher can see all
    if (!session) return false // Not logged in, can't see restricted
    return accessibleTrailIds.includes(trail.id) // Check access
  })

  let enrolledTrailIds: string[] = []
  const progressMap: Record<string, number> = {}

  if (session) {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: session.user.id },
      select: { trailId: true },
    })
    enrolledTrailIds = enrollments.map((e: { trailId: string }) => e.trailId)

    const moduleProgress = await prisma.moduleProgress.findMany({
      where: {
        userId: session.user.id,
        status: "COMPLETED",
      },
      select: { moduleId: true },
    })

    const completedModuleIds = moduleProgress.map((p: { moduleId: string }) => p.moduleId)

    trails.forEach((trail: typeof trails[number]) => {
      const moduleIds = trail.modules.map((m: { id: string }) => m.id)
      const completedCount = moduleIds.filter((id: string) =>
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
