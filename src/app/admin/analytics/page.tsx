"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { useToast } from "@/components/ui/toast"
import {
  TrendingDown,
  TrendingUp,
  Users,
  AlertTriangle,
  Activity,
  BarChart3,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Mail,
  Award,
  Loader2,
} from "lucide-react"

interface ChurnRiskStudent {
  id: string
  name: string
  email: string
  lastActive: string | null
  daysSinceActive: number
  modulesCompleted?: number
  xp?: number
}

interface FunnelStage {
  stage: string
  count: number
  percent: number
}

interface DifficultyModule {
  id: string
  title: string
  type: string
  completedCount: number
  submissionCount: number
  avgScore: number | null
  difficulty: string
}

interface AnalyticsData {
  churnRisk: {
    high: ChurnRiskStudent[]
    highCount: number
    medium: ChurnRiskStudent[]
    mediumCount: number
    lowCount: number
  }
  funnel: FunnelStage[]
  trends: Array<{ date: string; activeUsers: number; totalActions: number }>
  difficultyAnalysis: DifficultyModule[]
  summary: {
    totalStudents: number
    atRiskStudents: number
    conversionRate: number
    avgDailyActiveUsers: number
  }
}

export default function AdvancedAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncingAchievements, setSyncingAchievements] = useState(false)
  const [expandedRisk, setExpandedRisk] = useState<"high" | "medium" | null>("high")
  const { showToast } = useToast()

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/analytics/advanced")
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const syncAchievements = async () => {
    try {
      setSyncingAchievements(true)
      const res = await fetch("/api/admin/sync-achievements", { method: "POST" })
      const result = await res.json()

      if (res.ok) {
        showToast(
          `Синхронизировано! Выдано ${result.totalAchievementsAwarded} достижений для ${result.usersWithNewAchievements} пользователей`,
          "success"
        )
      } else {
        throw new Error(result.error || "Ошибка синхронизации")
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Ошибка синхронизации",
        "error"
      )
    } finally {
      setSyncingAchievements(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Ошибка загрузки данных</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: "Админ", href: "/admin/invites" },
            { label: "Аналитика" },
          ]}
          className="mb-6"
        />

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Продвинутая аналитика</h1>
              <p className="text-gray-500 text-sm">
                Риск отсева, воронка, тренды
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={syncAchievements}
              variant="outline"
              size="sm"
              disabled={syncingAchievements}
            >
              {syncingAchievements ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Award className="h-4 w-4 mr-2" />
              )}
              Синхронизировать достижения
            </Button>
            <Button onClick={fetchAnalytics} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.summary.totalStudents}</p>
                  <p className="text-xs text-gray-500">Всего студентов</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{data.summary.atRiskStudents}</p>
                  <p className="text-xs text-gray-500">Риск отсева</p>
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
                  <p className="text-2xl font-bold text-green-600">{data.summary.conversionRate}%</p>
                  <p className="text-xs text-gray-500">Конверсия</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.summary.avgDailyActiveUsers}</p>
                  <p className="text-xs text-gray-500">Сред. DAU</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Churn Risk */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Риск отсева
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* High Risk */}
              <div className="mb-4">
                <button
                  onClick={() => setExpandedRisk(expandedRisk === "high" ? null : "high")}
                  className="w-full flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500">Высокий</Badge>
                    <span className="text-red-700 font-medium">{data.churnRisk.highCount} студентов</span>
                    <span className="text-red-600 text-sm">(14+ дней без активности)</span>
                  </div>
                  {expandedRisk === "high" ? (
                    <ChevronUp className="h-5 w-5 text-red-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-red-500" />
                  )}
                </button>
                {expandedRisk === "high" && data.churnRisk.high.length > 0 && (
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {data.churnRisk.high.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <p className="font-medium text-sm">{student.name}</p>
                          <p className="text-xs text-gray-500">{student.daysSinceActive} дней без активности</p>
                        </div>
                        <a
                          href={`mailto:${student.email}`}
                          className="p-2 text-gray-400 hover:text-blue-500 rounded"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Medium Risk */}
              <div className="mb-4">
                <button
                  onClick={() => setExpandedRisk(expandedRisk === "medium" ? null : "medium")}
                  className="w-full flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-500">Средний</Badge>
                    <span className="text-yellow-700 font-medium">{data.churnRisk.mediumCount} студентов</span>
                    <span className="text-yellow-600 text-sm">(7-14 дней)</span>
                  </div>
                  {expandedRisk === "medium" ? (
                    <ChevronUp className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-yellow-500" />
                  )}
                </button>
                {expandedRisk === "medium" && data.churnRisk.medium.length > 0 && (
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {data.churnRisk.medium.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <p className="font-medium text-sm">{student.name}</p>
                          <p className="text-xs text-gray-500">{student.daysSinceActive} дней без активности</p>
                        </div>
                        <a
                          href={`mailto:${student.email}`}
                          className="p-2 text-gray-400 hover:text-blue-500 rounded"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Low Risk */}
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500">Низкий</Badge>
                  <span className="text-green-700 font-medium">{data.churnRisk.lowCount} студентов</span>
                  <span className="text-green-600 text-sm">(активны)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Воронка конверсии
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.funnel.map((stage, index) => (
                  <div key={stage.stage} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{stage.stage}</span>
                      <span className="text-sm text-gray-500">
                        {stage.count} ({stage.percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          index === 0
                            ? "bg-blue-500"
                            : index === data.funnel.length - 1
                            ? "bg-green-500"
                            : "bg-blue-400"
                        }`}
                        style={{ width: `${stage.percent}%` }}
                      />
                    </div>
                    {index < data.funnel.length - 1 && (
                      <div className="text-center my-1">
                        <span className="text-xs text-gray-400">
                          {data.funnel[index + 1].percent > 0
                            ? `${Math.round((data.funnel[index + 1].count / stage.count) * 100)}% переходят`
                            : "—"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Module Difficulty */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              Анализ сложности модулей
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 font-medium">Модуль</th>
                    <th className="py-2 font-medium text-center">Тип</th>
                    <th className="py-2 font-medium text-center">Завершили</th>
                    <th className="py-2 font-medium text-center">Работ</th>
                    <th className="py-2 font-medium text-center">Ср. оценка</th>
                    <th className="py-2 font-medium text-center">Сложность</th>
                  </tr>
                </thead>
                <tbody>
                  {data.difficultyAnalysis.slice(0, 15).map((module) => (
                    <tr key={module.id} className="border-b">
                      <td className="py-2">{module.title}</td>
                      <td className="py-2 text-center">
                        <Badge variant="outline" className="text-xs">
                          {module.type === "THEORY" ? "Теория" : module.type === "PRACTICE" ? "Практика" : "Проект"}
                        </Badge>
                      </td>
                      <td className="py-2 text-center">{module.completedCount}</td>
                      <td className="py-2 text-center">{module.submissionCount}</td>
                      <td className="py-2 text-center">
                        {module.avgScore !== null ? (
                          <span className={`font-medium ${
                            module.avgScore >= 8 ? "text-green-600" :
                            module.avgScore >= 6 ? "text-yellow-600" :
                            "text-red-600"
                          }`}>
                            {module.avgScore}/10
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2 text-center">
                        <Badge className={`text-xs border-0 ${
                          module.difficulty === "hard" ? "bg-red-100 text-red-700" :
                          module.difficulty === "medium" ? "bg-yellow-100 text-yellow-700" :
                          module.difficulty === "easy" ? "bg-green-100 text-green-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {module.difficulty === "hard" ? "Сложный" :
                           module.difficulty === "medium" ? "Средний" :
                           module.difficulty === "easy" ? "Лёгкий" : "Н/Д"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
