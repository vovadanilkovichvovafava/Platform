"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  FileText,
  RefreshCw,
  BarChart3,
  BookOpen,
  Award,
  AlertTriangle,
  ExternalLink,
  Target,
} from "lucide-react"

interface TrailStats {
  trailId: string
  trailTitle: string
  trailSlug: string
  enrollments: number
  submissions: {
    pending: number
    approved: number
    revision: number
    total: number
  }
  avgScore: number | null
  completionRate: number
  modulesCount: number
}

interface StudentProgress {
  id: string
  name: string
  email: string
  totalXP: number
  modulesCompleted: number
  totalModules: number
  avgScore: number | null
  pendingSubmissions: number
}

export default function TeacherAnalyticsPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [trailStats, setTrailStats] = useState<TrailStats[]>([])
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([])
  const [error, setError] = useState("")

  const isTeacher = session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN"

  useEffect(() => {
    if (status === "loading") return
    if (!isTeacher) return

    fetchAnalytics()
  }, [status, isTeacher])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError("")

      // Fetch teacher's trail stats
      const statsRes = await fetch("/api/teacher/analytics/trails")
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setTrailStats(statsData)
      }

      // Fetch student progress for assigned trails
      const studentsRes = await fetch("/api/teacher/analytics/students")
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json()
        setStudentProgress(studentsData)
      }
    } catch {
      setError("Ошибка загрузки аналитики")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // Calculate summary stats
  const totalEnrollments = trailStats.reduce((sum, t) => sum + t.enrollments, 0)
  const totalPending = trailStats.reduce((sum, t) => sum + t.submissions.pending, 0)
  const totalApproved = trailStats.reduce((sum, t) => sum + t.submissions.approved, 0)
  const avgCompletion = trailStats.length > 0
    ? Math.round(trailStats.reduce((sum, t) => sum + t.completionRate, 0) / trailStats.length)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 pb-24">
        <Breadcrumbs
          items={[
            { label: "Учитель", href: "/teacher" },
            { label: "Аналитика" },
          ]}
          className="mb-6"
        />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Аналитика учителя</h1>
              <p className="text-gray-500 text-sm">
                Статистика по назначенным направлениям и ученикам
              </p>
            </div>
          </div>
          <Button onClick={fetchAnalytics} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalEnrollments}</p>
                  <p className="text-xs text-gray-500">Учеников</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{totalPending}</p>
                  <p className="text-xs text-gray-500">На проверке</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{totalApproved}</p>
                  <p className="text-xs text-gray-500">Проверено</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{avgCompletion}%</p>
                  <p className="text-xs text-gray-500">Ср. прогресс</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trail Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-blue-500" />
                Направления
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trailStats.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Нет назначенных направлений</p>
              ) : (
                <div className="space-y-4">
                  {trailStats.map((trail) => (
                    <div key={trail.trailId} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Link
                          href={`/trails/${trail.trailSlug}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {trail.trailTitle}
                        </Link>
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {trail.enrollments}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Clock className="h-3 w-3" />
                          {trail.submissions.pending} ожидают
                        </div>
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          {trail.submissions.approved} принято
                        </div>
                        <div className="flex items-center gap-1 text-orange-600">
                          <FileText className="h-3 w-3" />
                          {trail.submissions.revision} на доработке
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Завершённость</span>
                          <span>{trail.completionRate}%</span>
                        </div>
                        <Progress value={trail.completionRate} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-green-500" />
                Прогресс учеников
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentProgress.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Нет учеников</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {studentProgress.slice(0, 20).map((student) => (
                    <div key={student.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/teacher/students/${student.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600 truncate block"
                        >
                          {student.name}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{student.modulesCompleted}/{student.totalModules} модулей</span>
                          {student.avgScore !== null && (
                            <Badge className={`text-xs border-0 ${
                              student.avgScore >= 8 ? "bg-green-100 text-green-700" :
                              student.avgScore >= 6 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {student.avgScore}/10
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {student.pendingSubmissions > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-700 border-0">
                            <Clock className="h-3 w-3 mr-1" />
                            {student.pendingSubmissions}
                          </Badge>
                        )}
                        <Badge className="bg-amber-100 text-amber-700 border-0">
                          <Award className="h-3 w-3 mr-1" />
                          {student.totalXP}
                        </Badge>
                        <Link
                          href={`/teacher/students/${student.id}`}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="mt-6 flex items-center gap-4">
          <Button asChild variant="outline">
            <Link href="/teacher">
              <FileText className="h-4 w-4 mr-2" />
              Работы на проверку ({totalPending})
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/teacher/students">
              <Users className="h-4 w-4 mr-2" />
              Все ученики
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
