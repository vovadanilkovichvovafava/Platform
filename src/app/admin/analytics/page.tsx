"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
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
  Info,
  HelpCircle,
  Copy,
  UserX,
  Database,
  Calculator,
  Clock,
  CheckCircle,
  XCircle,
  Award,
  Star,
  Target,
  Flame,
  GraduationCap,
  Trophy,
  BookOpen,
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

interface TrailProgress {
  id: string
  title: string
  slug: string
  enrollments: number
  certificates: number
  totalModules: number
  completedModules: number
  submissionsCount: number
  approvedSubmissions: number
  completionRate: number
  approvalRate: number
}

interface TopStudent {
  id: string
  name: string
  totalXP: number
  currentStreak: number
  modulesCompleted: number
  approvedWorks: number
  certificates: number
}

interface ScoreDistribution {
  excellent: number
  good: number
  average: number
  poor: number
  total: number
  avgScore: number | null
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
  // New student progress data
  trailProgress?: TrailProgress[]
  topStudents?: TopStudent[]
  scoreDistribution?: ScoreDistribution
}

// Описания блоков аналитики
const ANALYTICS_INFO = {
  summary: {
    title: "Сводные метрики",
    description: "Ключевые показатели платформы в реальном времени",
    metrics: {
      totalStudents: "Общее количество пользователей с ролью STUDENT в системе",
      atRiskStudents: "Студенты с высоким и средним риском отсева (7+ дней без активности)",
      conversionRate: "Процент студентов, завершивших хотя бы один модуль, от общего числа",
      avgDailyActiveUsers: "Среднее количество уникальных активных пользователей в день за последние 30 дней",
    },
  },
  churnRisk: {
    title: "Риск отсева",
    description: "Анализ активности студентов для выявления тех, кто может покинуть платформу",
    methodology: "Риск рассчитывается на основе дней с последней активности: высокий (14+ дней), средний (7-14 дней), низкий (менее 7 дней)",
    dataSource: "Таблица UserActivity - записи о ежедневной активности пользователей",
    limitations: "Учитывается только зафиксированная активность. Если студент читает материалы без взаимодействия, это не регистрируется",
  },
  funnel: {
    title: "Воронка конверсии",
    description: "Путь пользователя от регистрации до получения сертификата",
    methodology: "Каждый этап показывает количество студентов, достигших этой стадии обучения",
    stages: {
      registered: "Все зарегистрированные студенты",
      enrolled: "Записались хотя бы на один trail",
      started: "Начали хотя бы один модуль",
      submitted: "Отправили хотя бы одну работу на проверку",
      completed: "Завершили хотя бы один модуль",
      certified: "Получили хотя бы один сертификат",
    },
  },
  difficulty: {
    title: "Анализ сложности модулей",
    description: "Оценка сложности модулей на основе оценок студентов",
    methodology: "Сложность определяется по средней оценке: легкий (8+), средний (6-8), сложный (<6)",
    dataSource: "Таблицы Submission и Review - работы студентов и их оценки преподавателями",
    limitations: "Модули без оценок не имеют данных о сложности. Новые модули могут показывать 'Н/Д'",
  },
}

