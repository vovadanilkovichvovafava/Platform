import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Github,
  Globe,
  Eye,
  ClipboardList,
  History,
} from "lucide-react"

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "TEACHER") {
    redirect("/dashboard")
  }

  // Get teacher's assigned trails
  const teacherAssignments = await prisma.trailTeacher.findMany({
    where: { teacherId: session.user.id },
    select: { trailId: true },
  })

  const assignedTrailIds = teacherAssignments.map((a) => a.trailId)
  const hasAssignments = assignedTrailIds.length > 0

  // Only show submissions for modules in assigned trails (or all if no assignments)
  const pendingSubmissions = await prisma.submission.findMany({
    where: {
      status: "PENDING",
      ...(hasAssignments ? { module: { trailId: { in: assignedTrailIds } } } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: { name: true, email: true },
      },
      module: {
        include: {
          trail: true,
        },
      },
    },
  })

  // Get all reviewed submissions (approved, revision, failed) for history
  const reviewedSubmissions = await prisma.submission.findMany({
    where: {
      status: { in: ["APPROVED", "REVISION", "FAILED"] },
      ...(hasAssignments ? { module: { trailId: { in: assignedTrailIds } } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      module: {
        include: {
          trail: { select: { title: true } },
        },
      },
      review: {
        select: {
          score: true,
          comment: true,
          createdAt: true,
          reviewer: { select: { name: true } },
        },
      },
    },
  })

  // Stats - only for assigned trails
  const stats = await prisma.submission.groupBy({
    by: ["status"],
    where: hasAssignments ? { module: { trailId: { in: assignedTrailIds } } } : {},
    _count: true,
  })

  const pendingCount = stats.find((s) => s.status === "PENDING")?._count || 0
  const approvedCount = stats.find((s) => s.status === "APPROVED")?._count || 0
  const revisionCount = stats.find((s) => s.status === "REVISION")?._count || 0
  const failedCount = stats.find((s) => s.status === "FAILED")?._count || 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Добро пожаловать!
        </h1>
        <p className="text-gray-600">
          Управляйте проверкой работ и отслеживайте прогресс учеников
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <div className="text-sm text-gray-500">На проверке</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{approvedCount}</div>
                <div className="text-sm text-gray-500">Принято</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{revisionCount}</div>
                <div className="text-sm text-gray-500">На доработку</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{failedCount}</div>
                <div className="text-sm text-gray-500">Провал</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Submissions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Работы на проверку
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingSubmissions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Все работы проверены!
              </h3>
              <p className="text-gray-600">
                Новые работы появятся здесь автоматически
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {submission.module.trail.title}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 border-0">
                        <Clock className="h-3 w-3 mr-1" />
                        Ожидает проверки
                      </Badge>
                    </div>
                    <h3 className="font-medium text-gray-900">
                      {submission.module.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {submission.user.name} ({submission.user.email})
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Отправлено{" "}
                      {new Date(submission.createdAt).toLocaleDateString(
                        "ru-RU",
                        {
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      {submission.githubUrl && (
                        <a
                          href={submission.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                      {submission.deployUrl && (
                        <a
                          href={submission.deployUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                    </div>

                    <Button asChild>
                      <Link href={`/teacher/reviews/${submission.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        Проверить
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History of reviewed submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            История проверок
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviewedSubmissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Пока нет проверенных работ
            </div>
          ) : (
            <div className="space-y-3">
              {reviewedSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {submission.module.trail.title}
                      </Badge>
                      <Badge
                        className={
                          submission.status === "APPROVED"
                            ? "bg-green-100 text-green-700 border-0"
                            : submission.status === "FAILED"
                            ? "bg-red-100 text-red-700 border-0"
                            : "bg-orange-100 text-orange-700 border-0"
                        }
                      >
                        {submission.status === "APPROVED" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Принято
                          </>
                        ) : submission.status === "FAILED" ? (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Провал
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            На доработку
                          </>
                        )}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-gray-900">
                      {submission.module.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {submission.user.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {submission.review && (
                      <div className="text-center px-4">
                        <div className="text-2xl font-bold text-[#0176D3]">
                          {submission.review.score}/10
                        </div>
                        <div className="text-xs text-gray-500">Оценка</div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {submission.githubUrl && (
                        <a
                          href={submission.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                      {submission.deployUrl && (
                        <a
                          href={submission.deployUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                    </div>

                    <Button asChild variant="outline" size="sm">
                      <Link href={`/teacher/reviews/${submission.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Детали
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
