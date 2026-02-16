import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { pluralizeRu } from "@/lib/utils"
import { TeacherStatsDrilldown } from "@/components/teacher-stats-drilldown"
import { isPrivileged, isHR, isAdmin as checkIsAdmin, getAdminAllowedTrailIds, getTeacherAllowedTrailIds } from "@/lib/admin-access"

export const dynamic = "force-dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart3,
  Users,
  FileText,
  CheckCircle2,
  Trophy,
  TrendingUp,
  BookOpen,
} from "lucide-react"

export default async function TeacherStatsPage() {
  const session = await getServerSession(authOptions)

  // Allow TEACHER, CO_ADMIN, ADMIN, and HR roles
  if (!session || (!isPrivileged(session.user.role) && !isHR(session.user.role))) {
    redirect("/dashboard")
  }

  const isAdmin = checkIsAdmin(session.user.role)
  const isCoAdmin = session.user.role === "CO_ADMIN"
  const isHRUser = isHR(session.user.role)

  // Get assigned trail IDs based on role
  // ADMIN: null (all trails), CO_ADMIN/HR: from AdminTrailAccess, TEACHER: from TrailTeacher
  let assignedTrailIds: string[] | null = null // null = all trails (ADMIN)

  if (isCoAdmin || isHRUser) {
    // CO_ADMIN/HR - get trails from AdminTrailAccess
    assignedTrailIds = await getAdminAllowedTrailIds(session.user.id, session.user.role)
  } else if (!isAdmin) {
    // TEACHER role - get assigned trails
    assignedTrailIds = await getTeacherAllowedTrailIds(session.user.id)
  }

  // Build filters based on assigned trails
  const studentFilter = assignedTrailIds === null
    ? { role: "STUDENT" as const }
    : {
        role: "STUDENT" as const,
        enrollments: { some: { trailId: { in: assignedTrailIds } } },
      }

  const submissionFilter = assignedTrailIds !== null
    ? { module: { trailId: { in: assignedTrailIds } } }
    : undefined

  // Get overall stats (filtered by assigned trails for non-admin)
  const totalStudents = await prisma.user.count({
    where: studentFilter,
  })

  const totalSubmissions = await prisma.submission.count({
    where: submissionFilter,
  })

  const submissionsByStatus = await prisma.submission.groupBy({
    by: ["status"],
    where: submissionFilter,
    _count: true,
  })

  const pendingCount = submissionsByStatus.find((s) => s.status === "PENDING")?._count || 0
  const approvedCount = submissionsByStatus.find((s) => s.status === "APPROVED")?._count || 0
  const revisionCount = submissionsByStatus.find((s) => s.status === "REVISION")?._count || 0

  // Get submissions by trail (filtered)
  const submissionsByTrail = await prisma.submission.findMany({
    where: submissionFilter,
    include: {
      module: {
        include: {
          trail: {
            select: { title: true, color: true },
          },
        },
      },
    },
  })

  const trailStats = submissionsByTrail.reduce((acc, sub) => {
    const trail = sub.module.trail.title
    if (!acc[trail]) {
      acc[trail] = { total: 0, approved: 0, pending: 0, revision: 0, color: sub.module.trail.color }
    }
    acc[trail].total++
    if (sub.status === "APPROVED") acc[trail].approved++
    if (sub.status === "PENDING") acc[trail].pending++
    if (sub.status === "REVISION") acc[trail].revision++
    return acc
  }, {} as Record<string, { total: number; approved: number; pending: number; revision: number; color: string }>)

  // Get top students by XP (filtered by students in assigned trails)
  const topStudents = await prisma.user.findMany({
    where: {
      ...studentFilter,
      totalXP: { gt: 0 },
    },
    orderBy: { totalXP: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      totalXP: true,
      _count: {
        select: { submissions: true },
      },
    },
  })

  // Get recent activity (last 7 days, filtered)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const recentSubmissions = await prisma.submission.count({
    where: {
      createdAt: { gte: weekAgo },
      ...(submissionFilter || {}),
    },
  })

  const recentReviews = await prisma.review.count({
    where: {
      createdAt: { gte: weekAgo },
      ...(assignedTrailIds !== null
        ? { submission: { module: { trailId: { in: assignedTrailIds } } } }
        : {}),
    },
  })

  // Module completion stats (filtered)
  const completedModules = await prisma.moduleProgress.count({
    where: {
      status: "COMPLETED",
      ...(assignedTrailIds !== null ? { module: { trailId: { in: assignedTrailIds } } } : {}),
    },
  })

  const approvalRate = totalSubmissions > 0
    ? Math.round((approvedCount / totalSubmissions) * 100)
    : 0

  // Get trails with detailed stats for drill-down (filtered)
  const trailsWithStats = await prisma.trail.findMany({
    where: assignedTrailIds !== null ? { id: { in: assignedTrailIds } } : {},
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          submissions: {
            orderBy: { createdAt: "desc" },
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          progress: {
            where: { status: "COMPLETED" },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { order: "asc" },
  })

  // Transform data for client component
  const trailsForDrilldown = trailsWithStats.map((trail) => {
    const modulesWithStats = trail.modules.map((module) => ({
      id: module.id,
      title: module.title,
      type: module.type,
      points: module.points,
      submissions: module.submissions.map((sub) => ({
        id: sub.id,
        status: sub.status,
        createdAt: sub.createdAt.toISOString(),
        user: sub.user,
      })),
      completedCount: module.progress.length,
      avgScore: null as number | null, // Will be calculated if reviews are needed
    }))

    const allSubmissions = modulesWithStats.flatMap((m) => m.submissions)

    return {
      id: trail.id,
      title: trail.title,
      color: trail.color,
      modules: modulesWithStats,
      totalSubmissions: allSubmissions.length,
      pendingCount: allSubmissions.filter((s) => s.status === "PENDING").length,
      approvedCount: allSubmissions.filter((s) => s.status === "APPROVED").length,
    }
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Статистика
        </h1>
        <p className="text-gray-600">
          Общая статистика платформы и прогресс обучения
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-xs text-gray-500">Учеников</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSubmissions}</p>
                <p className="text-xs text-gray-500">Работ сдано</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvalRate}%</p>
                <p className="text-xs text-gray-500">Принято</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedModules}</p>
                <p className="text-xs text-gray-500">Модулей пройдено</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Submissions by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Статус работ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">На проверке</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{pendingCount}</span>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${totalSubmissions > 0 ? (pendingCount / totalSubmissions) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Принято</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{approvedCount}</span>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${totalSubmissions > 0 ? (approvedCount / totalSubmissions) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm">На доработку</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{revisionCount}</span>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: `${totalSubmissions > 0 ? (revisionCount / totalSubmissions) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Активность за неделю</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">Новых работ</span>
                </div>
                <span className="text-xl font-bold text-blue-600">
                  {recentSubmissions}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Проверено</span>
                </div>
                <span className="text-xl font-bold text-green-600">
                  {recentReviews}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stats by Trail */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">По направлениям</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(trailStats).length === 0 ? (
              <p className="text-gray-500 text-center py-4">Нет данных</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(trailStats).map(([trail, stats]) => (
                  <div key={trail} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{trail}</span>
                      <span className="text-sm text-gray-500">
                        {stats.total} {pluralizeRu(stats.total, ["работа", "работы", "работ"])}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        {stats.approved} принято
                      </span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {stats.pending} ожидает
                      </span>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                        {stats.revision} доработка
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Students */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Топ учеников
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topStudents.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Нет данных</p>
            ) : (
              <div className="space-y-3">
                {topStudents.map((student, idx) => (
                  <Link
                    key={student.id}
                    href={`/dashboard/${student.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0
                            ? "bg-yellow-400 text-yellow-900"
                            : idx === 1
                            ? "bg-gray-300 text-gray-700"
                            : idx === 2
                            ? "bg-orange-300 text-orange-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <span className="font-medium">{student.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-600">
                        {student.totalXP} XP
                      </p>
                      <p className="text-xs text-gray-500">
                        {student._count.submissions} {pluralizeRu(student._count.submissions, ["работа", "работы", "работ"])}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trail Drill-Down Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Детальная статистика по направлениям
        </h2>
        <TeacherStatsDrilldown trails={trailsForDrilldown} />
      </div>
    </div>
  )
}
