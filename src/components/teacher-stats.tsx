"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart3,
  Users,
  FileText,
  CheckCircle2,
  Trophy,
  TrendingUp,
  BookOpen,
  Clock,
  Star,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Calendar,
  Filter,
  AlertCircle,
} from "lucide-react"

interface Submission {
  id: string
  status: string
  createdAt: string
  module: {
    id: string
    title: string
    trail: {
      id: string
      title: string
      color: string
    }
  }
  user: {
    id: string
    name: string
  }
  review?: {
    score: number
    createdAt: string
  } | null
}

interface TopStudent {
  id: string
  name: string
  totalXP: number
  submissionsCount: number
}

interface TrailModuleStats {
  moduleId: string
  moduleTitle: string
  total: number
  approved: number
  pending: number
  revision: number
  avgScore: number
  submissions: {
    id: string
    status: string
    studentName: string
    createdAt: string
    score?: number
  }[]
}

interface TrailStats {
  trailId: string
  trailTitle: string
  color: string
  total: number
  approved: number
  pending: number
  revision: number
  avgScore: number
  modules: TrailModuleStats[]
}

interface TeacherStatsProps {
  submissions: Submission[]
  topStudents: TopStudent[]
  totalStudents: number
  completedModules: number
}

type DateRange = "7" | "14" | "30" | "90" | "all"

