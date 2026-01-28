import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { safeJsonParse } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import {
  ArrowRight,
  Clock,
  Star,
  CheckCircle2,
  BookOpen,
  Wrench,
  FolderGit2,
  Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SubmitProjectForm } from "@/components/submit-project-form"
import { SubmitPracticeForm } from "@/components/submit-practice-form"
import { SubmittedWorkCard } from "@/components/submitted-work-card"
import { AssessmentSection } from "@/components/assessment-section"
import { MarkdownRenderer } from "@/components/markdown-renderer"

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

  const courseModule = await prisma.module.findUnique({
    where: { slug },
    include: {
      trail: {
        include: {
          modules: {
            orderBy: { order: "asc" },
            select: { id: true, slug: true, title: true, order: true },
          },
        },
      },
      questions: {
        orderBy: { order: "asc" },
      },
    },
  })

  if (!courseModule) {
    notFound()
  }

  // Check if user is admin or teacher (privileged users can view any module)
  const isPrivileged = session.user.role === "ADMIN" || session.user.role === "TEACHER"

  // Check enrollment for students only
  let enrollment = null
  if (!isPrivileged) {
    enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_trailId: {
          userId: session.user.id,
          trailId: courseModule.trailId,
        },
      },
    })

    if (!enrollment) {
      redirect(`/trails/${courseModule.trail.slug}`)
    }
  }

  // Get progress
  const progress = await prisma.moduleProgress.findUnique({
    where: {
      userId_moduleId: {
        userId: session.user.id,
        moduleId: courseModule.id,
      },
    },
  })

  // Get submission if project OR practice with requiresSubmission
  let submission = null
  if (courseModule.type === "PROJECT" || courseModule.requiresSubmission) {
    submission = await prisma.submission.findFirst({
      where: {
        userId: session.user.id,
        moduleId: courseModule.id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        review: true,
      },
    })
  }

  const requiresSubmission = courseModule.requiresSubmission

  // Get question attempts for quiz
  const questionAttempts = await prisma.questionAttempt.findMany({
    where: {
      userId: session.user.id,
      questionId: { in: courseModule.questions.map((q) => q.id) },
    },
  })

  const isCompleted = progress?.status === "COMPLETED"
  const isProject = courseModule.type === "PROJECT"
  const isPractice = courseModule.type === "PRACTICE"
  const hasQuestions = courseModule.questions.length > 0
  const TypeIcon = typeIcons[courseModule.type]

  // Find next module in the trail
  const trailModules = courseModule.trail.modules
  const currentIndex = trailModules.findIndex((m) => m.id === courseModule.id)
  const nextModule = currentIndex < trailModules.length - 1 ? trailModules[currentIndex + 1] : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Breadcrumbs
            items={[
              { label: "Trails", href: "/trails" },
              { label: courseModule.trail.title, href: `/trails/${courseModule.trail.slug}` },
              { label: courseModule.title },
            ]}
            className="mb-4"
          />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-gray-100">
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {typeLabels[courseModule.type]}
                </Badge>
                {isCompleted && (
                  <Badge className="bg-green-100 text-green-700 border-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Завершено
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{courseModule.title}</h1>
              <p className="text-gray-600 mt-1">{courseModule.description}</p>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {courseModule.duration}
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4" />
                {courseModule.points} XP
              </div>
              {/* Admin/Teacher edit button */}
              {isPrivileged && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/content/modules/${courseModule.id}`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Редактировать
                  </Link>
                </Button>
              )}
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
              <CardContent className="p-6">
                {courseModule.content ? (
                  <MarkdownRenderer content={courseModule.content} />
                ) : (
                  <p className="text-gray-500">Контент модуля скоро появится</p>
                )}
              </CardContent>
            </Card>

            {/* Requirements for projects */}
            {isProject && courseModule.requirements && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Требования к проекту</CardTitle>
                </CardHeader>
                <CardContent>
                  <MarkdownRenderer content={courseModule.requirements} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {isProject ? (
              /* PROJECT: форма сдачи проекта с возможностью редактирования */
              <Card>
                <CardHeader>
                  <CardTitle>Сдать проект</CardTitle>
                </CardHeader>
                <CardContent>
                  {submission ? (
                    <>
                      <SubmittedWorkCard
                        submission={{
                          id: submission.id,
                          githubUrl: submission.githubUrl,
                          deployUrl: submission.deployUrl,
                          fileUrl: submission.fileUrl,
                          comment: submission.comment,
                          status: submission.status,
                          createdAt: submission.createdAt.toISOString(),
                          review: submission.review ? {
                            id: submission.review.id,
                            score: submission.review.score,
                            comment: submission.review.comment,
                            createdAt: submission.review.createdAt.toISOString(),
                          } : null,
                        }}
                        moduleId={courseModule.id}
                        moduleType="PROJECT"
                      />
                      {submission.status === "REVISION" && (
                        <div className="mt-4 pt-4 border-t">
                          <SubmitProjectForm
                            moduleId={courseModule.id}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <SubmitProjectForm
                      moduleId={courseModule.id}
                    />
                  )}
                </CardContent>
              </Card>
            ) : isPractice && !hasQuestions ? (
              /* PRACTICE БЕЗ вопросов: форма сдачи практики с возможностью редактирования */
              <Card>
                <CardHeader>
                  <CardTitle>Сдать практическую работу</CardTitle>
                </CardHeader>
                <CardContent>
                  {submission ? (
                    <>
                      <SubmittedWorkCard
                        submission={{
                          id: submission.id,
                          githubUrl: submission.githubUrl,
                          deployUrl: submission.deployUrl,
                          fileUrl: submission.fileUrl,
                          comment: submission.comment,
                          status: submission.status,
                          createdAt: submission.createdAt.toISOString(),
                          review: submission.review ? {
                            id: submission.review.id,
                            score: submission.review.score,
                            comment: submission.review.comment,
                            createdAt: submission.review.createdAt.toISOString(),
                          } : null,
                        }}
                        moduleId={courseModule.id}
                        moduleType="PRACTICE"
                      />
                      {submission.status === "REVISION" && (
                        <div className="mt-4 pt-4 border-t">
                          <SubmitPracticeForm
                            moduleId={courseModule.id}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <SubmitPracticeForm
                      moduleId={courseModule.id}
                    />
                  )}
                </CardContent>
              </Card>
            ) : isPractice ? (
              /* PRACTICE с вопросами: Квиз + форма сдачи (PRACTICE всегда требует сдачу) */
              <>
                {/* Assessment Section - handles quiz */}
                <AssessmentSection
                  questions={courseModule.questions.map((q) => ({
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
                  moduleId={courseModule.id}
                  trailSlug={courseModule.trail.slug}
                  moduleType={courseModule.type}
                  isCompleted={isCompleted}
                />

                {/* Practice submission form - PRACTICE с возможностью редактирования */}
                <Card>
                    <CardHeader>
                      <CardTitle>Сдать практическую работу</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {submission ? (
                        <>
                          <SubmittedWorkCard
                            submission={{
                              id: submission.id,
                              githubUrl: submission.githubUrl,
                              deployUrl: submission.deployUrl,
                              fileUrl: submission.fileUrl,
                              comment: submission.comment,
                              status: submission.status,
                              createdAt: submission.createdAt.toISOString(),
                              review: submission.review ? {
                                id: submission.review.id,
                                score: submission.review.score,
                                comment: submission.review.comment,
                                createdAt: submission.review.createdAt.toISOString(),
                              } : null,
                            }}
                            moduleId={courseModule.id}
                            moduleType="PRACTICE"
                          />
                          {submission.status === "REVISION" && (
                            <div className="mt-4 pt-4 border-t">
                              <SubmitPracticeForm
                                moduleId={courseModule.id}
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <SubmitPracticeForm
                          moduleId={courseModule.id}
                        />
                      )}
                    </CardContent>
                </Card>
              </>
            ) : (
              /* THEORY: AssessmentSection (квиз или "Теоретический материал") */
              <AssessmentSection
                questions={courseModule.questions.map((q) => ({
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
                moduleId={courseModule.id}
                trailSlug={courseModule.trail.slug}
                moduleType={courseModule.type}
                isCompleted={isCompleted}
              />
            )}
          </div>
        </div>

        {/* Next Module Button */}
        {isCompleted && nextModule && (
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
              <Link href={`/module/${nextModule.slug}`}>
                Следующий модуль: {nextModule.title}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}

        {/* Trail completion message */}
        {isCompleted && !nextModule && (
          <div className="mt-8 text-center">
            <div className="inline-flex flex-col items-center p-6 bg-green-50 rounded-xl border border-green-200">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
              <h3 className="text-lg font-semibold text-green-800">Trail завершён!</h3>
              <p className="text-green-600 text-sm mt-1">
                Вы прошли все модули в этом направлении
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href={`/trails/${courseModule.trail.slug}`}>
                  Вернуться к Trail
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
