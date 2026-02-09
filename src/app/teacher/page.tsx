import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrivileged, isAdmin as checkIsAdmin, getPrivilegedAllowedTrailIds } from "@/lib/admin-access"

export const dynamic = "force-dynamic"
import { Card, CardContent } from "@/components/ui/card"
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react"
import { SubmissionsFilter } from "@/components/submissions-filter"

export default async function TeacherDashboard({
  searchParams,
}: {
  searchParams: Promise<{ trail?: string; status?: string; sort?: string; q?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const session = await getServerSession(authOptions)

  // Allow TEACHER, CO_ADMIN, and ADMIN roles
  if (!session || !isPrivileged(session.user.role)) {
    redirect("/dashboard")
  }

  const isAdmin = checkIsAdmin(session.user.role)

  // Get teacher's assigned trails via unified helper
  // - ADMIN: null (all), CO_ADMIN/TEACHER: specific trail IDs
  const allowedTrailIds = await getPrivilegedAllowedTrailIds(session.user.id, session.user.role)
  const assignedTrailIds: string[] = allowedTrailIds || []

  // ADMIN sees all submissions, CO_ADMIN and TEACHER only see assigned trails
  const shouldFilter = allowedTrailIds !== null && assignedTrailIds.length > 0
  const pendingSubmissions = await prisma.submission.findMany({
    where: {
      status: "PENDING",
      ...(shouldFilter ? { module: { trailId: { in: assignedTrailIds } } } : {}),
      ...(allowedTrailIds !== null && assignedTrailIds.length === 0 ? { id: "__NEVER_MATCH__" } : {}), // No access = no results
    },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: { name: true, email: true },
      },
      module: {
        include: {
          trail: { select: { title: true } },
        },
      },
    },
  })

  // Get all reviewed submissions (approved, revision, failed) for history
  const reviewedSubmissions = await prisma.submission.findMany({
    where: {
      status: { in: ["APPROVED", "REVISION", "FAILED"] },
      ...(shouldFilter ? { module: { trailId: { in: assignedTrailIds } } } : {}),
      ...(allowedTrailIds !== null && assignedTrailIds.length === 0 ? { id: "__NEVER_MATCH__" } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 50, // Limit history to last 50
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      module: {
        include: {
          trail: { select: { title: true } },
        },
      },
      review: {
        select: {
          score: true,
          comment: true,
          createdAt: true,
          reviewer: { select: { name: true } },
        },
      },
    },
  })

  // Stats - only for assigned trails
  const stats = await prisma.submission.groupBy({
    by: ["status"],
    where: shouldFilter
      ? { module: { trailId: { in: assignedTrailIds } } }
      : (!isAdmin && assignedTrailIds.length === 0 ? { id: "__NEVER_MATCH__" } : {}),
    _count: true,
  })

  const pendingCount = stats.find((s) => s.status === "PENDING")?._count || 0
  const approvedCount = stats.find((s) => s.status === "APPROVED")?._count || 0
  const revisionCount = stats.find((s) => s.status === "REVISION")?._count || 0
  const failedCount = stats.find((s) => s.status === "FAILED")?._count || 0

  // Get unique trails for filter
  const allTrails = new Set<string>()
  pendingSubmissions.forEach((s) => allTrails.add(s.module.trail.title))
  reviewedSubmissions.forEach((s) => allTrails.add(s.module.trail.title))
  const trails = Array.from(allTrails).sort()

  // --- Time tracking: fetch ModuleProgress startedAt + first submission dates ---
  const allSubmissions = [...pendingSubmissions, ...reviewedSubmissions]
  const userModuleKeys = new Map<string, { userId: string; moduleId: string }>()
  for (const s of allSubmissions) {
    userModuleKeys.set(`${s.userId}:${s.moduleId}`, { userId: s.userId, moduleId: s.moduleId })
  }
  const pairs = [...userModuleKeys.values()]

  // Batch-fetch module progress (startedAt) for all user+module pairs
  const progressRecords = pairs.length > 0
    ? await prisma.moduleProgress.findMany({
        where: { OR: pairs.map((p) => ({ userId: p.userId, moduleId: p.moduleId })) },
        select: { userId: true, moduleId: true, startedAt: true },
      })
    : []
  const progressMap = new Map<string, Date | null>()
  for (const p of progressRecords) {
    progressMap.set(`${p.userId}:${p.moduleId}`, p.startedAt)
  }

  // Batch-fetch earliest submission createdAt per user+module (for timeToFirstSubmit)
  const firstSubmitRecords = pairs.length > 0
    ? await prisma.submission.groupBy({
        by: ["userId", "moduleId"],
        _min: { createdAt: true },
        where: { OR: pairs.map((p) => ({ userId: p.userId, moduleId: p.moduleId })) },
      })
    : []
  const firstSubmitMap = new Map<string, Date | null>()
  for (const r of firstSubmitRecords) {
    firstSubmitMap.set(`${r.userId}:${r.moduleId}`, r._min.createdAt)
  }

  // Helper: build time tracking object for a submission (all values serialized)
  function buildTimeTracking(s: { userId: string; moduleId: string; createdAt: Date; editCount: number; lastEditedAt: Date | null }) {
    const key = `${s.userId}:${s.moduleId}`
    const moduleStartedAt = progressMap.get(key) ?? null
    const firstSubmittedAt = firstSubmitMap.get(key) ?? null
    const timeToFirstSubmitMs =
      moduleStartedAt && firstSubmittedAt
        ? firstSubmittedAt.getTime() - moduleStartedAt.getTime()
        : null
    const totalEditTimeMs =
      s.editCount > 0 && s.lastEditedAt
        ? s.lastEditedAt.getTime() - s.createdAt.getTime()
        : null
    return {
      moduleStartedAt: moduleStartedAt?.toISOString() ?? null,
      firstSubmittedAt: firstSubmittedAt?.toISOString() ?? null,
      timeToFirstSubmitMs,
      totalEditTimeMs,
      editCount: s.editCount,
      lastActivityAt: (s.lastEditedAt ?? s.createdAt).toISOString(),
    }
  }

  // Serialize dates for client component
  const serializedPending = pendingSubmissions.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    lastEditedAt: s.lastEditedAt?.toISOString() ?? null,
    timeTracking: buildTimeTracking(s),
  }))

  const serializedReviewed = reviewedSubmissions.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    lastEditedAt: s.lastEditedAt?.toISOString() ?? null,
    review: s.review
      ? {
          ...s.review,
          createdAt: s.review.createdAt.toISOString(),
        }
      : null,
    timeTracking: buildTimeTracking(s),
  }))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Добро пожаловать!
        </h1>
        <p className="text-gray-600">
          Управляйте проверкой работ и отслеживайте прогресс учеников
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <div className="text-sm text-gray-500">На проверке</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{approvedCount}</div>
                <div className="text-sm text-gray-500">Принято</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{revisionCount}</div>
                <div className="text-sm text-gray-500">На доработку</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{failedCount}</div>
                <div className="text-sm text-gray-500">Провал</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions with filter */}
      <SubmissionsFilter
        pendingSubmissions={serializedPending}
        reviewedSubmissions={serializedReviewed}
        trails={trails}
        initialFilters={{
          trail: resolvedSearchParams.trail || "all",
          status: resolvedSearchParams.status || "all",
          sort: resolvedSearchParams.sort || "waiting",
          q: resolvedSearchParams.q || "",
        }}
      />
    </div>
  )
}