export default function AdvancedAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedRisk, setExpandedRisk] = useState<"high" | "medium" | null>("high")
  const [showMethodology, setShowMethodology] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const { showToast } = useToast()
  const { confirm } = useConfirm()

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

  // Копирование email в буфер
  const copyEmail = async (email: string, studentName: string) => {
    try {
      await navigator.clipboard.writeText(email)
      setCopiedEmail(email)
      showToast(`Email ${studentName} скопирован`, "success")
      setTimeout(() => setCopiedEmail(null), 2000)
    } catch {
      showToast("Не удалось скопировать email", "error")
    }
  }

  // Открыть mailto с заполненной темой
  const openMailto = (email: string, studentName: string, daysSinceActive: number) => {
    const subject = encodeURIComponent(`Проверка активности - ${studentName}`)
    const body = encodeURIComponent(
      `Здравствуйте, ${studentName}!\n\nМы заметили, что вы не были активны на платформе уже ${daysSinceActive} дней. ` +
      `Хотели узнать, всё ли в порядке и нужна ли какая-либо помощь?\n\nС уважением,\nКоманда платформы`
    )
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank")
  }

  // Функция "удаления" пользователя (заглушка с двумя подтверждениями)
  const handleExcludeStudent = async (student: ChurnRiskStudent) => {
    // Первое подтверждение
    const firstConfirm = await confirm({
      title: "Исключить студента?",
      message: `Вы собираетесь исключить "${student.name}" (${student.email}) из платформы. Это действие требует дополнительного подтверждения.`,
      confirmText: "Продолжить",
      variant: "warning",
    })

    if (!firstConfirm) return

    // Второе подтверждение
    const secondConfirm = await confirm({
      title: "Подтвердите исключение",
      message: `ВНИМАНИЕ: Вы уверены, что хотите исключить "${student.name}"? Это действие нельзя отменить.`,
      confirmText: "Исключить",
      variant: "danger",
    })

    if (!secondConfirm) return

    // Заглушка - не выполняем реального удаления
    showToast("Функция исключения временно отключена администратором", "warning")
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
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowMethodology(!showMethodology)}
              variant="outline"
              size="sm"
              className={showMethodology ? "bg-purple-50 border-purple-200" : ""}
            >
              <Info className="h-4 w-4 mr-2" />
              Методология
            </Button>
            <Button onClick={fetchAnalytics} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
          </div>
        </div>

        {/* Блок методологии сбора данных */}
        {showMethodology && (
          <Card className="mb-8 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-purple-900">
                <Database className="h-5 w-5" />
                Как собирается аналитика
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-white/60 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-900">Источники данных</span>
                  </div>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• <strong>User</strong> - профили и роли пользователей</li>
                    <li>• <strong>UserActivity</strong> - ежедневная активность</li>
                    <li>• <strong>ModuleProgress</strong> - прогресс по модулям</li>
                    <li>• <strong>Submission/Review</strong> - работы и оценки</li>
                    <li>• <strong>Certificate</strong> - выданные сертификаты</li>
                  </ul>
                </div>
                <div className="p-3 bg-white/60 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-900">Период анализа</span>
                  </div>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• Риск отсева: последняя активность пользователя</li>
                    <li>• Тренды: последние 30 дней</li>
                    <li>• Воронка: все время работы платформы</li>
                    <li>• Сложность: все оценки за все время</li>
                  </ul>
                </div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Ограничения</span>
                </div>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Активность фиксируется только при взаимодействии (клики, ответы, отправки)</li>
                  <li>• Пассивное чтение материалов не учитывается</li>
                  <li>• Новые модули без оценок не имеют данных о сложности</li>
                  <li>• Данные обновляются в реальном времени при каждом запросе</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards with explanations */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-medium text-gray-700">{ANALYTICS_INFO.summary.title}</h2>
            <span className="text-xs text-gray-500">— {ANALYTICS_INFO.summary.description}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="group relative">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold">{data.summary.totalStudents}</p>
                    <p className="text-xs text-gray-500">Всего студентов</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="hidden group-hover:block absolute z-10 top-full left-0 right-0 mt-1 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                  {ANALYTICS_INFO.summary.metrics.totalStudents}
                </div>
              </CardContent>
            </Card>
            <Card className="group relative">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-red-600">{data.summary.atRiskStudents}</p>
                    <p className="text-xs text-gray-500">Риск отсева</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="hidden group-hover:block absolute z-10 top-full left-0 right-0 mt-1 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                  {ANALYTICS_INFO.summary.metrics.atRiskStudents}
                </div>
              </CardContent>
            </Card>
            <Card className="group relative">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-green-600">{data.summary.conversionRate}%</p>
                    <p className="text-xs text-gray-500">Конверсия</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="hidden group-hover:block absolute z-10 top-full left-0 right-0 mt-1 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                  {ANALYTICS_INFO.summary.metrics.conversionRate}
                </div>
              </CardContent>
            </Card>
            <Card className="group relative">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Activity className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold">{data.summary.avgDailyActiveUsers}</p>
                    <p className="text-xs text-gray-500">Сред. DAU</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="hidden group-hover:block absolute z-10 top-full left-0 right-0 mt-1 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                  {ANALYTICS_INFO.summary.metrics.avgDailyActiveUsers}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Churn Risk */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingDown className="h-5 w-5 text-red-500" />
                {ANALYTICS_INFO.churnRisk.title}
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">{ANALYTICS_INFO.churnRisk.description}</p>
            </CardHeader>
            <CardContent>
              {/* Краткое пояснение методологии */}
              <div className="mb-4 p-2 bg-gray-50 rounded-lg text-xs text-gray-600 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 mt-0.5 text-gray-400 shrink-0" />
                <span>{ANALYTICS_INFO.churnRisk.methodology}</span>
              </div>
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
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {data.churnRisk.high.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-red-200 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">{student.name}</p>
                          <p className="text-xs text-gray-500 truncate">{student.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="text-xs bg-red-100 text-red-700 border-0">
                              {student.daysSinceActive} дней
                            </Badge>
                            {student.modulesCompleted !== undefined && (
                              <span className="text-xs text-gray-400">
                                {student.modulesCompleted} модулей
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {/* Кнопка копирования email */}
                          <button
                            onClick={() => copyEmail(student.email, student.name)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Копировать email"
                          >
                            {copiedEmail === student.email ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          {/* Кнопка mailto */}
                          <button
                            onClick={() => openMailto(student.email, student.name, student.daysSinceActive)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Написать письмо"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                          {/* Кнопка исключения (заглушка) */}
                          <button
                            onClick={() => handleExcludeStudent(student)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Исключить студента"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </div>
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
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {data.churnRisk.medium.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-yellow-200 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">{student.name}</p>
                          <p className="text-xs text-gray-500 truncate">{student.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="text-xs bg-yellow-100 text-yellow-700 border-0">
                              {student.daysSinceActive} дней
                            </Badge>
                            {student.modulesCompleted !== undefined && (
                              <span className="text-xs text-gray-400">
                                {student.modulesCompleted} модулей
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {/* Кнопка копирования email */}
                          <button
                            onClick={() => copyEmail(student.email, student.name)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Копировать email"
                          >
                            {copiedEmail === student.email ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          {/* Кнопка mailto */}
                          <button
                            onClick={() => openMailto(student.email, student.name, student.daysSinceActive)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Написать письмо"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                          {/* Кнопка исключения (заглушка) */}
                          <button
                            onClick={() => handleExcludeStudent(student)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Исключить студента"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </div>
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
                {ANALYTICS_INFO.funnel.title}
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">{ANALYTICS_INFO.funnel.description}</p>
            </CardHeader>
            <CardContent>
              {/* Краткое пояснение */}
              <div className="mb-4 p-2 bg-gray-50 rounded-lg text-xs text-gray-600 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 mt-0.5 text-gray-400 shrink-0" />
                <span>{ANALYTICS_INFO.funnel.methodology}</span>
              </div>
              <div className="space-y-3">
                {data.funnel.map((stage, index) => {
                  // Определяем ключ для подсказки
                  const stageKeys = ["registered", "enrolled", "started", "submitted", "completed", "certified"]
                  const stageKey = stageKeys[index] as keyof typeof ANALYTICS_INFO.funnel.stages
                  const stageHint = ANALYTICS_INFO.funnel.stages[stageKey]

                  return (
                    <div key={stage.stage} className="relative group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">{stage.stage}</span>
                          {stageHint && (
                            <div className="relative">
                              <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                              <div className="hidden group-hover:block absolute z-10 left-0 top-full mt-1 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
                                {stageHint}
                              </div>
                            </div>
                          )}
                        </div>
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
                          style={{ width: `${Math.max(stage.percent, 2)}%` }}
                        />
                      </div>
                      {index < data.funnel.length - 1 && (
                        <div className="text-center my-1">
                          <span className="text-xs text-gray-400">
                            {stage.count > 0 && data.funnel[index + 1].count > 0
                              ? `${Math.round((data.funnel[index + 1].count / stage.count) * 100)}% переходят`
                              : "—"}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Module Difficulty */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              {ANALYTICS_INFO.difficulty.title}
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">{ANALYTICS_INFO.difficulty.description}</p>
          </CardHeader>
          <CardContent>
            {/* Методология */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-2 text-xs text-gray-600 mb-2">
                <Info className="h-3.5 w-3.5 mt-0.5 text-gray-400 shrink-0" />
                <span>{ANALYTICS_INFO.difficulty.methodology}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  <span className="text-gray-600">Лёгкий (8+)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-yellow-500"></div>
                  <span className="text-gray-600">Средний (6-8)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500"></div>
                  <span className="text-gray-600">Сложный (&lt;6)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-gray-300"></div>
                  <span className="text-gray-600">Нет данных</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 font-medium">Модуль</th>
                    <th className="py-2 font-medium text-center">Тип</th>
                    <th className="py-2 font-medium text-center">
                      <div className="flex items-center justify-center gap-1 group relative">
                        Завершили
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                        <span className="hidden group-hover:block absolute z-10 top-full mt-1 p-1.5 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
                          Количество студентов, завершивших модуль
                        </span>
                      </div>
                    </th>
                    <th className="py-2 font-medium text-center">
                      <div className="flex items-center justify-center gap-1 group relative">
                        Работ
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                        <span className="hidden group-hover:block absolute z-10 top-full mt-1 p-1.5 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
                          Общее количество отправленных работ
                        </span>
                      </div>
                    </th>
                    <th className="py-2 font-medium text-center">
                      <div className="flex items-center justify-center gap-1 group relative">
                        Ср. оценка
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                        <span className="hidden group-hover:block absolute z-10 top-full mt-1 p-1.5 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
                          Средний балл проверенных работ
                        </span>
                      </div>
                    </th>
                    <th className="py-2 font-medium text-center">Сложность</th>
                  </tr>
                </thead>
                <tbody>
                  {data.difficultyAnalysis.slice(0, 15).map((module) => (
                    <tr key={module.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-2 font-medium text-gray-900">{module.title}</td>
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
              {data.difficultyAnalysis.length > 15 && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Показаны первые 15 модулей (всего: {data.difficultyAnalysis.length})
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Student Progress Section - Графики развития */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Развитие студентов</h2>
            <span className="text-xs text-gray-500">— Статистика прогресса и достижений</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trail Progress */}
            {data.trailProgress && data.trailProgress.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-blue-500" />
                    Прогресс по направлениям
                  </CardTitle>
                  <p className="text-xs text-gray-500">Завершённость и качество работ по каждому trail</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.trailProgress.map((trail) => (
                    <div key={trail.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-gray-900">{trail.title}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {trail.enrollments}
                          </Badge>
                          {trail.certificates > 0 && (
                            <Badge className="text-xs bg-amber-100 text-amber-700 border-0">
                              <Award className="h-3 w-3 mr-1" />
                              {trail.certificates}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Completion Progress */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Завершённость модулей</span>
                          <span>{trail.completionRate}%</span>
                        </div>
                        <Progress value={trail.completionRate} className="h-2" />
                      </div>

                      {/* Approval Rate */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Принято работ</span>
                          <span>{trail.approvalRate}% ({trail.approvedSubmissions}/{trail.submissionsCount})</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${trail.approvalRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Score Distribution */}
            {data.scoreDistribution && data.scoreDistribution.total > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Распределение оценок
                  </CardTitle>
                  <p className="text-xs text-gray-500">
                    Всего оценено работ: {data.scoreDistribution.total}
                    {data.scoreDistribution.avgScore && (
                      <> • Средняя: <span className="font-medium text-blue-600">{data.scoreDistribution.avgScore}/10</span></>
                    )}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Excellent 9-10 */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-green-500"></div>
                          Отлично (9-10)
                        </span>
                        <span className="font-medium">
                          {data.scoreDistribution.excellent} ({Math.round((data.scoreDistribution.excellent / data.scoreDistribution.total) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-4">
                        <div
                          className="bg-green-500 h-4 rounded-full transition-all"
                          style={{ width: `${(data.scoreDistribution.excellent / data.scoreDistribution.total) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Good 7-8 */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-blue-500"></div>
                          Хорошо (7-8)
                        </span>
                        <span className="font-medium">
                          {data.scoreDistribution.good} ({Math.round((data.scoreDistribution.good / data.scoreDistribution.total) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-4">
                        <div
                          className="bg-blue-500 h-4 rounded-full transition-all"
                          style={{ width: `${(data.scoreDistribution.good / data.scoreDistribution.total) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Average 5-6 */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-yellow-500"></div>
                          Удовл. (5-6)
                        </span>
                        <span className="font-medium">
                          {data.scoreDistribution.average} ({Math.round((data.scoreDistribution.average / data.scoreDistribution.total) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-4">
                        <div
                          className="bg-yellow-500 h-4 rounded-full transition-all"
                          style={{ width: `${(data.scoreDistribution.average / data.scoreDistribution.total) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Poor <5 */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-red-500"></div>
                          Неудовл. (&lt;5)
                        </span>
                        <span className="font-medium">
                          {data.scoreDistribution.poor} ({Math.round((data.scoreDistribution.poor / data.scoreDistribution.total) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-4">
                        <div
                          className="bg-red-500 h-4 rounded-full transition-all"
                          style={{ width: `${(data.scoreDistribution.poor / data.scoreDistribution.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top Students */}
          {data.topStudents && data.topStudents.length > 0 && (
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="h-4 w-4 text-purple-500" />
                  Лидеры платформы
                </CardTitle>
                <p className="text-xs text-gray-500">Топ-10 студентов по XP и достижениям</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 font-medium w-8">#</th>
                        <th className="py-2 font-medium">Студент</th>
                        <th className="py-2 font-medium text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-amber-500" />
                            XP
                          </div>
                        </th>
                        <th className="py-2 font-medium text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Flame className="h-3 w-3 text-orange-500" />
                            Streak
                          </div>
                        </th>
                        <th className="py-2 font-medium text-center">
                          <div className="flex items-center justify-center gap-1">
                            <BookOpen className="h-3 w-3 text-blue-500" />
                            Модули
                          </div>
                        </th>
                        <th className="py-2 font-medium text-center">
                          <div className="flex items-center justify-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            Работы
                          </div>
                        </th>
                        <th className="py-2 font-medium text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Award className="h-3 w-3 text-amber-500" />
                            Серт.
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topStudents.map((student, index) => (
                        <tr key={student.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-2 text-gray-500">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                          </td>
                          <td className="py-2 font-medium text-gray-900">{student.name}</td>
                          <td className="py-2 text-center">
                            <span className="font-bold text-amber-600">{student.totalXP.toLocaleString()}</span>
                          </td>
                          <td className="py-2 text-center">
                            {student.currentStreak > 0 ? (
                              <Badge className="text-xs bg-orange-100 text-orange-700 border-0">
                                {student.currentStreak} д.
                              </Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-2 text-center">{student.modulesCompleted}</td>
                          <td className="py-2 text-center">
                            <span className="text-green-600">{student.approvedWorks}</span>
                          </td>
                          <td className="py-2 text-center">
                            {student.certificates > 0 ? (
                              <Badge className="text-xs bg-amber-100 text-amber-700 border-0">
                                {student.certificates}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
