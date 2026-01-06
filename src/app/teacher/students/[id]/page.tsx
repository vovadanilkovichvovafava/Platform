import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Trophy,
  BookOpen,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  Mail,
  Target,
  FileText,
  ExternalLink,
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
    },
  })

  if (!student) {
    notFound()
  }

  // Create a map of module progress for quick lookup
  const progressMap = new Map(
    student.moduleProgress.map((p) => [p.moduleId, p])
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

  return (
    <div className="p-8">
      {/* Back button */}
      <Link
        href="/teacher/students"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Назад к списку учеников
      </Link>

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
                <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enrolled Trails & Progress */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Trails и прогресс
          </h2>

          {student.enrollments.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                Студент не записан ни на один trail
              </CardContent>
            </Card>
          ) : (
            student.enrollments.map((enrollment) => {
              const trailModules = enrollment.trail.modules
              const completedModules = trailModules.filter(
                (m) => progressMap.get(m.id)?.status === "COMPLETED"
              )
              const trailMaxXP = trailModules.reduce((s, m) => s + m.points, 0)
              const trailProgress = trailModules.length > 0
                ? Math.round((completedModules.length / trailModules.length) * 100)
                : 0

              return (
                <Card key={enrollment.trailId}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{enrollment.trail.title}</span>
                      <Badge variant="secondary">
                        {completedModules.length}/{trailModules.length} модулей
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{trailProgress}% завершено</span>
                        <span>{trailMaxXP} XP макс.</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                          style={{ width: `${trailProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Module list */}
                    <div className="space-y-2">
                      {trailModules.map((module) => {
                        const progress = progressMap.get(module.id)
                        const isCompleted = progress?.status === "COMPLETED"
                        const isInProgress = progress?.status === "IN_PROGRESS"

                        return (
                          <div
                            key={module.id}
                            className={`flex items-center justify-between p-2 rounded-lg ${
                              isCompleted
                                ? "bg-green-50"
                                : isInProgress
                                ? "bg-blue-50"
                                : "bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : isInProgress ? (
                                <Clock className="h-4 w-4 text-blue-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-gray-300" />
                              )}
                              <span
                                className={`text-sm ${
                                  isCompleted
                                    ? "text-green-700"
                                    : isInProgress
                                    ? "text-blue-700"
                                    : "text-gray-500"
                                }`}
                              >
                                {module.title}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">{module.points} XP</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Submissions History */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            История работ
          </h2>

          {student.submissions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                Нет отправленных работ
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {student.submissions.map((submission) => (
                <Card key={submission.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">
                            {submission.module.title}
                          </h4>
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
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {submission.module.trail.title} •{" "}
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
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                            <span className="font-medium">Оценка: </span>
                            <span className="text-blue-600">{submission.review.score}/10</span>
                            {submission.review.comment && (
                              <p className="text-gray-600 mt-1 text-xs">
                                {submission.review.comment}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Link to review page */}
                      <Link
                        href={`/teacher/reviews/${submission.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Открыть работу"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
