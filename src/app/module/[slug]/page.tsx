import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { safeJsonParse } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Clock,
  Star,
  CheckCircle2,
  BookOpen,
  Wrench,
  FolderGit2,
} from "lucide-react"
import { SubmitProjectForm } from "@/components/submit-project-form"
import { SubmitPracticeForm } from "@/components/submit-practice-form"
import { AssessmentSection } from "@/components/assessment-section"

const typeIcons: Record<string, typeof BookOpen> = {
  THEORY: BookOpen,
  PRACTICE: Wrench,
  PROJECT: FolderGit2,
}

const typeLabels: Record<string, string> = {
  THEORY: "Теория",
  PRACTICE: "Практика",
  PROJECT: "Проект",
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ModulePage({ params }: Props) {
  const { slug } = await params
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.id) {
    redirect("/login")
  }

  const module = await prisma.module.findUnique({
    where: { slug },
    include: {
      trail: true,
      questions: {
        orderBy: { order: "asc" },
      },
    },
  })

  if (!module) {
    notFound()
  }

  // Check enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_trailId: {
        userId: session.user.id,
        trailId: module.trailId,
      },
    },
  })

  if (!enrollment) {
    redirect(`/trails/${module.trail.slug}`)
  }

  // Get progress
  const progress = await prisma.moduleProgress.findUnique({
    where: {
      userId_moduleId: {
        userId: session.user.id,
        moduleId: module.id,
      },
    },
  })

  // Get submission if project OR practice with requiresSubmission
  let submission = null
  if (module.type === "PROJECT" || module.requiresSubmission) {
    submission = await prisma.submission.findFirst({
      where: {
        userId: session.user.id,
        moduleId: module.id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        review: true,
      },
    })
  }

  const requiresSubmission = module.requiresSubmission

  // Get question attempts for quiz
  const questionAttempts = await prisma.questionAttempt.findMany({
    where: {
      userId: session.user.id,
      questionId: { in: module.questions.map((q) => q.id) },
    },
  })

  const isCompleted = progress?.status === "COMPLETED"
  const isProject = module.type === "PROJECT"
  const TypeIcon = typeIcons[module.type]

  // Parse inline markdown (bold)
  const parseInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  // Simple markdown-like rendering
  const renderContent = (content: string) => {
    const lines = content.split("\n")
    return lines.map((line, i) => {
      if (line.startsWith("# ")) {
        return (
          <h1 key={i} className="text-2xl font-bold mt-8 mb-4">
            {parseInlineMarkdown(line.slice(2))}
          </h1>
        )
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={i} className="text-xl font-semibold mt-6 mb-3">
            {parseInlineMarkdown(line.slice(3))}
          </h2>
        )
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={i} className="text-lg font-medium mt-4 mb-2">
            {parseInlineMarkdown(line.slice(4))}
          </h3>
        )
      }
      if (line.startsWith("- ")) {
        return (
          <li key={i} className="ml-4 mb-1">
            {parseInlineMarkdown(line.slice(2))}
          </li>
        )
      }
      if (/^\d+\. /.test(line)) {
        return (
          <li key={i} className="ml-4 mb-1 list-decimal">
            {parseInlineMarkdown(line.slice(line.indexOf(" ") + 1))}
          </li>
        )
      }
      if (line.trim() === "") {
        return <br key={i} />
      }
      return (
        <p key={i} className="mb-2">
          {parseInlineMarkdown(line)}
        </p>
      )
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Link
            href={`/trails/${module.trail.slug}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад к {module.trail.title}
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-gray-100">
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {typeLabels[module.type]}
                </Badge>
                {isCompleted && (
                  <Badge className="bg-green-100 text-green-700 border-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Завершено
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{module.title}</h1>
              <p className="text-gray-600 mt-1">{module.description}</p>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {module.duration}
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4" />
                {module.points} XP
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6 prose prose-gray max-w-none">
                {module.content ? (
                  renderContent(module.content)
                ) : (
                  <p className="text-gray-500">Контент модуля скоро появится</p>
                )}
              </CardContent>
            </Card>

            {/* Requirements for projects */}
            {isProject && module.requirements && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Требования к проекту</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-gray max-w-none">
                  {renderContent(module.requirements)}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {isProject ? (
              <Card>
                <CardHeader>
                  <CardTitle>Сдать проект</CardTitle>
                </CardHeader>
                <CardContent>
                  {submission ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-600 mb-2">
                          Статус работы
                        </div>
                        <Badge
                          className={
                            submission.status === "APPROVED"
                              ? "bg-green-100 text-green-700 border-0"
                              : submission.status === "REVISION"
                              ? "bg-orange-100 text-orange-700 border-0"
                              : submission.status === "FAILED"
                              ? "bg-red-100 text-red-700 border-0"
                              : "bg-blue-100 text-blue-700 border-0"
                          }
                        >
                          {submission.status === "APPROVED"
                            ? "Принято"
                            : submission.status === "REVISION"
                            ? "На доработку"
                            : submission.status === "FAILED"
                            ? "Провал"
                            : "На проверке"}
                        </Badge>
                      </div>

                      {submission.review && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Оценка</span>
                            <span className="text-2xl font-bold text-[#0176D3]">
                              {submission.review.score}/10
                            </span>
                          </div>
                          {submission.review.comment && (
                            <div>
                              <div className="text-sm font-medium mb-1">
                                Комментарий
                              </div>
                              <p className="text-sm text-gray-600">
                                {submission.review.comment}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {submission.status === "REVISION" && (
                        <SubmitProjectForm
                          moduleId={module.id}
                          moduleSlug={module.slug}
                        />
                      )}
                    </div>
                  ) : (
                    <SubmitProjectForm
                      moduleId={module.id}
                      moduleSlug={module.slug}
                    />
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Assessment Section - handles quiz + completion */}
                <AssessmentSection
                  questions={module.questions.map((q) => ({
                    id: q.id,
                    type: (q.type || "SINGLE_CHOICE") as "SINGLE_CHOICE" | "MATCHING" | "ORDERING" | "CASE_ANALYSIS",
                    question: q.question,
                    options: safeJsonParse<string[]>(q.options, []),
                    data: q.data ? safeJsonParse(q.data, null) : null,
                    order: q.order,
                  }))}
                  initialAttempts={questionAttempts.map((a) => ({
                    questionId: a.questionId,
                    isCorrect: a.isCorrect,
                    attempts: a.attempts,
                    earnedScore: a.earnedScore,
                  }))}
                  moduleId={module.id}
                  moduleSlug={module.slug}
                  trailSlug={module.trail.slug}
                  modulePoints={module.points}
                  moduleType={module.type}
                  isCompleted={isCompleted}
                />

                {/* Practice submission form */}
                {requiresSubmission && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Сдать практическую работу</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {submission ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-sm font-medium text-gray-600 mb-2">
                              Статус работы
                            </div>
                            <Badge
                              className={
                                submission.status === "APPROVED"
                                  ? "bg-green-100 text-green-700 border-0"
                                  : submission.status === "REVISION"
                                  ? "bg-orange-100 text-orange-700 border-0"
                                  : submission.status === "FAILED"
                                  ? "bg-red-100 text-red-700 border-0"
                                  : "bg-purple-100 text-purple-700 border-0"
                              }
                            >
                              {submission.status === "APPROVED"
                                ? "Принято"
                                : submission.status === "REVISION"
                                ? "На доработку"
                                : submission.status === "FAILED"
                                ? "Провал"
                                : "На проверке"}
                            </Badge>
                            {submission.fileUrl && (
                              <a
                                href={submission.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-purple-600 hover:underline block mt-2"
                              >
                                Посмотреть отправленный файл
                              </a>
                            )}
                          </div>

                          {submission.review && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Оценка</span>
                                <span className="text-2xl font-bold text-purple-600">
                                  {submission.review.score}/10
                                </span>
                              </div>
                              {submission.review.comment && (
                                <div>
                                  <div className="text-sm font-medium mb-1">
                                    Комментарий
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    {submission.review.comment}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {submission.status === "REVISION" && (
                            <SubmitPracticeForm
                              moduleId={module.id}
                              moduleSlug={module.slug}
                            />
                          )}
                        </div>
                      ) : (
                        <SubmitPracticeForm
                          moduleId={module.id}
                          moduleSlug={module.slug}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
