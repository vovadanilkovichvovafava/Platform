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

      {/* Activity and History - Full Width Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Activity Calendar - Expanded */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <CalendarDays className="h-5 w-5 text-purple-500" />
              Активность
              <Badge variant="secondary" className="ml-1 text-xs">
                {student.activityDays.length} дн.
              </Badge>
            </h2>
            <ActivityCalendar activityDays={activityDaysWithDetails} />
          </CardContent>
        </Card>

        {/* Submissions Stats Summary */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-blue-500" />
              Сводка по работам
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{submissionStats.approved}</p>
                <p className="text-xs text-gray-500">Принято</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{submissionStats.pending}</p>
                <p className="text-xs text-gray-500">Ожидает</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-xl">
                <FileText className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-600">{submissionStats.revision}</p>
                <p className="text-xs text-gray-500">Доработка</p>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              Всего работ: {student.submissions.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trails & Progress with Collapsible */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-blue-500" />
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
      </div>

      {/* Submissions History - Full Width */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-purple-500" />
          История работ
          {student.submissions.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {student.submissions.length}
            </Badge>
          )}
        </h2>

        {student.submissions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              Нет отправленных работ
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {student.submissions.map((submission) => (
              <Card key={submission.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge
                      className={`text-xs border-0 ${
                        submission.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : submission.status === "PENDING"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {submission.status === "APPROVED"
                        ? "Принято"
                        : submission.status === "PENDING"
                        ? "На проверке"
                        : "На доработку"}
                    </Badge>
                    <Link
                      href={`/teacher/reviews/${submission.id}`}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Открыть работу"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>

                  <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">
                    {submission.module.title}
                  </h4>

                  <p className="text-xs text-gray-500 mb-2">
                    {submission.module.trail.title}
                  </p>

                  <p className="text-xs text-gray-400">
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
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Оценка:</span>
                        <span className="font-bold text-blue-600">{submission.review.score}/10</span>
                      </div>
                      {submission.review.comment && (
                        <p className="text-gray-600 mt-1 text-xs line-clamp-2">
                          {submission.review.comment}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
