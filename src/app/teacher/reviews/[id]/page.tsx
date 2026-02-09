import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrivileged, privilegedHasTrailAccess } from "@/lib/admin-access"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Clock,
  Github,
  Globe,
  ExternalLink,
  User,
  Calendar,
  BookOpen,
  FileText,
  Timer,
  Pencil,
} from "lucide-react"
import { ReviewForm } from "@/components/review-form"
import { MarkdownRenderer } from "@/components/markdown-renderer"

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}

export default async function ReviewPage({ params, searchParams }: Props) {
  const { id } = await params
  const { from: returnQuery } = await searchParams
  const backHref = returnQuery ? `/teacher?${returnQuery}` : "/teacher"
  const session = await getServerSession(authOptions)

  // Allow TEACHER, CO_ADMIN, and ADMIN roles
  if (!session || !isPrivileged(session.user.role)) {
    redirect("/dashboard")
  }

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          totalXP: true,
        },
      },
      module: {
        include: {
          trail: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      review: true,
    },
  })

  if (!submission) {
    notFound()
  }

  // Verify trail scope access for this user
  const hasAccess = await privilegedHasTrailAccess(
    session.user.id,
    session.user.role,
    submission.module.trailId
  )
  if (!hasAccess) {
    notFound()
  }

  // Fetch time tracking data for this submission
  const moduleProgress = await prisma.moduleProgress.findUnique({
    where: {
      userId_moduleId: {
        userId: submission.userId,
        moduleId: submission.moduleId,
      },
    },
    select: { startedAt: true },
  })

  // Get earliest submission for this user+module (for timeToFirstSubmit)
  const firstSubmission = await prisma.submission.findFirst({
    where: { userId: submission.userId, moduleId: submission.moduleId },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  })

  const moduleStartedAt = moduleProgress?.startedAt ?? null
  const firstSubmittedAt = firstSubmission?.createdAt ?? null
  const timeToFirstSubmitMs =
    moduleStartedAt && firstSubmittedAt
      ? firstSubmittedAt.getTime() - moduleStartedAt.getTime()
      : null
  const totalEditTimeMs =
    submission.editCount > 0 && submission.lastEditedAt
      ? submission.lastEditedAt.getTime() - submission.createdAt.getTime()
      : null

  /** Format milliseconds into a compact human-readable duration */
  function fmtDuration(ms: number | null): string {
    if (ms == null || ms < 0) return "—"
    const totalMinutes = Math.floor(ms / 60000)
    if (totalMinutes < 1) return "< 1мин"
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    const minutes = totalMinutes % 60
    if (days > 0) return `${days}д ${hours}ч`
    if (hours > 0) return minutes > 0 ? `${hours}ч ${minutes}мин` : `${hours}ч`
    return `${minutes}мин`
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="p-8">
      <Link
        href={backHref}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Назад к списку
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Submission Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">
                  {submission.module.trail.title}
                </Badge>
                <Badge
                  className={
                    submission.status === "PENDING"
                      ? "bg-blue-100 text-blue-700 border-0"
                      : submission.status === "APPROVED"
                      ? "bg-green-100 text-green-700 border-0"
                      : "bg-orange-100 text-orange-700 border-0"
                  }
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {submission.status === "PENDING"
                    ? "На проверке"
                    : submission.status === "APPROVED"
                    ? "Принято"
                    : "На доработку"}
                </Badge>
              </div>
              <CardTitle>{submission.module.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{submission.module.description}</p>

              {/* Links */}
              <div className="flex gap-4 mt-4">
                {submission.githubUrl && (
                  <a
                    href={submission.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {submission.deployUrl && (
                  <a
                    href={submission.deployUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0176D3] text-white rounded-lg hover:bg-[#014486]"
                  >
                    <Globe className="h-4 w-4" />
                    Деплой
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {submission.fileUrl && (
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <FileText className="h-4 w-4" />
                    Файл работы
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Student Comment */}
              {submission.comment && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Комментарий ученика
                  </h4>
                  <p className="text-gray-600">{submission.comment}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Requirements */}
          {submission.module.requirements && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Требования к проекту
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MarkdownRenderer content={submission.module.requirements} />
              </CardContent>
            </Card>
          )}

          {/* Review Form */}
          {submission.status === "PENDING" && (
            <Card>
              <CardHeader>
                <CardTitle>Оценка работы</CardTitle>
              </CardHeader>
              <CardContent>
                <ReviewForm
                  submissionId={submission.id}
                  moduleId={submission.moduleId}
                  userId={submission.userId}
                  modulePoints={submission.module.points}
                  returnTo={backHref}
                />
              </CardContent>
            </Card>
          )}

          {/* Existing Review */}
          {submission.review && (
            <Card>
              <CardHeader>
                <CardTitle>Результат проверки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-[#0176D3]">
                    {submission.review.score}/10
                  </div>
                  <div className="text-gray-500">Общая оценка</div>
                </div>

                {submission.review.strengths && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-700 mb-2">
                      Сильные стороны
                    </h4>
                    <p className="text-green-600">{submission.review.strengths}</p>
                  </div>
                )}

                {submission.review.improvements && (
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-medium text-orange-700 mb-2">
                      Что улучшить
                    </h4>
                    <p className="text-orange-600">
                      {submission.review.improvements}
                    </p>
                  </div>
                )}

                {submission.review.comment && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">
                      Комментарий
                    </h4>
                    <p className="text-gray-600">{submission.review.comment}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Информация об ученике
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-[#0176D3] text-white">
                    {getInitials(submission.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    href={`/dashboard/${submission.user.id}`}
                    className="font-medium hover:text-[#0176D3] hover:underline transition-colors"
                  >
                    {submission.user.name}
                  </Link>
                  <div className="text-sm text-gray-500">
                    {submission.user.email}
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Total XP</span>
                  <span className="font-medium">{submission.user.totalXP}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Calendar className="h-4 w-4" />
                  Дата отправки
                </div>
                <div className="font-medium">
                  {new Date(submission.createdAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Tracking Card */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Timer className="h-4 w-4" />
                Время выполнения
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {moduleStartedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Старт модуля</span>
                  <span className="font-medium">
                    {moduleStartedAt.toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">До первой отправки</span>
                <span className="font-medium">{fmtDuration(timeToFirstSubmitMs)}</span>
              </div>
              {submission.editCount > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 inline-flex items-center gap-1">
                      <Pencil className="h-3 w-3" />
                      Правок
                    </span>
                    <span className="font-medium">{submission.editCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Время редактирования</span>
                    <span className="font-medium">{fmtDuration(totalEditTimeMs)}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Последнее обновление</span>
                <span className="font-medium">
                  {new Date(submission.lastEditedAt ?? submission.createdAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
