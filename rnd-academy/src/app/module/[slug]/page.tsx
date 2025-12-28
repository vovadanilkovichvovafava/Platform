import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
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
import { ModuleType } from "@prisma/client"
import { SubmitProjectForm } from "@/components/submit-project-form"

const typeIcons = {
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

export default async function ModulePage({ params }: Props) {
  const { slug } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const module = await prisma.module.findUnique({
    where: { slug },
    include: {
      trail: true,
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

  // Get submission if project
  let submission = null
  if (module.type === "PROJECT") {
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

  const isCompleted = progress?.status === "COMPLETED"
  const isProject = module.type === "PROJECT"
  const TypeIcon = typeIcons[module.type]

  // Capture values for server action closure
  const moduleId = module.id
  const modulePoints = module.points
  const moduleTrailId = module.trailId
  const moduleOrder = module.order
  const trailSlug = module.trail.slug

  async function handleComplete() {
    "use server"

    const session = await getServerSession(authOptions)
    if (!session) return

    // Update progress
    await prisma.moduleProgress.upsert({
      where: {
        userId_moduleId: {
          userId: session.user.id,
          moduleId: moduleId,
        },
      },
      update: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        moduleId: moduleId,
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
      },
    })

    // Add XP
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        totalXP: { increment: modulePoints },
      },
    })

    // Start next module if exists
    const nextModule = await prisma.module.findFirst({
      where: {
        trailId: moduleTrailId,
        order: { gt: moduleOrder },
      },
      orderBy: { order: "asc" },
    })

    if (nextModule) {
      await prisma.moduleProgress.upsert({
        where: {
          userId_moduleId: {
            userId: session.user.id,
            moduleId: nextModule.id,
          },
        },
        update: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          moduleId: nextModule.id,
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      })
    }

    redirect(`/trails/${trailSlug}`)
  }

  // Simple markdown-like rendering
  const renderContent = (content: string) => {
    const lines = content.split("\n")
    return lines.map((line, i) => {
      if (line.startsWith("# ")) {
        return (
          <h1 key={i} className="text-2xl font-bold mt-8 mb-4">
            {line.slice(2)}
          </h1>
        )
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={i} className="text-xl font-semibold mt-6 mb-3">
            {line.slice(3)}
          </h2>
        )
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={i} className="text-lg font-medium mt-4 mb-2">
            {line.slice(4)}
          </h3>
        )
      }
      if (line.startsWith("- ")) {
        return (
          <li key={i} className="ml-4 mb-1">
            {line.slice(2)}
          </li>
        )
      }
      if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ") || line.startsWith("4. ")) {
        return (
          <li key={i} className="ml-4 mb-1 list-decimal">
            {line.slice(3)}
          </li>
        )
      }
      if (line.trim() === "") {
        return <br key={i} />
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <p key={i} className="font-semibold mb-2">
            {line.slice(2, -2)}
          </p>
        )
      }
      return (
        <p key={i} className="mb-2">
          {line}
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
                <Badge
                  variant="secondary"
                  className="bg-gray-100"
                >
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
              <h1 className="text-2xl font-bold text-gray-900">
                {module.title}
              </h1>
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
          <div className="lg:col-span-1">
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
                              : "bg-blue-100 text-blue-700 border-0"
                          }
                        >
                          {submission.status === "APPROVED"
                            ? "Принято"
                            : submission.status === "REVISION"
                            ? "На доработку"
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
              <Card>
                <CardContent className="p-6">
                  {isCompleted ? (
                    <div className="text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="font-semibold text-lg mb-2">
                        Модуль завершен!
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        Вы получили {module.points} XP
                      </p>
                      <Button asChild variant="outline" className="w-full">
                        <Link href={`/trails/${module.trail.slug}`}>
                          Вернуться к trail
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <form action={handleComplete}>
                      <Button
                        type="submit"
                        className="w-full bg-[#2E844A] hover:bg-[#256E3D]"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Завершить модуль
                      </Button>
                      <p className="text-xs text-gray-500 text-center mt-3">
                        Вы получите {module.points} XP
                      </p>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
