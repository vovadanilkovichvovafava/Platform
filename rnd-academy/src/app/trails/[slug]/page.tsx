import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
} from "lucide-react"
import { ModuleStatus, ModuleType } from "@prisma/client"

const iconMap: Record<string, LucideIcon> = {
  Code,
  Target,
  Palette,
  Lightbulb,
}

const typeIcons: Record<ModuleType, LucideIcon> = {
  THEORY: BookOpen,
  PRACTICE: Wrench,
  PROJECT: FolderGit2,
}

const typeLabels: Record<ModuleType, string> = {
  THEORY: "Теория",
  PRACTICE: "Практика",
  PROJECT: "Проект",
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

  if (!trail) {
    notFound()
  }

  let isEnrolled = false
  let moduleProgressMap: Record<string, ModuleStatus> = {}

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
    }
  }

  const completedCount = Object.values(moduleProgressMap).filter(
    (s) => s === "COMPLETED"
  ).length
  const progressPercent =
    trail.modules.length > 0
      ? Math.round((completedCount / trail.modules.length) * 100)
      : 0

  const totalXP = trail.modules.reduce((sum, m) => sum + m.points, 0)
  const Icon = iconMap[trail.icon] || Code

  // Determine module states
  const modulesWithState = trail.modules.map((module, index) => {
    const status = moduleProgressMap[module.id] || "NOT_STARTED"
    let isLocked = false

    // Lock modules if not enrolled or if previous module not completed
    if (!isEnrolled) {
      isLocked = true
    } else if (index > 0) {
      const prevModule = trail.modules[index - 1]
      const prevStatus = moduleProgressMap[prevModule.id]
      if (prevStatus !== "COMPLETED") {
        isLocked = status === "NOT_STARTED"
      }
    }

    return { ...module, status, isLocked }
  })

  // Capture values for server action closure
  const trailId = trail.id
  const firstModuleId = trail.modules.length > 0 ? trail.modules[0].id : null

  async function handleEnroll() {
    "use server"

    const session = await getServerSession(authOptions)
    if (!session) {
      redirect("/login")
    }

    await prisma.enrollment.create({
      data: {
        userId: session.user.id,
        trailId: trailId,
      },
    })

    // Start first module
    if (firstModuleId) {
      await prisma.moduleProgress.create({
        data: {
          userId: session.user.id,
          moduleId: firstModuleId,
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      })
    }

    redirect(`/trails/${slug}`)
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {trail.title}
              </h1>
              <p className="text-lg text-gray-600 mb-4">{trail.subtitle}</p>
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
                  {trail.modules.length} модулей
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
                      Ваш прогресс
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-[#2E844A]">
                        {progressPercent}%
                      </span>
                      <span className="text-sm text-gray-500">
                        {completedCount}/{trail.modules.length}
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </CardContent>
                </Card>
              ) : (
                <form action={handleEnroll}>
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-[#0176D3] hover:bg-[#014486] w-full md:w-auto"
                  >
                    Начать обучение
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modules List */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Модули</h2>

        <div className="space-y-4">
          {modulesWithState.map((module, index) => {
            const TypeIcon = typeIcons[module.type]
            const isCompleted = module.status === "COMPLETED"
            const isInProgress = module.status === "IN_PROGRESS"

            return (
              <Card
                key={module.id}
                className={`transition-all ${
                  module.isLocked
                    ? "opacity-60"
                    : "hover:shadow-md cursor-pointer"
                }`}
              >
                <CardContent className="p-0">
                  {module.isLocked ? (
                    <div className="flex items-center gap-4 p-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                        <Lock className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-gray-400">
                            Модуль {index + 1}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {typeLabels[module.type]}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-gray-400">
                          {module.title}
                        </h3>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={`/module/${module.slug}`}
                      className="flex items-center gap-4 p-4"
                    >
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                          isCompleted
                            ? "bg-green-100"
                            : isInProgress
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        ) : isInProgress ? (
                          <PlayCircle className="h-6 w-6 text-blue-600" />
                        ) : (
                          <TypeIcon className="h-6 w-6 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-gray-500">
                            Модуль {index + 1}
                          </span>
                          <Badge
                            variant={
                              isCompleted
                                ? "default"
                                : isInProgress
                                ? "secondary"
                                : "outline"
                            }
                            className={`text-xs ${
                              isCompleted
                                ? "bg-green-100 text-green-700 border-0"
                                : isInProgress
                                ? "bg-blue-100 text-blue-700 border-0"
                                : ""
                            }`}
                          >
                            {typeLabels[module.type]}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-1">
                          {module.title}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {module.description}
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {module.duration}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4" />
                          {module.points} XP
                        </div>
                      </div>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
