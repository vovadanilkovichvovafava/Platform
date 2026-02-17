import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { safeJsonParse } from "@/lib/utils"
import { checkTrailPasswordAccess } from "@/lib/trail-password"
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
import { ModuleButton } from "@/components/module-button"
import { ModuleStartGate } from "@/components/module-start-gate"

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

  // Check if user is admin, co-admin, or teacher (privileged users can view any module)
  const isPrivileged = session.user.role === "ADMIN" || session.user.role === "TEACHER" || session.user.role === "CO_ADMIN"

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

  // Check password protection for the trail
  // Even privileged users don't get automatic access - only creator, users who entered password, or enrolled students
  const trailPasswordInfo = await prisma.trail.findUnique({
    where: { id: courseModule.trailId },
    select: {
      isPasswordProtected: true,
      createdById: true,
    },
  })

  if (trailPasswordInfo?.isPasswordProtected) {
    const passwordAccessResult = await checkTrailPasswordAccess(courseModule.trailId, session.user.id)
    if (!passwordAccessResult.hasAccess) {
      // Redirect to trail page where password form will be shown
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

  // Get user preference for module warning modal
  const userPrefs = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { skipModuleWarning: true },
  })
  const skipModuleWarning = userPrefs?.skipModuleWarning ?? false

  const isCompleted = progress?.status === "COMPLETED"
  const isInProgress = progress?.status === "IN_PROGRESS"
  const isProject = courseModule.type === "PROJECT"
  const isPractice = courseModule.type === "PRACTICE"
  const hasQuestions = courseModule.questions.length > 0
  const TypeIcon = typeIcons[courseModule.type]

  // Find next module in the trail
  const trailModules = courseModule.trail.modules
  const currentIndex = trailModules.findIndex((m) => m.id === courseModule.id)
  const nextModule = currentIndex < trailModules.length - 1 ? trailModules[currentIndex + 1] : null

  // Server-side gate: block module content for students who haven't confirmed start
  // This catches direct URL access that client-side modals can't intercept
  const needsStartConfirmation =
    !isPrivileged &&
    !skipModuleWarning &&
    !isCompleted &&
    !isInProgress

  if (needsStartConfirmation) {
    return (
      <ModuleStartGate
        moduleId={courseModule.id}
        moduleTitle={courseModule.title}
        trailSlug={courseModule.trail.slug}
      />
    )
  }

  // If student is here and module is NOT_STARTED but they skipped the warning,
  // auto-start the module so startedAt is recorded
  if (!isPrivileged && !progress) {
    await prisma.moduleProgress.upsert({
      where: {
        userId_moduleId: {
          userId: session.user.id,
          moduleId: courseModule.id,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        moduleId: courseModule.id,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    })
  }

  // If module was auto-started (from previous submission's instant unlock) but
  // startedAt was not set, set it now that the student is actually visiting
  if (!isPrivileged && progress && !progress.startedAt) {
    await prisma.moduleProgress.update({
      where: {
        userId_moduleId: {
          userId: session.user.id,
          moduleId: courseModule.id,
        },
      },
      data: { startedAt: new Date() },
    })
  }

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
                          lastRenotifiedAt: submission.lastRenotifiedAt?.toISOString() ?? null,
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
                          lastRenotifiedAt: submission.lastRenotifiedAt?.toISOString() ?? null,
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
                  userId={session.user.id}
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
                userId={session.user.id}
              />
            )}
          </div>
        </div>

        {/* Next Module Button - show when completed OR when work is submitted (PENDING) */}
        {isCompleted && nextModule && (
          <div className="mt-8 flex justify-center">
            <ModuleButton
              href={`/module/${nextModule.slug}`}
              moduleSlug={nextModule.slug}
              moduleId={nextModule.id}
              skipWarning={skipModuleWarning}
              className="bg-orange-500 hover:bg-orange-600 text-white h-11 px-6"
            >
              Следующий модуль: {nextModule.title}
              <ArrowRight className="h-4 w-4 ml-2" />
            </ModuleButton>
          </div>
        )}

        {/* CTA to next module when submission is PENDING (not yet reviewed) - FREE mode only */}
        {!isCompleted && submission?.status === "PENDING" && nextModule && courseModule.trail.allowSkipReview && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-200 max-w-md">
              <p className="text-amber-700 text-sm">
                Ваша работа отправлена на проверку. Вы можете продолжить обучение, не дожидаясь результата.
              </p>
            </div>
            <ModuleButton
              href={`/module/${nextModule.slug}`}
              moduleSlug={nextModule.slug}
              moduleId={nextModule.id}
              skipWarning={skipModuleWarning}
              className="bg-blue-500 hover:bg-blue-600 text-white h-11 px-6"
            >
              Перейти к следующей практике
              <ArrowRight className="h-4 w-4 ml-2" />
            </ModuleButton>
          </div>
        )}

        {/* STRICT mode: show "waiting for review" message when submission is PENDING */}
        {!isCompleted && submission?.status === "PENDING" && !courseModule.trail.allowSkipReview && (
          <div className="mt-8 flex justify-center">
            <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-200 max-w-md">
              <p className="text-amber-700 text-sm">
                Ваша работа отправлена на проверку. Переход к следующему модулю будет доступен после проверки преподавателем.
              </p>
            </div>
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
