import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Github,
  Globe,
  ExternalLink,
  FileText,
  Calendar,
} from "lucide-react"
import { SubmissionComments } from "@/components/submission-comments"

interface Props {
  params: Promise<{ id: string }>
}

export default async function StudentSubmissionPage({ params }: Props) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/login")
  }

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      module: {
        include: {
          trail: true,
        },
      },
      review: {
        include: {
          reviewer: {
            select: { name: true },
          },
        },
      },
    },
  })

  if (!submission) {
    notFound()
  }

  // Only allow owner to view their submission
  if (submission.userId !== session.user.id) {
    redirect("/dashboard")
  }

  const statusConfig = {
    PENDING: {
      label: "На проверке",
      icon: Clock,
      color: "bg-blue-100 text-blue-700",
    },
    APPROVED: {
      label: "Принято",
      icon: CheckCircle2,
      color: "bg-green-100 text-green-700",
    },
    REVISION: {
      label: "На доработку",
      icon: AlertCircle,
      color: "bg-orange-100 text-orange-700",
    },
    FAILED: {
      label: "Не принято",
      icon: XCircle,
      color: "bg-red-100 text-red-700",
    },
  }

  const status = statusConfig[submission.status as keyof typeof statusConfig]
  const StatusIcon = status.icon

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Назад в дашборд
      </Link>

      <div className="space-y-6">
        {/* Submission Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{submission.module.trail.title}</Badge>
              <Badge className={`${status.color} border-0`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
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

            {/* My Comment */}
            {submission.comment && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Мой комментарий
                </h4>
                <p className="text-gray-600">{submission.comment}</p>
              </div>
            )}

            {/* Submission Date */}
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>
                Отправлено{" "}
                {new Date(submission.createdAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Review Results */}
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
                <div className="text-gray-500">
                  Проверил: {submission.review.reviewer.name}
                </div>
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
                    Комментарий преподавателя
                  </h4>
                  <p className="text-gray-600">{submission.review.comment}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Comments Section */}
        <Card>
          <CardContent className="pt-6">
            <SubmissionComments
              submissionId={submission.id}
              currentUserId={session.user.id}
              currentUserRole={session.user.role}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
