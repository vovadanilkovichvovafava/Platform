import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Users,
  Trophy,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default async function TeacherStudentsPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "TEACHER") {
    redirect("/dashboard")
  }

  // Get all students with their progress
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { totalXP: "desc" },
    include: {
      enrollments: {
        include: {
          trail: {
            select: { title: true, slug: true },
          },
        },
      },
      moduleProgress: {
        where: { status: "COMPLETED" },
      },
      submissions: {
        include: {
          module: {
            select: { title: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          submissions: true,
        },
      },
    },
  })

  // Get submission stats per student
  const submissionStats = await prisma.submission.groupBy({
    by: ["userId", "status"],
    _count: true,
  })

  const getStudentStats = (userId: string) => {
    const stats = submissionStats.filter((s) => s.userId === userId)
    return {
      pending: stats.find((s) => s.status === "PENDING")?._count || 0,
      approved: stats.find((s) => s.status === "APPROVED")?._count || 0,
      revision: stats.find((s) => s.status === "REVISION")?._count || 0,
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Users className="h-6 w-6" />
          Ученики
        </h1>
        <p className="text-gray-600">
          {students.length} студентов на платформе
        </p>
      </div>

      {students.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Пока нет учеников
            </h3>
            <p className="text-gray-600">
              Ученики появятся после регистрации по инвайту
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {students.map((student) => {
            const stats = getStudentStats(student.id)
            const lastSubmission = student.submissions[0]

            return (
              <Card key={student.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Avatar & Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {getInitials(student.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {student.name}
                        </h3>
                        <p className="text-sm text-gray-500">{student.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {student.enrollments.map((e) => (
                            <Badge
                              key={e.trailId}
                              variant="secondary"
                              className="text-xs"
                            >
                              {e.trail.title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Trophy className="h-4 w-4" />
                          <span className="font-bold">{student.totalXP}</span>
                        </div>
                        <p className="text-xs text-gray-500">XP</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center gap-1 text-blue-600">
                          <BookOpen className="h-4 w-4" />
                          <span className="font-bold">
                            {student.moduleProgress.length}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Модулей</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-bold">{stats.approved}</span>
                        </div>
                        <p className="text-xs text-gray-500">Принято</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center gap-1 text-orange-600">
                          <Clock className="h-4 w-4" />
                          <span className="font-bold">{stats.pending}</span>
                        </div>
                        <p className="text-xs text-gray-500">Ожидает</p>
                      </div>
                    </div>
                  </div>

                  {/* Last submission */}
                  {lastSubmission && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FileText className="h-4 w-4" />
                        <span>Последняя работа:</span>
                        <span className="font-medium text-gray-700">
                          {lastSubmission.module.title}
                        </span>
                        <span>—</span>
                        <span>
                          {new Date(lastSubmission.createdAt).toLocaleDateString(
                            "ru-RU",
                            {
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </span>
                        <Badge
                          className={`text-xs ${
                            lastSubmission.status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : lastSubmission.status === "PENDING"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-orange-100 text-orange-700"
                          } border-0`}
                        >
                          {lastSubmission.status === "APPROVED"
                            ? "Принято"
                            : lastSubmission.status === "PENDING"
                            ? "На проверке"
                            : "На доработку"}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
