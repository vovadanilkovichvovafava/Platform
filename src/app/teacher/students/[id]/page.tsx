import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { pluralizeRu } from "@/lib/utils"
import { isPrivileged, isHR, isAdmin, getTeacherAllowedTrailIds, getAdminAllowedTrailIds } from "@/lib/admin-access"
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
  AlertCircle,
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

  // Allow TEACHER, CO_ADMIN, ADMIN, and HR roles
  if (!session || (!isPrivileged(session.user.role) && !isHR(session.user.role))) {
    redirect("/dashboard")
  }

  // Get allowed trail IDs based on user role
  // ADMIN: null (all trails), CO_ADMIN/HR: from AdminTrailAccess, TEACHER: from TrailTeacher
  let allowedTrailIds: string[] | null = null

  if (!isAdmin(session.user.role)) {
    if (session.user.role === "CO_ADMIN" || isHR(session.user.role)) {
      allowedTrailIds = await getAdminAllowedTrailIds(session.user.id, session.user.role)
    } else {
      // TEACHER
      allowedTrailIds = await getTeacherAllowedTrailIds(session.user.id)
    }
  }

  // Get IDs of submissions that this user reviewed (exception: can see if reviewed)
  const reviewedSubmissionIds = await prisma.review.findMany({
    where: { reviewerId: session.user.id },
    select: { submissionId: true },
  }).then((reviews) => reviews.map((r) => r.submissionId))

  // Build enrollment filter
  const enrollmentFilter = allowedTrailIds === null
    ? {}
    : { trailId: { in: allowedTrailIds } }

  const student = await prisma.user.findUnique({
    where: { id, role: "STUDENT" },
    include: {
      enrollments: {
        where: enrollmentFilter,
        select: {
          trailId: true,
          trailStatus: true,
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
        where: allowedTrailIds === null
          ? {}
          : { module: { trailId: { in: allowedTrailIds } } },
        include: {
          module: {
            select: {
              id: true,
              title: true,
              trailId: true,
              points: true,
            },
          },
        },
      },
      submissions: {
        where: allowedTrailIds === null
          ? {}
          : {
              OR: [
                { module: { trailId: { in: allowedTrailIds } } },
                { id: { in: reviewedSubmissionIds } }, // Exception: can see if reviewed
              ],
            },
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

  // Calculate total max XP from enrolled trails
  const totalMaxXP = student.enrollments.reduce(
    (sum, e) => sum + e.trail.modules.reduce((s, m) => s + m.points, 0),
    0
  )

  // Calculate actual XP from completed modules in enrolled trails
  const enrolledTrailIds = new Set(student.enrollments.map((e) => e.trailId))
  const calculatedXP = student.moduleProgress
    .filter((mp) => mp.status === "COMPLETED" && mp.module && enrolledTrailIds.has(mp.module.trailId))
    .reduce((sum, mp) => sum + (mp.module?.points || 0), 0)

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
                  <h1 className="text-2xl font-bold text-gray-900">
                    {student.name}
                  </h1>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/${student.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Дашборд
                    </Link>
                    <ExportStatsButton studentId={student.id} studentName={student.name} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-500 mt-1">
                  <Mail className="h-4 w-4" />
                  <span>{student.email}</span>
                  {student.telegramUsername && (
                    <span className="text-blue-500">{student.telegramUsername}</span>
                  )}
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
              <p className="text-2xl font-bold text-yellow-600">{calculatedXP}</p>
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

      {/* Main content - 50/50 layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Trails & Progress */}
        <section className="lg:self-start">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Target className="h-6 w-6 text-blue-600" />
            Trails и прогресс
          </h2>

          <StudentModuleList
            studentId={student.id}
            enrollments={student.enrollments.map((e) => ({
              trailId: e.trailId,
              trailStatus: e.trailStatus,
              trail: {
                title: e.trail.title,
                modules: e.trail.modules,
              },
            }))}
            progressMap={progressMap}
          />
        </section>

        {/* Right column: Activity + Submissions stacked */}
        <div className="space-y-6">
          {/* Activity Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <CalendarDays className="h-6 w-6 text-purple-600" />
              Активность за год
              <Badge variant="secondary" className="ml-2 text-sm">
                {student.activityDays.length} активных дней
              </Badge>
            </h2>
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Calendar */}
                  <div className="shrink-0">
                    <ActivityCalendar activityDays={activityDaysWithDetails} />
                  </div>
                  {/* Activity Stats */}
                  <div className="flex-1 grid grid-cols-2 gap-3 content-start">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-700">
                        {student.activityDays.reduce((sum, d) => sum + d.actions, 0)}
                      </p>
                      <p className="text-xs text-purple-600">всего действий</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-700">
                        {student.moduleProgress.filter(p => p.status === "COMPLETED").length}
                      </p>
                      <p className="text-xs text-blue-600">модулей завершено</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-700">
                        {student.submissions.filter(s => s.status === "APPROVED").length}
                      </p>
                      <p className="text-xs text-green-600">работ принято</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-700">
                        {student.submissions.filter(s => s.status === "PENDING").length}
                      </p>
                      <p className="text-xs text-orange-600">на проверке</p>
                    </div>
                    {/* Recent Activity */}
                    {student.activityDays.length > 0 && (
                      <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Последняя активность</p>
                        <p className="text-sm font-medium text-gray-800">
                          {new Date(student.activityDays[student.activityDays.length - 1].date).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Submissions History Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <FileText className="h-6 w-6 text-orange-600" />
              История работ
              <Badge variant="secondary" className="ml-2 text-sm">
                {student.submissions.length} {pluralizeRu(student.submissions.length, ["работа", "работы", "работ"])}
              </Badge>
            </h2>

            {student.submissions.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Нет отправленных работ</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 divide-y max-h-[500px] overflow-y-auto">
                  {student.submissions.map((submission) => (
                    <Link
                      key={submission.id}
                      href={`/teacher/reviews/${submission.id}`}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                    >
                      {/* Status icon */}
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        submission.status === "APPROVED"
                          ? "bg-green-100"
                          : submission.status === "PENDING"
                          ? "bg-blue-100"
                          : submission.status === "FAILED"
                          ? "bg-red-100"
                          : "bg-orange-100"
                      }`}>
                        {submission.status === "APPROVED" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {submission.status === "PENDING" && <Clock className="h-4 w-4 text-blue-600" />}
                        {submission.status === "REVISION" && <AlertCircle className="h-4 w-4 text-orange-600" />}
                        {submission.status === "FAILED" && <AlertCircle className="h-4 w-4 text-red-600" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm truncate">{submission.module.title}</h4>
                        <p className="text-xs text-gray-500">
                          {new Date(submission.createdAt).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                          })}
                          {submission.review && (
                            <span className="ml-2 text-blue-600 font-medium">
                              {submission.review.score}/10
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Status badge */}
                      <Badge
                        className={`shrink-0 text-xs border-0 ${
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
                          ? "Ожидает"
                          : submission.status === "FAILED"
                          ? "Провал"
                          : "Доработка"}
                      </Badge>

                      <ExternalLink className="h-4 w-4 text-gray-400 shrink-0" />
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