export function TeacherStats({
  submissions,
  topStudents,
  totalStudents,
  completedModules,
}: TeacherStatsProps) {
  const [dateRange, setDateRange] = useState<DateRange>("30")
  const [expandedTrails, setExpandedTrails] = useState<Set<string>>(new Set())
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  // Filter submissions by date range
  const filteredSubmissions = useMemo(() => {
    if (dateRange === "all") return submissions

    const days = parseInt(dateRange)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    cutoff.setHours(0, 0, 0, 0)

    return submissions.filter(
      (s) => new Date(s.createdAt) >= cutoff
    )
  }, [submissions, dateRange])

  // Calculate basic stats
  const stats = useMemo(() => {
    const total = filteredSubmissions.length
    const pending = filteredSubmissions.filter((s) => s.status === "PENDING").length
    const approved = filteredSubmissions.filter((s) => s.status === "APPROVED").length
    const revision = filteredSubmissions.filter((s) => s.status === "REVISION").length
    const failed = filteredSubmissions.filter((s) => s.status === "FAILED").length

    const withReviews = filteredSubmissions.filter((s) => s.review)
    const avgScore = withReviews.length > 0
      ? withReviews.reduce((sum, s) => sum + (s.review?.score || 0), 0) / withReviews.length
      : 0

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0

    return { total, pending, approved, revision, failed, avgScore, approvalRate }
  }, [filteredSubmissions])

  // Calculate daily submissions for chart
  const dailySubmissions = useMemo(() => {
    const days = dateRange === "all" ? 30 : parseInt(dateRange)
    const result: { date: string; count: number; label: string }[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const count = filteredSubmissions.filter((s) => {
        const created = new Date(s.createdAt)
        return created >= date && created < nextDate
      }).length

      result.push({
        date: date.toISOString().split("T")[0],
        count,
        label: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      })
    }

    return result
  }, [filteredSubmissions, dateRange])

  // Calculate trail statistics with drill-down
  const trailStats = useMemo(() => {
    const trailMap = new Map<string, TrailStats>()

    for (const sub of filteredSubmissions) {
      const trailId = sub.module.trail.id
      const moduleId = sub.module.id

      if (!trailMap.has(trailId)) {
        trailMap.set(trailId, {
          trailId,
          trailTitle: sub.module.trail.title,
          color: sub.module.trail.color,
          total: 0,
          approved: 0,
          pending: 0,
          revision: 0,
          avgScore: 0,
          modules: [],
        })
      }

      const trail = trailMap.get(trailId)!
      trail.total++
      if (sub.status === "APPROVED") trail.approved++
      if (sub.status === "PENDING") trail.pending++
      if (sub.status === "REVISION") trail.revision++

      // Find or create module stats
      let moduleStats = trail.modules.find((m) => m.moduleId === moduleId)
      if (!moduleStats) {
        moduleStats = {
          moduleId,
          moduleTitle: sub.module.title,
          total: 0,
          approved: 0,
          pending: 0,
          revision: 0,
          avgScore: 0,
          submissions: [],
        }
        trail.modules.push(moduleStats)
      }

      moduleStats.total++
      if (sub.status === "APPROVED") moduleStats.approved++
      if (sub.status === "PENDING") moduleStats.pending++
      if (sub.status === "REVISION") moduleStats.revision++

      moduleStats.submissions.push({
        id: sub.id,
        status: sub.status,
        studentName: sub.user.name,
        createdAt: sub.createdAt,
        score: sub.review?.score,
      })
    }

    // Calculate average scores
    for (const trail of trailMap.values()) {
      const trailScores = filteredSubmissions
        .filter((s) => s.module.trail.id === trail.trailId && s.review)
        .map((s) => s.review!.score)

      if (trailScores.length > 0) {
        trail.avgScore = trailScores.reduce((a, b) => a + b, 0) / trailScores.length
      }

      for (const module of trail.modules) {
        const moduleScores = module.submissions
          .filter((s) => s.score !== undefined)
          .map((s) => s.score!)

        if (moduleScores.length > 0) {
          module.avgScore = moduleScores.reduce((a, b) => a + b, 0) / moduleScores.length
        }
      }
    }

    return Array.from(trailMap.values()).sort((a, b) => b.total - a.total)
  }, [filteredSubmissions])

  const toggleTrail = (trailId: string) => {
    setExpandedTrails((prev) => {
      const next = new Set(prev)
      if (next.has(trailId)) {
        next.delete(trailId)
      } else {
        next.add(trailId)
      }
      return next
    })
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  const maxDailyCount = Math.max(...dailySubmissions.map((d) => d.count), 1)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-700 border-0">Принято</Badge>
      case "PENDING":
        return <Badge className="bg-blue-100 text-blue-700 border-0">Ожидает</Badge>
      case "REVISION":
        return <Badge className="bg-orange-100 text-orange-700 border-0">Доработка</Badge>
      case "FAILED":
        return <Badge className="bg-red-100 text-red-700 border-0">Провал</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with date filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Статистика
          </h1>
          <p className="text-gray-600">
            Общая статистика платформы и прогресс обучения
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Последние 7 дней</SelectItem>
              <SelectItem value="14">Последние 14 дней</SelectItem>
              <SelectItem value="30">Последние 30 дней</SelectItem>
              <SelectItem value="90">Последние 90 дней</SelectItem>
              <SelectItem value="all">Все время</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-xs text-gray-500">Учеников</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-gray-500">Работ за период</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approvalRate}%</p>
                <p className="text-xs text-gray-500">Принято</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgScore.toFixed(1)}</p>
                <p className="text-xs text-gray-500">Средняя оценка</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Динамика сдачи работ
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailySubmissions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Нет данных за выбранный период</p>
          ) : (
            <div className="space-y-2">
              {/* Bar Chart */}
              <div className="flex items-end gap-1 h-40">
                {dailySubmissions.map((day, idx) => (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center group relative"
                  >
                    <div
                      className="w-full bg-[#0176D3] rounded-t transition-all hover:bg-[#014486]"
                      style={{
                        height: `${(day.count / maxDailyCount) * 100}%`,
                        minHeight: day.count > 0 ? "4px" : "0",
                      }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      {day.label}: {day.count} работ
                    </div>
                  </div>
                ))}
              </div>
              {/* X-axis labels (show every 5th label for readability) */}
              <div className="flex justify-between text-xs text-gray-500 pt-2">
                {dailySubmissions.filter((_, i) => i % Math.ceil(dailySubmissions.length / 7) === 0).map((day) => (
                  <span key={day.date}>{day.label}</span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Breakdown and Pending Alert */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Статус работ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">На проверке</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.pending}</span>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Принято</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.approved}</span>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${stats.total > 0 ? (stats.approved / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm">На доработку</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.revision}</span>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: `${stats.total > 0 ? (stats.revision / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {stats.failed > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm">Провал</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{stats.failed}</span>
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{ width: `${stats.total > 0 ? (stats.failed / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Ожидающие проверки
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.pending === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-medium text-green-700">Все работы проверены!</p>
                  <p className="text-sm text-green-600">Нет работ, ожидающих проверки</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium text-blue-700">{stats.pending} работ ожидают</p>
                    <p className="text-sm text-blue-600">Требуется проверка</p>
                  </div>
                </div>
                <Button asChild className="w-full">
                  <Link href="/teacher">
                    Перейти к проверке
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trail Drill-down */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Статистика по направлениям
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trailStats.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Нет данных за выбранный период</p>
          ) : (
            <div className="space-y-3">
              {trailStats.map((trail) => {
                const isTrailExpanded = expandedTrails.has(trail.trailId)
                return (
                  <div key={trail.trailId}>
                    <div
                      className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleTrail(trail.trailId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronDown
                            className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${
                              isTrailExpanded ? "rotate-0" : "-rotate-90"
                            }`}
                          />
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: trail.color }}
                          />
                          <span className="font-medium">{trail.trailTitle}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-2 text-xs">
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                              {trail.approved}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {trail.pending}
                            </span>
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                              {trail.revision}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{trail.total}</p>
                            <p className="text-xs text-gray-500">работ</p>
                          </div>
                          {trail.avgScore > 0 && (
                            <div className="text-right">
                              <p className="font-bold text-yellow-600">{trail.avgScore.toFixed(1)}</p>
                              <p className="text-xs text-gray-500">ср. оценка</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isTrailExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="ml-8 mt-2 space-y-2">
                        {trail.modules.map((module) => {
                          const isModuleExpanded = expandedModules.has(module.moduleId)
                          return (
                            <div key={module.moduleId}>
                              <div
                                className="p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors"
                                onClick={() => toggleModule(module.moduleId)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <ChevronDown
                                      className={`h-3 w-3 text-gray-400 transition-transform duration-300 ${
                                        isModuleExpanded ? "rotate-0" : "-rotate-90"
                                      }`}
                                    />
                                    <span className="text-sm font-medium">{module.moduleTitle}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex gap-1 text-xs">
                                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                                        {module.approved}
                                      </span>
                                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                        {module.pending}
                                      </span>
                                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                                        {module.revision}
                                      </span>
                                    </div>
                                    <span className="text-sm text-gray-500">{module.total} работ</span>
                                    {module.avgScore > 0 && (
                                      <span className="text-sm font-medium text-yellow-600">
                                        {module.avgScore.toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                  isModuleExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                                }`}
                              >
                                <div className="ml-6 mt-2 space-y-1">
                                  {module.submissions.map((sub) => (
                                    <Link
                                      key={sub.id}
                                      href={`/teacher/reviews/${sub.id}`}
                                      className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">{sub.studentName}</span>
                                        {getStatusBadge(sub.status)}
                                      </div>
                                      <div className="flex items-center gap-3 text-sm text-gray-500">
                                        {sub.score !== undefined && (
                                          <span className="font-medium text-yellow-600">
                                            {sub.score}/10
                                          </span>
                                        )}
                                        <span>
                                          {new Date(sub.createdAt).toLocaleDateString("ru-RU", {
                                            day: "numeric",
                                            month: "short",
                                          })}
                                        </span>
                                        <ExternalLink className="h-3 w-3" />
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Students */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Топ учеников
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topStudents.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Нет данных</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topStudents.map((student, idx) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0
                          ? "bg-yellow-400 text-yellow-900"
                          : idx === 1
                          ? "bg-gray-300 text-gray-700"
                          : idx === 2
                          ? "bg-orange-300 text-orange-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-xs text-gray-500">
                        {student.submissionsCount} работ
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-yellow-600">{student.totalXP}</p>
                    <p className="text-xs text-gray-500">XP</p>
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
