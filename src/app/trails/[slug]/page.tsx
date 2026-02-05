import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Code,
  Target,
  Palette,
  Lightbulb,
  Clock,
  Star,
  CheckCircle2,
  PlayCircle,
  Lock,
  BookOpen,
  Wrench,
  FolderGit2,
  LucideIcon,
  AlertCircle,
  Award,
  Pencil,
} from "lucide-react"
import { ClaimCertificateButton } from "@/components/claim-certificate-button"
import { TrailEditButton } from "@/components/trail-edit-button"
import { TrailPasswordForm } from "@/components/trail-password-form"
import { checkTrailPasswordAccess } from "@/lib/trail-password"

const iconMap: Record<string, LucideIcon> = {
  Code,
  Target,
  Palette,
  Lightbulb,
}

const typeIcons: Record<string, LucideIcon> = {
  THEORY: BookOpen,
  PRACTICE: Wrench,
  PROJECT: FolderGit2,
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function TrailPage({ params }: Props) {
  const { slug } = await params
  const session = await getServerSession(authOptions)

  const trail = await prisma.trail.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { order: "asc" },
      },
    },
  })

  // Fetch password protection fields separately (not included in 'include')
  const trailWithPassword = trail ? await prisma.trail.findUnique({
    where: { id: trail.id },
    select: {
      isPasswordProtected: true,
      passwordHint: true,
      createdById: true,
    },
  }) : null

  // Merge password fields into trail
  const trailData = trail ? {
    ...trail,
    isPasswordProtected: trailWithPassword?.isPasswordProtected ?? false,
    passwordHint: trailWithPassword?.passwordHint ?? null,
    createdById: trailWithPassword?.createdById ?? null,
  } : null

  if (!trail) {
    notFound()
  }

  // Check access for restricted or unpublished trails
  const isPrivilegedUser = session?.user.role === "ADMIN" || session?.user.role === "TEACHER" || session?.user.role === "CO_ADMIN"

  // If trail is unpublished, only privileged users or users with explicit access can view
  if (!trail.isPublished) {
    if (!session) {
      redirect("/login")
    }

    if (!isPrivilegedUser) {
      const hasAccess = await prisma.studentTrailAccess.findUnique({
        where: {
          studentId_trailId: {
            studentId: session.user.id,
            trailId: trail.id,
          },
        },
      })

      if (!hasAccess) {
        redirect("/trails") // Redirect to trails list if no access
      }
    }
  }
  // If trail is restricted (but published), check access
  else if (trail.isRestricted) {
    if (!session) {
      redirect("/login")
    }

    if (!isPrivilegedUser) {
      const hasAccess = await prisma.studentTrailAccess.findUnique({
        where: {
          studentId_trailId: {
            studentId: session.user.id,
            trailId: trail.id,
          },
        },
      })

      if (!hasAccess) {
        redirect("/trails") // Redirect to trails list if no access
      }
    }
  }

  // Check password protection access
  // IMPORTANT: Even privileged users (admin/teacher) don't get automatic access
  // Only: creator, users who entered password, enrolled students get access
  let needsPasswordUnlock = false
  if (trailData?.isPasswordProtected && session) {
    const passwordAccessResult = await checkTrailPasswordAccess(trail.id, session.user.id)
    if (!passwordAccessResult.hasAccess) {
      needsPasswordUnlock = true
    }
  } else if (trailData?.isPasswordProtected && !session) {
    // Not logged in - redirect to login
    redirect("/login")
  }

  let isEnrolled = false
  const moduleProgressMap: Record<string, string> = {}
  let taskProgress: { currentLevel: string; middleStatus: string; juniorStatus: string; seniorStatus: string } | null = null
  let hasCertificate = false

  if (session) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_trailId: {
          userId: session.user.id,
          trailId: trail.id,
        },
      },
    })
    isEnrolled = !!enrollment

    if (isEnrolled) {
      const progress = await prisma.moduleProgress.findMany({
        where: {
          userId: session.user.id,
          moduleId: { in: trail.modules.map((m) => m.id) },
        },
      })
      progress.forEach((p) => {
        moduleProgressMap[p.moduleId] = p.status
      })

      // Get task progress for project levels
      const tp = await prisma.taskProgress.findUnique({
        where: {
          userId_trailId: {
            userId: session.user.id,
            trailId: trail.id,
          },
        },
      })
      taskProgress = tp || {
        currentLevel: "MIDDLE",
        middleStatus: "PENDING",
        juniorStatus: "LOCKED",
        seniorStatus: "LOCKED",
      }

      // Check if certificate already exists
      const certificate = await prisma.certificate.findUnique({
        where: {
          userId_trailId: {
            userId: session.user.id,
            trailId: trail.id,
          },
        },
      })
      hasCertificate = !!certificate
    }
  }

  // Separate assessment modules and project modules
  const assessmentModules = trail.modules.filter(m => m.type !== "PROJECT")
  const projectModules = trail.modules.filter(m => m.type === "PROJECT")

  // Check if all assessments are completed
  const assessmentCompletedCount = assessmentModules.filter(
    m => moduleProgressMap[m.id] === "COMPLETED"
  ).length
  const allAssessmentsCompleted = assessmentModules.length > 0 && assessmentCompletedCount === assessmentModules.length

  // Check if at least one project is completed
  const completedProjectCount = projectModules.filter(
    m => moduleProgressMap[m.id] === "COMPLETED"
  ).length
  const hasCompletedProject = completedProjectCount > 0

  // Check if all modules are completed (eligible for certificate)
  const allModulesCompleted = allAssessmentsCompleted && hasCompletedProject

  const progressPercent = assessmentModules.length > 0
    ? Math.round((assessmentCompletedCount / assessmentModules.length) * 100)
    : 0

  const totalXP = trail.modules.reduce((sum, m) => sum + m.points, 0)
  const Icon = iconMap[trail.icon] || Code

  // Check if user is admin or teacher (to show level badges)
  const isPrivileged = session?.user?.role === "ADMIN" || session?.user?.role === "TEACHER" || session?.user?.role === "CO_ADMIN"

  // Capture values for server action closure
  const trailId = trail.id
  const firstModuleId = assessmentModules.length > 0 ? assessmentModules[0].id : null

  async function handleEnroll() {
    "use server"

    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
      redirect("/login")
    }

    try {
      // Use upsert to prevent duplicate enrollment errors
      await prisma.enrollment.upsert({
        where: {
          userId_trailId: {
            userId: session.user.id,
            trailId: trailId,
          },
        },
        update: {},
        create: {
          userId: session.user.id,
          trailId: trailId,
        },
      })

      // Create task progress (start with MIDDLE) - use upsert
      await prisma.taskProgress.upsert({
        where: {
          userId_trailId: {
            userId: session.user.id,
            trailId: trailId,
          },
        },
        update: {},
        create: {
          userId: session.user.id,
          trailId: trailId,
          currentLevel: "MIDDLE",
          middleStatus: "PENDING",
          juniorStatus: "LOCKED",
          seniorStatus: "LOCKED",
        },
      })

      // Start first assessment module - use upsert
      if (firstModuleId) {
        await prisma.moduleProgress.upsert({
          where: {
            userId_moduleId: {
              userId: session.user.id,
              moduleId: firstModuleId,
            },
          },
          update: {},
          create: {
            userId: session.user.id,
            moduleId: firstModuleId,
            status: "IN_PROGRESS",
            startedAt: new Date(),
          },
        })
      }
    } catch (error) {
      console.error("Enrollment error:", error)
      throw error
    }

    redirect(`/trails/${slug}`)
  }

  // Determine which project is available based on task progress
  const getProjectStatus = (level: string) => {
    if (!taskProgress) return "LOCKED"

    if (level === "Junior") {
      return taskProgress.juniorStatus
    } else if (level === "Middle") {
      return taskProgress.middleStatus
    } else if (level === "Senior") {
      return taskProgress.seniorStatus
    }
    return "LOCKED"
  }

  // Show password unlock form if trail is password protected and user doesn't have access
  if (needsPasswordUnlock) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TrailPasswordForm
          trailId={trail.id}
          trailTitle={trail.title}
          trailColor={trail.color}
          hint={trailData?.passwordHint}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="relative py-12"
        style={{
          background: `linear-gradient(135deg, ${trail.color}15 0%, ${trail.color}05 100%)`,
        }}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${trail.color} 0%, ${trail.color}99 100%)`,
              }}
            >
              <Icon className="h-10 w-10 text-white" />
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {trail.title}
                  </h1>
                  <p className="text-lg text-gray-600 mb-4">{trail.subtitle}</p>
                </div>
                {/* Admin/Teacher edit button */}
                {isPrivileged && (
                  <TrailEditButton
                    trail={{
                      id: trail.id,
                      title: trail.title,
                      subtitle: trail.subtitle,
                      description: trail.description,
                      icon: trail.icon,
                      color: trail.color,
                      duration: trail.duration,
                      isPublished: trail.isPublished,
                    }}
                  />
                )}
              </div>
              <p className="text-gray-600 mb-6 max-w-2xl">
                {trail.description}
              </p>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {trail.duration}
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {assessmentModules.length} тестов
                </div>
                <div className="flex items-center gap-1">
                  <FolderGit2 className="h-4 w-4" />
                  {projectModules.length} заданий
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  {totalXP} XP
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto">
              {isEnrolled ? (
                <Card className="md:w-64">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-gray-600 mb-2">
                      Прогресс оценки
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-[#2E844A]">
                        {progressPercent}%
                      </span>
                      <span className="text-sm text-gray-500">
                        {assessmentCompletedCount}/{assessmentModules.length}
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </CardContent>
                </Card>
              ) : session ? (
                <form action={handleEnroll}>
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-[#0176D3] hover:bg-[#014486] w-full md:w-auto"
                  >
                    Начать оценку
                  </Button>
                </form>
              ) : (
                <Button asChild size="lg" className="bg-[#0176D3] hover:bg-[#014486] w-full md:w-auto">
                  <Link href="/login">Войти для начала</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Assessment Section */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Оценка знаний</h2>
          <p className="text-gray-500 mb-6">Пройдите тесты для получения доступа к заданиям</p>

          <div className="space-y-4">
            {assessmentModules.map((module, index) => {
              const TypeIcon = typeIcons[module.type]
              const status = moduleProgressMap[module.id] || "NOT_STARTED"
              const isCompleted = status === "COMPLETED"
              const isInProgress = status === "IN_PROGRESS"

              // Lock if not enrolled or previous not completed
              let isLocked = !isEnrolled
              if (isEnrolled && index > 0) {
                const prevModule = assessmentModules[index - 1]
                const prevStatus = moduleProgressMap[prevModule.id]
                if (prevStatus !== "COMPLETED" && status === "NOT_STARTED") {
                  isLocked = true
                }
              }

              return (
                <Card
                  key={module.id}
                  className={`transition-all ${
                    isLocked ? "opacity-60" : "hover:shadow-md cursor-pointer"
                  }`}
                >
                  <CardContent className="p-0">
                    {isLocked ? (
                      <div className="flex items-center gap-4 p-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                          <Lock className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-400 truncate">{module.title}</h3>
                          <p className="text-sm text-gray-400 line-clamp-1">{module.description}</p>
                        </div>
                        {/* Admin/Teacher edit button - доступна даже на заблокированных модулях */}
                        {isPrivileged && (
                          <Link
                            href={`/content/modules/${module.id}`}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                            title="Редактировать модуль"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 p-4">
                        <Link href={`/module/${module.slug}`} className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                            isCompleted ? "bg-green-100" : isInProgress ? "bg-blue-100" : "bg-gray-100"
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="h-6 w-6 text-green-600" />
                            ) : isInProgress ? (
                              <PlayCircle className="h-6 w-6 text-blue-600" />
                            ) : (
                              <TypeIcon className="h-6 w-6 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">{module.title}</h3>
                            <p className="text-sm text-gray-500 line-clamp-1">{module.description}</p>
                          </div>
                          <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500 shrink-0 ml-4">
                            <span className="whitespace-nowrap">{module.duration}</span>
                            <span className="whitespace-nowrap">{module.points} XP</span>
                          </div>
                        </Link>
                        {/* Admin/Teacher edit button */}
                        {isPrivileged && (
                          <Link
                            href={`/content/modules/${module.id}`}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                            title="Редактировать модуль"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Project Section - Show completed and current available projects */}
        {projectModules.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Практическое задание</h2>
            <p className="text-gray-500 mb-6">
              {allAssessmentsCompleted
                ? "Выполните задание и отправьте на проверку"
                : "Завершите оценку знаний для доступа к заданию"
              }
            </p>

            {!allAssessmentsCompleted && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <span className="text-orange-700">
                  Пройдите все тесты ({assessmentCompletedCount}/{assessmentModules.length}) для доступа к заданию
                </span>
              </div>
            )}

            <div className="grid gap-4 max-w-4xl">
              {(() => {
                // Show projects based on their status in taskProgress
                // PASSED = completed, PENDING = current, LOCKED = hidden
                const levelOrder = ["Junior", "Middle", "Senior"]
                const projectsToShow: Array<{ project: typeof projectModules[0], status: string }> = []

                // Collect all projects that are not LOCKED
                for (const project of projectModules) {
                  const status = getProjectStatus(project.level)
                  if (status === "PASSED" || status === "PENDING") {
                    projectsToShow.push({ project, status })
                  }
                }

                // If no projects found based on taskProgress, show the first project as PENDING
                if (projectsToShow.length === 0 && projectModules.length > 0) {
                  // Fallback: find Middle or first project
                  const fallbackProject = projectModules.find(m => m.level === "Middle") || projectModules[0]
                  if (fallbackProject) {
                    projectsToShow.push({ project: fallbackProject, status: "PENDING" })
                  }
                }

                // Sort: PENDING first, then PASSED
                projectsToShow.sort((a, b) => {
                  if (a.status === "PENDING" && b.status !== "PENDING") return -1
                  if (b.status === "PENDING" && a.status !== "PENDING") return 1
                  // By level order
                  return levelOrder.indexOf(a.project.level) - levelOrder.indexOf(b.project.level)
                })

                return projectsToShow.map(({ project, status }) => {
                  const isProjectCompleted = status === "PASSED" || moduleProgressMap[project.id] === "COMPLETED"
                  const isPending = status === "PENDING" && !isProjectCompleted

                  return (
                    <Card
                      key={project.id}
                      className={`transition-all ${!allAssessmentsCompleted ? "opacity-60" : "hover:shadow-md"}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-700 border-0">
                              <FolderGit2 className="h-3 w-3 mr-1" />
                              Проект
                            </Badge>
                            {isPrivileged && (
                              <Badge variant="outline" className="text-xs">
                                {project.level}
                              </Badge>
                            )}
                          </div>
                          {isProjectCompleted && (
                            <Badge className="bg-green-100 text-green-700 border-0">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Сдано
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{project.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500 mb-4">{project.description}</p>
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                          <span>{project.duration}</span>
                          <span className="font-medium">{project.points} XP</span>
                        </div>
                        {allAssessmentsCompleted ? (
                          <Button asChild className="w-full" variant={isProjectCompleted ? "outline" : "default"}>
                            <Link href={`/module/${project.slug}`}>
                              {isProjectCompleted ? "Просмотреть" : "Начать задание"}
                            </Link>
                          </Button>
                        ) : (
                          <Button disabled className="w-full" variant="outline">
                            <Lock className="h-4 w-4 mr-2" />
                            Недоступно
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              })()}
            </div>
          </div>
        )}

        {/* Certificate Section */}
        {isEnrolled && allModulesCompleted && (
          <div className="mt-12">
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <Award className="h-8 w-8 text-amber-600" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {hasCertificate ? "Сертификат получен!" : "Trail завершён!"}
                    </h3>
                    <p className="text-gray-600">
                      {hasCertificate
                        ? "Вы уже получили сертификат за этот trail"
                        : "Поздравляем! Вы прошли все модули и можете получить сертификат"
                      }
                    </p>
                  </div>
                  <div>
                    {hasCertificate ? (
                      <Button asChild variant="outline" className="gap-2">
                        <Link href="/certificates">
                          <Award className="h-4 w-4" />
                          Мои сертификаты
                        </Link>
                      </Button>
                    ) : (
                      <ClaimCertificateButton trailId={trail.id} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
