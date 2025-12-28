import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
} from "lucide-react"
import { ReviewForm } from "@/components/review-form"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReviewPage({ params }: Props) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "TEACHER") {
    redirect("/dashboard")
  }

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      user: true,
      module: {
        include: {
          trail: true,
        },
      },
      review: true,
    },
  })

  if (!submission) {
    notFound()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Simple markdown-like rendering
  const renderContent = (content: string) => {
    const lines = content.split("\n")
    return lines.map((line, i) => {
      if (line.startsWith("## ")) {
        return (
          <h3 key={i} className="text-lg font-semibold mt-4 mb-2">
            {line.slice(3)}
          </h3>
        )
      }
      if (line.startsWith("### ")) {
        return (
          <h4 key={i} className="text-base font-medium mt-3 mb-1">
            {line.slice(4)}
          </h4>
        )
      }
      if (line.startsWith("- ")) {
        return (
          <li key={i} className="ml-4 mb-1">
            {line.slice(2)}
          </li>
        )
      }
      if (line.trim() === "") {
        return <br key={i} />
      }
      return (
        <p key={i} className="mb-1">
          {line}
        </p>
      )
    })
  }

  return (
    <div className="p-8">
      <Link
        href="/teacher"
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
              <CardContent className="prose prose-sm max-w-none">
                {renderContent(submission.module.requirements)}
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
                  <div className="font-medium">{submission.user.name}</div>
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
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Streak</span>
                  <span className="font-medium">
                    {submission.user.currentStreak} дней
                  </span>
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
        </div>
      </div>
    </div>
  )
}
