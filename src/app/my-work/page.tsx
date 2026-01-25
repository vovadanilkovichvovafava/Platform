import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
  Github,
  Globe,
  FileText,
} from "lucide-react"

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: {
    label: "На проверке",
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  APPROVED: {
    label: "Принято",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  REVISION: {
    label: "На доработку",
    color: "bg-orange-100 text-orange-700",
    icon: AlertCircle,
  },
  FAILED: {
    label: "Провал",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
}

export default async function MyWorkPage() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.id) {
    redirect("/login")
  }

  const submissions = await prisma.submission.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      module: {
        include: {
          trail: true,
        },
      },
      review: true,
    },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Мои работы
          </h1>
          <p className="text-lg text-gray-600">
            Все ваши проекты и их статусы
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {submissions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Нет отправленных работ
            </h3>
            <p className="text-gray-600 mb-6">
              Начните обучение и сдайте свой первый проект
            </p>
            <Button asChild>
              <Link href="/trails">Смотреть trails</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission: typeof submissions[number]) => {
              const config = statusConfig[submission.status]
              const StatusIcon = config.icon

              return (
                <Card key={submission.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="secondary"
                            className="text-xs"
                          >
                            {submission.module.trail.title}
                          </Badge>
                          <Badge className={`${config.color} border-0`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>

                        <Link
                          href={`/module/${submission.module.slug}`}
                          className="text-lg font-semibold text-gray-900 hover:text-[#0176D3]"
                        >
                          {submission.module.title}
                        </Link>

                        <p className="text-sm text-gray-500 mt-1">
                          Отправлено{" "}
                          {new Date(submission.createdAt).toLocaleDateString(
                            "ru-RU",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            }
                          )}
                        </p>

                        {submission.comment && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {submission.comment}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {submission.githubUrl && (
                          <a
                            href={submission.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
                          >
                            <Github className="h-4 w-4 mr-1" />
                            GitHub
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        )}
                        {submission.deployUrl && (
                          <a
                            href={submission.deployUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
                          >
                            <Globe className="h-4 w-4 mr-1" />
                            Деплой
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        )}
                      </div>

                      {submission.review && (
                        <div className="text-center px-6 py-3 bg-gray-50 rounded-lg">
                          <div className="text-3xl font-bold text-[#0176D3]">
                            {submission.review.score}/10
                          </div>
                          <div className="text-xs text-gray-500">Оценка</div>
                        </div>
                      )}
                    </div>

                    {submission.review && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Обратная связь
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {submission.review.strengths && (
                            <div className="p-3 bg-green-50 rounded-lg">
                              <div className="text-sm font-medium text-green-700 mb-1">
                                Сильные стороны
                              </div>
                              <p className="text-sm text-green-600">
                                {submission.review.strengths}
                              </p>
                            </div>
                          )}
                          {submission.review.improvements && (
                            <div className="p-3 bg-orange-50 rounded-lg">
                              <div className="text-sm font-medium text-orange-700 mb-1">
                                Что улучшить
                              </div>
                              <p className="text-sm text-orange-600">
                                {submission.review.improvements}
                              </p>
                            </div>
                          )}
                        </div>
                        {submission.review.comment && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm font-medium text-gray-700 mb-1">
                              Комментарий
                            </div>
                            <p className="text-sm text-gray-600">
                              {submission.review.comment}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
