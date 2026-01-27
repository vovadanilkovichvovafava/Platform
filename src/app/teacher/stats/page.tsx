import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { StatsTrailExplorer } from "@/components/stats-trail-explorer"

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
  ExternalLink,
} from "lucide-react"

export default async function TeacherStatsPage() {
  const session = await getServerSession(authOptions)

  // Allow both TEACHER and ADMIN roles
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    redirect("/dashboard")
  }

  // Get overall stats
  const totalStudents = await prisma.user.count({
    where: { role: "STUDENT" },
  })

  const totalSubmissions = await prisma.submission.count()

  const submissionsByStatus = await prisma.submission.groupBy({
    by: ["status"],
    _count: true,
  })

  const pendingCount = submissionsByStatus.find((s) => s.status === "PENDING")?._count || 0
  const approvedCount = submissionsByStatus.find((s) => s.status === "APPROVED")?._count || 0
  const revisionCount = submissionsByStatus.find((s) => s.status === "REVISION")?._count || 0

  // Get top students by XP
  const topStudents = await prisma.user.findMany({
    where: { role: "STUDENT", totalXP: { gt: 0 } },
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

  // Get trails with modules and submissions for drill-down navigation
  const trailsWithDetails = await prisma.trail.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      modules: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          submissions: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              status: true,
              createdAt: true,
              user: {
                select: { id: true, name: true, email: true },
              },
              review: {
                select: { score: true },
              },
            },
          },
        },
      },
    },
  })

  // Serialize data for client component
  const serializedTrails = trailsWithDetails.map((trail) => ({
    id: trail.id,
    title: trail.title,
    slug: trail.slug,
    color: trail.color,
    modules: trail.modules.map((module) => ({
      id: module.id,
      title: module.title,
      slug: module.slug,
      type: module.type,
      submissions: module.submissions.map((sub) => ({
        id: sub.id,
        status: sub.status,
        createdAt: sub.createdAt.toISOString(),
        user: sub.user,
        review: sub.review,
      })),
    })),
  }))

  // Get recent activity (last 7 days)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const recentSubmissions = await prisma.submission.count({
    where: { createdAt: { gte: weekAgo } },
  })

  const recentReviews = await prisma.review.count({
    where: { createdAt: { gte: weekAgo } },
  })

  // Module completion stats
  const completedModules = await prisma.moduleProgress.count({
    where: { status: "COMPLETED" },
  })

  const approvalRate = totalSubmissions > 0
    ? Math.round((approvedCount / totalSubmissions) * 100)
    : 0

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

      {/* Top Students */}
      <Card className="mb-8">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {topStudents.map((student, idx) => (
                <Link
                  key={student.id}
                  href={`/teacher/students/${student.id}`}
                  className="block"
                >
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-sm transition-all">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-900 truncate">
                          {student.name}
                        </span>
                        <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-yellow-600">
                          {student.totalXP} XP
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-500">
                          {student._count.submissions} работ
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Trail Stats with Drill-Down */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-purple-500" />
          Статистика по направлениям
          <span className="text-sm font-normal text-gray-500">
            (клик для раскрытия)
          </span>
        </h2>
        <StatsTrailExplorer trails={serializedTrails} />
      </div>
    </div>
  )
}
