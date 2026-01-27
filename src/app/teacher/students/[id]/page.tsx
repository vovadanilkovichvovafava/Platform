import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { ActivityCalendar } from "@/components/activity-calendar"
import { ExportStatsButton } from "@/components/export-stats-button"
import { StudentModuleList } from "@/components/student-module-list"
import {
  Trophy,
  BookOpen,
  CheckCircle2,
  Clock,
  Calendar,
  Mail,
  Target,
  FileText,
  ExternalLink,
  CalendarDays,
} from "lucide-react"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default async function StudentDetailPage({ params }: Props) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    redirect("/dashboard")
  }

  const student = await prisma.user.findUnique({
    where: { id, role: "STUDENT" },
    include: {
      enrollments: {
        include: {
          trail: {
            include: {
              modules: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  points: true,
                  order: true,
                },
              },
            },
          },
        },
      },
      moduleProgress: {
        include: {
          module: {
            select: {
              id: true,
              title: true,
              trailId: true,
            },
          },
        },
      },
      submissions: {
        orderBy: { createdAt: "desc" },
        include: {
          module: {
            select: {
              id: true,
              title: true,
              trail: {
                select: { title: true },
              },
            },
          },
          review: true,
        },
      },
      activityDays: {
        orderBy: { date: "asc" },
        select: {
          date: true,
          actions: true,
        },
      },
    },
  })

  if (!student) {
    notFound()
  }

  // Create a map of module progress for quick lookup
  const progressMap = new Map(
    student.moduleProgress.map((p) => [p.moduleId, {
      moduleId: p.moduleId,
      status: p.status,
      skippedByTeacher: p.skippedByTeacher,
    }])
  )

  // Calculate total max XP
  const totalMaxXP = student.enrollments.reduce(
    (sum, e) => sum + e.trail.modules.reduce((s, m) => s + m.points, 0),
    0
  )

  // Group submissions by status
  const submissionStats = {
    pending: student.submissions.filter((s) => s.status === "PENDING").length,
    approved: student.submissions.filter((s) => s.status === "APPROVED").length,
    revision: student.submissions.filter((s) => s.status === "REVISION").length,
  }

  // Build activity details by date
  type ActivityDetail = { type: "module" | "submission"; title: string }
  const activityDetailsMap = new Map<string, ActivityDetail[]>()

  // Add submissions to activity details
  student.submissions.forEach((sub) => {
    const dateKey = new Date(sub.createdAt).toISOString().split("T")[0]
    const details = activityDetailsMap.get(dateKey) || []
    details.push({ type: "submission", title: sub.module.title })
    activityDetailsMap.set(dateKey, details)
  })

  // Add module completions to activity details
  student.moduleProgress.forEach((mp) => {
    const dateKey = new Date(mp.updatedAt).toISOString().split("T")[0]
    const details = activityDetailsMap.get(dateKey) || []
    details.push({ type: "module", title: mp.module.title })
    activityDetailsMap.set(dateKey, details)
  })

  // Build activity days with details
  const activityDaysWithDetails = student.activityDays.map((d) => {
    const dateKey = d.date.toISOString().split("T")[0]
    return {
      date: d.date.toISOString(),
      actions: d.actions,
      details: activityDetailsMap.get(dateKey) || [],
    }
  })

  return (
    <div className="p-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Учитель", href: "/teacher" },
          { label: "Ученики", href: "/teacher/students" },
          { label: student.name },
        ]}
        className="mb-6"
      />

      {/* Header with student info */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <Card className="flex-1">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
                  {getInitials(student.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                  <ExportStatsButton studentId={student.id} studentName={student.name} />
                </div>
                <div className="flex items-center gap-2 text-gray-500 mt-1">
                  <Mail className="h-4 w-4" />
                  <span>{student.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 mt-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Зарегистрирован{" "}
                    {new Date(student.createdAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-600">{student.totalXP}</p>
              <p className="text-xs text-gray-500">из {totalMaxXP} XP</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">
                {student.moduleProgress.filter((p) => p.status === "COMPLETED").length}
              </p>
              <p className="text-xs text-gray-500">модулей</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{submissionStats.approved}</p>
              <p className="text-xs text-gray-500">принято</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">{submissionStats.pending}</p>
              <p className="text-xs text-gray-500">ожидает</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Calendar - Full Width */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <CalendarDays className="h-5 w-5" />
            Активность
            <Badge variant="secondary" className="ml-1 text-xs">
              {student.activityDays.length} активных дней
            </Badge>
          </h2>
          <ActivityCalendar activityDays={activityDaysWithDetails} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Trails & Progress */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Target className="h-5 w-5" />
              Trails и прогресс
            </h2>

            <StudentModuleList
              studentId={student.id}
              enrollments={student.enrollments.map((e) => ({
                trailId: e.trailId,
                trail: {
                  title: e.trail.title,
                  modules: e.trail.modules,
                },
              }))}
              progressMap={progressMap}
            />
          </CardContent>
        </Card>

        {/* Right: Submissions History */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5" />
              История работ
              {student.submissions.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {student.submissions.length}
                </Badge>
              )}
            </h2>

            {student.submissions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>Нет отправленных работ</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {student.submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-gray-900">
                            {submission.module.title}
                          </h4>
                          <Badge
                            className={`text-xs border-0 ${
                              submission.status === "APPROVED"
                                ? "bg-green-100 text-green-700"
                                : submission.status === "PENDING"
                                ? "bg-blue-100 text-blue-700"
                                : submission.status === "FAILED"
                                ? "bg-red-100 text-red-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {submission.status === "APPROVED"
                              ? "Принято"
                              : submission.status === "PENDING"
                              ? "На проверке"
                              : submission.status === "FAILED"
                              ? "Провал"
                              : "На доработку"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          <Badge variant="outline" className="text-xs mr-2">
                            {submission.module.trail.title}
                          </Badge>
                          {new Date(submission.createdAt).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>

                        {/* Review info */}
                        {submission.review && (
                          <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">Оценка</span>
                              <span className="text-lg font-bold text-[#0176D3]">
                                {submission.review.score}/10
                              </span>
                            </div>
                            {submission.review.comment && (
                              <p className="text-sm text-gray-600 mt-2 border-t pt-2">
                                {submission.review.comment}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Link to review page */}
                      <Link
                        href={`/teacher/reviews/${submission.id}`}
                        className="ml-3 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg flex-shrink-0"
                        title="Открыть работу"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
