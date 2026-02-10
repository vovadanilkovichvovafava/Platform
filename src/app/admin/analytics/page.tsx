"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
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
  GraduationCap,
  Trophy,
  BookOpen,
  Filter,
  Calendar,
  ArrowRight,
  Layers,
  Zap,
  ExternalLink,
  Search,
  User,
  FileText,
  MoreHorizontal,
  Sparkles,
  X,
  Lock,
  PlayCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ListFilter,
} from "lucide-react"
import Link from "next/link"
import { MarkdownRenderer } from "@/components/markdown-renderer"

interface ChurnRiskStudent {
  id: string
  name: string
  email: string
  telegramUsername?: string | null
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
  slug: string
  type: string
  trailId: string | null
  trailTitle: string | null
  trailSlug: string | null
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
  filteredByTrail?: boolean
}

interface StudentSubmissions {
  approved: number
  pending: number
  revision: number
  total: number
}

interface ModuleCircle {
  id: string
  title: string
  order: number
  status: string // COMPLETED, IN_PROGRESS, NOT_STARTED
  submissionId: string | null
}

interface TrailStudent {
  id: string
  name: string
  telegramUsername?: string | null
  totalXP: number
  modulesCompleted: number
  totalModules: number
  completionPercent: number
  submissions: StudentSubmissions
  avgScore: number | null
  dateStart: string | null
  dateEnd: string | null
  modules?: ModuleCircle[]
}

interface TrailStudentsGroup {
  trailId: string
  trailTitle: string
  trailSlug: string
  isPasswordProtected?: boolean
  isLocked?: boolean
  students: TrailStudent[]
}

interface ModuleDropoffStats {
  id: string
  title: string
  slug: string
  order: number
  type: string
  totalEnrolled: number
  startedCount: number
  inProgressCount: number
  completedCount: number
  completionRate: number
  dropRate: number
  avgTimeDays: number
  isBottleneck: boolean
}

interface TrailDropoffAnalysis {
  trailId: string
  trailTitle: string
  trailSlug: string
  totalEnrolled: number
  modules: ModuleDropoffStats[]
}

interface FilterTrail {
  id: string
  title: string
  slug: string
}

interface AnalyticsData {
  churnRisk: {
    high: ChurnRiskStudent[]
    highCount: number
    medium: ChurnRiskStudent[]
    mediumCount: number
    low: ChurnRiskStudent[]
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
  // Module drop-off analysis
  dropoffAnalysis?: TrailDropoffAnalysis[]
  // Students by trail with detailed progress
  studentsByTrail?: TrailStudentsGroup[]
  // Filters
  filters?: {
    trails: FilterTrail[]
    currentTrail: string
    currentPeriod: string
  }
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
  const [expandedRisk, setExpandedRisk] = useState<"high" | "medium" | "low" | null>("high")
  const [showMethodology, setShowMethodology] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [copiedTg, setCopiedTg] = useState<string | null>(null)
  const [trailFilter, setTrailFilter] = useState("all")
  const [periodFilter, setPeriodFilter] = useState("30")
  const [completionFilter, setCompletionFilter] = useState<"all" | "in_progress" | "completed">("all")
  const [showGuide, setShowGuide] = useState(false)
  const [expandedDropoff, setExpandedDropoff] = useState<string | null>(null)
  const [expandedStudentTrail, setExpandedStudentTrail] = useState<string | null>(null)
  const [studentSearch, setStudentSearch] = useState("")
  // Sortable columns state: column key + direction (asc/desc/null for default)
  const [studentSortColumn, setStudentSortColumn] = useState<string | null>(null)
  const [studentSortDirection, setStudentSortDirection] = useState<"asc" | "desc" | null>(null)
  // Submission filter within the "Students by directions" block
  const [submissionFilter, setSubmissionFilter] = useState<"all" | "no_submissions" | "has_submissions" | "has_pending" | "has_revision" | "all_approved">("all")
  // Collapsible section states - all open by default
  const [sectionsExpanded, setSectionsExpanded] = useState({
    difficulty: true,
    trailProgress: true,
    scoreDistribution: true,
    studentsByTrail: true,
    topStudents: true,
    studentAnalytics: true,
    dropoffSection: true,
  })
  // Student drill-down analytics
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentDetailSearch, setStudentDetailSearch] = useState("")
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const [selectedStudentData, setSelectedStudentData] = useState<{
    id: string
    name: string
    trailProgress: Array<{
      trailId: string
      trailTitle: string
      trailSlug: string
      modulesCompleted: number
      totalModules: number
      completionPercent: number
      avgScore: number | null
      submissions: StudentSubmissions | null
      dateStart: string | null
      dateEnd: string | null
      modules: Array<{
        id: string
        title: string
        slug: string
        status: string
        score: number | null
        submissionDate: string | null
      }>
    }>
    totalXP: number
    avgScore: number | null
    strongModules: string[]
    weakModules: string[]
  } | null>(null)
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false)
  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState<{
    analysis: string
    studentName: string
    loading: boolean
    error: string | null
  }>({ analysis: "", studentName: "", loading: false, error: null })

  const toggleSection = (section: keyof typeof sectionsExpanded) => {
    setSectionsExpanded(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Get all unique students from studentsByTrail for dropdown (exclude locked trails)
  const allStudents = data?.studentsByTrail?.filter(trail => !trail.isLocked).flatMap(trail =>
    trail.students.map(s => ({ id: s.id, name: s.name, telegramUsername: s.telegramUsername, trailTitle: trail.trailTitle }))
  ).reduce<Array<{ id: string; name: string; telegramUsername?: string | null; trails: string[] }>>((acc, curr) => {
    const existing = acc.find(s => s.id === curr.id)
    if (existing) {
      if (!existing.trails.includes(curr.trailTitle)) {
        existing.trails.push(curr.trailTitle)
      }
    } else {
      acc.push({ id: curr.id, name: curr.name, telegramUsername: curr.telegramUsername, trails: [curr.trailTitle] })
    }
    return acc
  }, []) || []

  const filteredStudentsForDropdown = studentDetailSearch
    ? allStudents.filter(s =>
        s.name.toLowerCase().includes(studentDetailSearch.toLowerCase()) ||
        (s.telegramUsername && s.telegramUsername.toLowerCase().includes(studentDetailSearch.toLowerCase()))
      )
    : allStudents

  // Select student and build analytics
  const selectStudentForAnalytics = (studentId: string) => {
    setSelectedStudentId(studentId)
    setShowStudentDropdown(false)
    setLoadingStudentDetail(true)

    // Build student data from existing studentsByTrail
    const student = allStudents.find(s => s.id === studentId)
    if (!student || !data?.studentsByTrail) {
      setLoadingStudentDetail(false)
      return
    }

    type TrailProgressItem = {
      trailId: string
      trailTitle: string
      trailSlug: string
      modulesCompleted: number
      totalModules: number
      completionPercent: number
      avgScore: number | null
      submissions: StudentSubmissions | null
      dateStart: string | null
      dateEnd: string | null
      modules: Array<{
        id: string
        title: string
        slug: string
        status: string
        score: number | null
        submissionDate: string | null
      }>
    }

    const trailProgress: TrailProgressItem[] = data.studentsByTrail
      .filter(trail => !trail.isLocked)
      .map((trail): TrailProgressItem | null => {
        const studentInTrail = trail.students.find(s => s.id === studentId)
        if (!studentInTrail) return null

        return {
          trailId: trail.trailId,
          trailTitle: trail.trailTitle,
          trailSlug: trail.trailSlug,
          modulesCompleted: studentInTrail.modulesCompleted,
          totalModules: studentInTrail.totalModules,
          completionPercent: studentInTrail.completionPercent,
          avgScore: studentInTrail.avgScore,
          submissions: studentInTrail.submissions,
          dateStart: studentInTrail.dateStart,
          dateEnd: studentInTrail.dateEnd,
          modules: [],
        }
      })
      .filter((item): item is TrailProgressItem => item !== null)

    // Calculate strong and weak modules based on completion rate in dropoff
    const strongModules: string[] = []
    const weakModules: string[] = []

    if (data.dropoffAnalysis) {
      data.dropoffAnalysis.forEach(trail => {
        trail.modules.forEach(module => {
          if (module.completionRate >= 70) {
            strongModules.push(module.title)
          } else if (module.completionRate < 40 || module.isBottleneck) {
            weakModules.push(module.title)
          }
        })
      })
    }

    // Calculate total XP and avg score
    const studentFromTopList = data.topStudents?.find(s => s.id === studentId)
    const totalXP = studentFromTopList?.totalXP || trailProgress.reduce((sum: number, t: TrailProgressItem) => {
      const studentData = data.studentsByTrail?.find(tr => tr.trailId === t.trailId)?.students.find(s => s.id === studentId)
      return sum + (studentData?.totalXP || 0)
    }, 0)

    const scoresWithValues = trailProgress.filter((t: TrailProgressItem) => t.avgScore !== null)
    const avgScore = scoresWithValues.length > 0
      ? Math.round((scoresWithValues.reduce((sum: number, t: TrailProgressItem) => sum + (t.avgScore || 0), 0) / scoresWithValues.length) * 10) / 10
      : null

    setSelectedStudentData({
      id: studentId,
      name: student.name,
      trailProgress,
      totalXP,
      avgScore,
      strongModules: strongModules.slice(0, 5),
      weakModules: weakModules.slice(0, 5),
    })
    setLoadingStudentDetail(false)
    // Reset AI analysis when student changes
    setAiAnalysis({ analysis: "", studentName: "", loading: false, error: null })
  }

  // Request AI analysis for selected student
  const requestAiAnalysis = async () => {
    if (!selectedStudentId || !selectedStudentData) return

    setAiAnalysis({ analysis: "", studentName: "", loading: true, error: null })

    try {
      const res = await fetch("/api/admin/analytics/ai-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudentId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setAiAnalysis({
          analysis: "",
          studentName: "",
          loading: false,
          error: data.error || "Ошибка AI-анализа",
        })
        return
      }

      setAiAnalysis({
        analysis: data.analysis,
        studentName: data.studentName,
        loading: false,
        error: null,
      })
    } catch {
      setAiAnalysis({
        analysis: "",
        studentName: "",
        loading: false,
        error: "Ошибка соединения с сервером",
      })
    }
  }

  const { showToast } = useToast()
  const { confirm } = useConfirm()

  useEffect(() => {
    fetchAnalytics()
  }, [trailFilter, periodFilter])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        trail: trailFilter,
        period: periodFilter,
      })
      const res = await fetch(`/api/admin/analytics/advanced?${params}`)
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

  // Копирование TG-ника в буфер
  const copyTg = async (tg: string, studentName: string) => {
    try {
      await navigator.clipboard.writeText(tg)
      setCopiedTg(tg)
      showToast(`TG ${studentName} скопирован`, "success")
      setTimeout(() => setCopiedTg(null), 2000)
    } catch {
      showToast("Не удалось скопировать TG-ник", "error")
    }
  }

  // Format ISO date to readable locale string
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "—"
    try {
      return new Date(dateStr).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch {
      return "—"
    }
  }

  // Filter students by completion status
  const filterByCompletion = (students: TrailStudent[]): TrailStudent[] => {
    if (completionFilter === "all") return students
    if (completionFilter === "completed") return students.filter(s => s.dateEnd !== null)
    return students.filter(s => s.dateEnd === null)
  }

  // Filter students by submission status
  const filterBySubmissions = (students: TrailStudent[]): TrailStudent[] => {
    switch (submissionFilter) {
      case "no_submissions":
        return students.filter(s => s.submissions.total === 0)
      case "has_submissions":
        return students.filter(s => s.submissions.total > 0)
      case "has_pending":
        return students.filter(s => s.submissions.pending > 0)
      case "has_revision":
        return students.filter(s => s.submissions.revision > 0)
      case "all_approved":
        return students.filter(s => s.submissions.total > 0 && s.submissions.pending === 0 && s.submissions.revision === 0)
      default:
        return students
    }
  }

  // Three-state sort toggle: null -> asc -> desc -> null
  const toggleSort = useCallback((column: string) => {
    if (studentSortColumn !== column) {
      setStudentSortColumn(column)
      setStudentSortDirection("asc")
    } else if (studentSortDirection === "asc") {
      setStudentSortDirection("desc")
    } else {
      setStudentSortColumn(null)
      setStudentSortDirection(null)
    }
  }, [studentSortColumn, studentSortDirection])

  // Sort students by current column and direction
  const sortStudents = useCallback((students: TrailStudent[]): TrailStudent[] => {
    if (!studentSortColumn || !studentSortDirection) return students
    const sorted = [...students]
    const dir = studentSortDirection === "asc" ? 1 : -1
    sorted.sort((a, b) => {
      switch (studentSortColumn) {
        case "name":
          return dir * a.name.localeCompare(b.name, "ru")
        case "dateStart": {
          const da = a.dateStart ? new Date(a.dateStart).getTime() : 0
          const db = b.dateStart ? new Date(b.dateStart).getTime() : 0
          return dir * (da - db)
        }
        case "progress":
          return dir * (a.completionPercent - b.completionPercent)
        case "dateEnd": {
          const ea = a.dateEnd ? new Date(a.dateEnd).getTime() : 0
          const eb = b.dateEnd ? new Date(b.dateEnd).getTime() : 0
          return dir * (ea - eb)
        }
        case "submissions":
          return dir * (a.submissions.total - b.submissions.total)
        case "avgScore": {
          const sa = a.avgScore ?? -1
          const sb = b.avgScore ?? -1
          return dir * (sa - sb)
        }
        default:
          return 0
      }
    })
    return sorted
  }, [studentSortColumn, studentSortDirection])

  // Get sort icon for column header
  const getSortIcon = (column: string) => {
    if (studentSortColumn !== column) return <ArrowUpDown className="h-3 w-3 text-gray-300" />
    if (studentSortDirection === "asc") return <ArrowUp className="h-3 w-3 text-indigo-600" />
    return <ArrowDown className="h-3 w-3 text-indigo-600" />
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
      <div className="container mx-auto px-4 py-8 pb-24">
        <Breadcrumbs
          items={[
            { label: "Админ", href: "/admin/invites" },
            { label: "Аналитика" },
          ]}
          className="mb-6"
        />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Продвинутая аналитика</h1>
              <p className="text-gray-500 text-sm">
                Риск отсева, воронка, drop-off, тренды
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowGuide(!showGuide)}
              variant="outline"
              size="sm"
              className={showGuide ? "bg-cyan-50 border-cyan-200" : ""}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Гайд
            </Button>
            <Button
              onClick={() => setShowMethodology(!showMethodology)}
              variant="outline"
              size="sm"
              className={showMethodology ? "bg-purple-50 border-purple-200" : ""}
            >
              <Info className="h-4 w-4 mr-2" />
              Методология
            </Button>
            <Button onClick={fetchAnalytics} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Обновить
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Фильтры:</span>
            </div>

            {/* Trail Filter */}
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-gray-400" />
              <select
                value={trailFilter}
                onChange={(e) => setTrailFilter(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">Все направления</option>
                {data?.filters?.trails.map((trail) => (
                  <option key={trail.id} value={trail.id}>
                    {trail.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="7">Последние 7 дней</option>
                <option value="14">Последние 14 дней</option>
                <option value="30">Последние 30 дней</option>
                <option value="90">Последние 90 дней</option>
                <option value="365">Последний год</option>
              </select>
            </div>

            {/* Completion Status Filter */}
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-gray-400" />
              <select
                value={completionFilter}
                onChange={(e) => setCompletionFilter(e.target.value as "all" | "in_progress" | "completed")}
                className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">Все статусы</option>
                <option value="in_progress">В процессе</option>
                <option value="completed">Завершено</option>
              </select>
            </div>

            {(trailFilter !== "all" || periodFilter !== "30" || completionFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTrailFilter("all")
                  setPeriodFilter("30")
                  setCompletionFilter("all")
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
            )}
          </div>
        </div>

        {/* Module C: Guide — Как читать аналитику */}
        {showGuide && (
          <Card className="mb-6 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg text-cyan-900">
                  <HelpCircle className="h-5 w-5" />
                  Как читать аналитику
                </CardTitle>
                <button onClick={() => setShowGuide(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-white/70 rounded-lg border border-cyan-100">
                  <p className="font-medium text-cyan-800 text-sm mb-1">Date Start</p>
                  <p className="text-xs text-cyan-700">Дата первого начатого модуля в трейле. Автоматически фиксируется при открытии практики.</p>
                </div>
                <div className="p-3 bg-white/70 rounded-lg border border-cyan-100">
                  <p className="font-medium text-cyan-800 text-sm mb-1">Прогресс</p>
                  <p className="text-xs text-cyan-700">Кружки: каждый = модуль трейла. Зелёный = завершён, жёлтый = в процессе, пустой = не начат. Клик по кружку открывает проверку работы.</p>
                </div>
                <div className="p-3 bg-white/70 rounded-lg border border-cyan-100">
                  <p className="font-medium text-cyan-800 text-sm mb-1">Date End</p>
                  <p className="text-xs text-cyan-700">Дата завершения последнего модуля. Появляется только когда все модули трейла завершены.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-white/70 rounded-lg border border-cyan-100">
                  <p className="font-medium text-cyan-800 text-sm mb-1">Фильтры</p>
                  <ul className="text-xs text-cyan-700 space-y-0.5">
                    <li>• <strong>Направление</strong> — выбор конкретного трейла</li>
                    <li>• <strong>Период</strong> — временное окно анализа</li>
                    <li>• <strong>Статус</strong> — в процессе / завершено</li>
                  </ul>
                </div>
                <div className="p-3 bg-white/70 rounded-lg border border-cyan-100">
                  <p className="font-medium text-cyan-800 text-sm mb-1">Блоки</p>
                  <ul className="text-xs text-cyan-700 space-y-0.5">
                    <li>• <strong>Студенты по направлениям</strong> — прогресс всех студентов по каждому трейлу</li>
                    <li>• <strong>Детальный анализ</strong> — drill-down по конкретному студенту + AI-разбор</li>
                  </ul>
                </div>
              </div>
              {/* Video guide placeholder */}
              <div className="p-4 bg-white/50 rounded-lg border border-dashed border-cyan-300 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 shrink-0">
                  <PlayCircle className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-cyan-800">Видеогайд</p>
                  <p className="text-xs text-cyan-600">Здесь будет видеоинструкция по работе с аналитикой. Вставьте ссылку на видео или embed-код.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Student Progress Section - Графики развития */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Развитие студентов</h2>
            <span className="text-xs text-gray-500">— Статистика прогресса и достижений</span>
          </div>

          {/* Students by Trail - Collapsible Sections */}
          {data.studentsByTrail && data.studentsByTrail.length > 0 && (
            <Card className="mt-6">
              <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSection("studentsByTrail")}>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4 text-indigo-500" />
                    Студенты по направлениям
                  </CardTitle>
                  {sectionsExpanded.studentsByTrail ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Детальный прогресс студентов по каждому trail — оценки, работы, завершённость модулей
                </p>
              </CardHeader>
              {sectionsExpanded.studentsByTrail && <CardContent className="space-y-4">
                {/* Search and Filters */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Поиск студента по имени или TG-нику..."
                      className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ListFilter className="h-4 w-4 text-gray-400" />
                    <select
                      value={submissionFilter}
                      onChange={(e) => setSubmissionFilter(e.target.value as typeof submissionFilter)}
                      className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="all">Все работы</option>
                      <option value="no_submissions">Не сдали ни одной работы</option>
                      <option value="has_submissions">Сдали хотя бы одну работу</option>
                      <option value="has_pending">Есть работы на проверке</option>
                      <option value="has_revision">Есть работы на доработке</option>
                      <option value="all_approved">Все работы приняты</option>
                    </select>
                    {(submissionFilter !== "all" || studentSortColumn) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSubmissionFilter("all")
                          setStudentSortColumn(null)
                          setStudentSortDirection(null)
                        }}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Сбросить фильтры и сортировку
                      </Button>
                    )}
                  </div>
                </div>

                {data.studentsByTrail.map((trailGroup) => {
                  // Apply search filter
                  const searchFiltered = studentSearch
                    ? trailGroup.students.filter((s) =>
                        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        (s.telegramUsername && s.telegramUsername.toLowerCase().includes(studentSearch.toLowerCase()))
                      )
                    : trailGroup.students
                  // Apply completion filter, then submission filter, then sort
                  const completionFiltered = filterByCompletion(searchFiltered)
                  const submissionFiltered = filterBySubmissions(completionFiltered)
                  const filteredStudents = sortStudents(submissionFiltered)

                  if (filteredStudents.length === 0 && (studentSearch || completionFilter !== "all" || submissionFilter !== "all")) return null

                  // Password lock check (Module D)
                  const isLocked = trailGroup.isLocked === true

                  return (
                    <div key={trailGroup.trailId} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() =>
                          !isLocked && setExpandedStudentTrail(
                            expandedStudentTrail === trailGroup.trailId ? null : trailGroup.trailId
                          )
                        }
                        className={`w-full flex items-center justify-between p-3 transition-colors ${
                          isLocked
                            ? "bg-gray-100 cursor-not-allowed"
                            : "bg-indigo-50 hover:bg-indigo-100 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isLocked && <Lock className="h-4 w-4 text-gray-400" />}
                          {trailGroup.isPasswordProtected && !isLocked && (
                            <Lock className="h-3.5 w-3.5 text-indigo-400" />
                          )}
                          <span className={`font-medium ${isLocked ? "text-gray-500" : "text-indigo-900"}`}>
                            {trailGroup.trailTitle}
                          </span>
                          {isLocked ? (
                            <Badge className="text-xs bg-gray-200 text-gray-500 border-0">
                              Требуется пароль
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              {filteredStudents.length} студентов
                            </Badge>
                          )}
                        </div>
                        {!isLocked && (
                          expandedStudentTrail === trailGroup.trailId ? (
                            <ChevronUp className="h-5 w-5 text-indigo-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-indigo-500" />
                          )
                        )}
                      </button>

                      {isLocked && expandedStudentTrail === trailGroup.trailId && (
                        <div className="p-4 text-center text-gray-500 text-sm bg-gray-50">
                          <Lock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p>Этот трейл защищён паролем. Введите пароль на странице трейла для доступа к данным.</p>
                          <Link
                            href={`/trails/${trailGroup.trailSlug}`}
                            target="_blank"
                            className="text-indigo-600 hover:underline text-sm mt-1 inline-flex items-center gap-1"
                          >
                            Перейти к трейлу <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      )}

                      {!isLocked && expandedStudentTrail === trailGroup.trailId && (
                        <div className="max-h-96 overflow-y-auto">
                          {filteredStudents.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              Нет студентов на этом направлении
                            </div>
                          ) : (
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr className="border-b text-left">
                                  <th className="py-2 px-3 font-medium">
                                    <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                                      Имя {getSortIcon("name")}
                                    </button>
                                  </th>
                                  <th className="py-2 px-3 font-medium text-center">
                                    <button onClick={() => toggleSort("dateStart")} className="flex items-center gap-1 mx-auto hover:text-indigo-600 transition-colors">
                                      Дата начала {getSortIcon("dateStart")}
                                    </button>
                                  </th>
                                  <th className="py-2 px-3 font-medium">
                                    <button onClick={() => toggleSort("progress")} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                                      Прогресс {getSortIcon("progress")}
                                    </button>
                                  </th>
                                  <th className="py-2 px-3 font-medium text-center">
                                    <button onClick={() => toggleSort("dateEnd")} className="flex items-center gap-1 mx-auto hover:text-indigo-600 transition-colors">
                                      Дата окончания {getSortIcon("dateEnd")}
                                    </button>
                                  </th>
                                  <th className="py-2 px-3 font-medium text-center">
                                    <button onClick={() => toggleSort("submissions")} className="flex items-center gap-1 mx-auto hover:text-indigo-600 transition-colors">
                                      Работы {getSortIcon("submissions")}
                                    </button>
                                  </th>
                                  <th className="py-2 px-3 font-medium text-center">
                                    <button onClick={() => toggleSort("avgScore")} className="flex items-center gap-1 mx-auto hover:text-indigo-600 transition-colors">
                                      Ср. оценка {getSortIcon("avgScore")}
                                    </button>
                                  </th>
                                  <th className="py-2 px-3 font-medium w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredStudents.map((student) => (
                                  <tr
                                    key={student.id}
                                    className="border-b hover:bg-gray-50 transition-colors"
                                  >
                                    <td className="py-2 px-3">
                                      <Link
                                        href={`/dashboard/${student.id}`}
                                        target="_blank"
                                        className="font-medium text-gray-900 hover:text-indigo-600 transition-colors flex items-center gap-1"
                                      >
                                        <User className="h-3 w-3" />
                                        {student.name}
                                      </Link>
                                      {student.telegramUsername && (
                                        <p className="text-xs text-gray-400">{student.telegramUsername}</p>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <span className="text-xs text-gray-600">{formatDate(student.dateStart)}</span>
                                    </td>
                                    <td className="py-2 px-3">
                                      {student.modules && student.modules.length > 0 ? (
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {student.modules.map((mod) => {
                                            const isCompleted = mod.status === "COMPLETED"
                                            const isInProgress = mod.status === "IN_PROGRESS"
                                            const hasSubmission = mod.submissionId !== null

                                            const circleEl = (
                                              <div
                                                key={mod.id}
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                                  isCompleted
                                                    ? "bg-green-500 border-green-500"
                                                    : isInProgress
                                                    ? "bg-yellow-100 border-yellow-400"
                                                    : "bg-white border-gray-300"
                                                } ${hasSubmission ? "cursor-pointer hover:scale-125 hover:shadow-md" : ""}`}
                                                title={`${mod.title} — ${
                                                  isCompleted ? "Завершён" : isInProgress ? "В процессе" : "Не начат"
                                                }`}
                                              >
                                                {isCompleted && (
                                                  <CheckCircle className="h-3 w-3 text-white" />
                                                )}
                                                {isInProgress && (
                                                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                                                )}
                                              </div>
                                            )

                                            if (hasSubmission) {
                                              return (
                                                <Link
                                                  key={mod.id}
                                                  href={`/teacher/reviews/${mod.submissionId}`}
                                                  target="_blank"
                                                >
                                                  {circleEl}
                                                </Link>
                                              )
                                            }
                                            return circleEl
                                          })}
                                          <span className="text-xs text-gray-400 ml-1 whitespace-nowrap">
                                            {student.modulesCompleted}/{student.totalModules}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <Progress
                                            value={student.completionPercent}
                                            className="h-2 w-16"
                                          />
                                          <span className="text-xs text-gray-600 whitespace-nowrap">
                                            {student.modulesCompleted}/{student.totalModules}
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {student.dateEnd ? (
                                        <Badge className="text-xs bg-green-100 text-green-700 border-0">
                                          {formatDate(student.dateEnd)}
                                        </Badge>
                                      ) : (
                                        <span className="text-xs text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <span className="text-green-600">{student.submissions.approved}</span>
                                        <span className="text-gray-300">/</span>
                                        <span className="text-yellow-600">{student.submissions.pending}</span>
                                        <span className="text-gray-300">/</span>
                                        <span className="text-orange-600">{student.submissions.revision}</span>
                                      </div>
                                      <p className="text-xs text-gray-400">прин/ожид/дораб</p>
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {student.avgScore !== null ? (
                                        <Badge
                                          className={`text-xs border-0 ${
                                            student.avgScore >= 8
                                              ? "bg-green-100 text-green-700"
                                              : student.avgScore >= 6
                                              ? "bg-yellow-100 text-yellow-700"
                                              : "bg-red-100 text-red-700"
                                          }`}
                                        >
                                          {student.avgScore}/10
                                        </Badge>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3">
                                      <Link
                                        href={`/dashboard/${student.id}`}
                                        target="_blank"
                                        className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </Link>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>}
            </Card>
          )}

          {/* Student Analytics Drill-down */}
          {allStudents.length > 0 && (
            <Card className="mt-6">
              <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSection("studentAnalytics")}>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4 text-cyan-500" />
                    Детальный анализ студента
                  </CardTitle>
                  {sectionsExpanded.studentAnalytics ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Выберите студента для просмотра прогресса, оценок и точек drop-off
                </p>
              </CardHeader>
              {sectionsExpanded.studentAnalytics && (
                <CardContent className="space-y-4">
                  {/* Student Dropdown with Search */}
                  <div className="relative">
                    <div
                      className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:border-cyan-400 transition-colors"
                      onClick={() => setShowStudentDropdown(!showStudentDropdown)}
                    >
                      <Search className="h-4 w-4 text-gray-400" />
                      {selectedStudentData ? (
                        <span className="font-medium text-gray-900">{selectedStudentData.name}</span>
                      ) : (
                        <span className="text-gray-500">Выберите студента...</span>
                      )}
                      <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
                    </div>

                    {showStudentDropdown && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-hidden">
                        <div className="p-2 border-b">
                          <input
                            type="text"
                            value={studentDetailSearch}
                            onChange={(e) => setStudentDetailSearch(e.target.value)}
                            placeholder="Поиск по имени или TG-нику..."
                            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredStudentsForDropdown.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              Студенты не найдены
                            </div>
                          ) : (
                            filteredStudentsForDropdown.map((student) => (
                              <button
                                key={student.id}
                                onClick={() => selectStudentForAnalytics(student.id)}
                                className="w-full flex items-center justify-between px-4 py-2 hover:bg-cyan-50 transition-colors text-left"
                              >
                                <div>
                                  <span className="font-medium text-gray-900">{student.name}</span>
                                  {student.telegramUsername && (
                                    <p className="text-xs text-gray-400">{student.telegramUsername}</p>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">{student.trails.length} направлений</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Student Analytics Content */}
                  {loadingStudentDetail && (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-cyan-500" />
                    </div>
                  )}

                  {selectedStudentData && !loadingStudentDetail && (
                    <div className="space-y-4">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border border-amber-100">
                          <div className="flex items-center gap-2 text-amber-700 mb-1">
                            <Star className="h-4 w-4" />
                            <span className="text-xs font-medium">Total XP</span>
                          </div>
                          <span className="text-xl font-bold text-amber-800">
                            {selectedStudentData.totalXP.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                          <div className="flex items-center gap-2 text-blue-700 mb-1">
                            <Target className="h-4 w-4" />
                            <span className="text-xs font-medium">Направлений</span>
                          </div>
                          <span className="text-xl font-bold text-blue-800">
                            {selectedStudentData.trailProgress.length}
                          </span>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
                          <div className="flex items-center gap-2 text-green-700 mb-1">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Ср. оценка</span>
                          </div>
                          <span className="text-xl font-bold text-green-800">
                            {selectedStudentData.avgScore !== null ? `${selectedStudentData.avgScore}/10` : "—"}
                          </span>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg border border-purple-100">
                          <Link
                            href={`/dashboard/${selectedStudentData.id}`}
                            target="_blank"
                            className="block h-full"
                          >
                            <div className="flex items-center gap-2 text-purple-700 mb-1">
                              <ExternalLink className="h-4 w-4" />
                              <span className="text-xs font-medium">Профиль</span>
                            </div>
                            <span className="text-sm font-medium text-purple-800 hover:underline">
                              Открыть дашборд →
                            </span>
                          </Link>
                        </div>
                      </div>

                      {/* Trail Progress Breakdown */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          Прогресс по направлениям
                        </h4>
                        {selectedStudentData.trailProgress.map((trail) => (
                          <div key={trail.trailId} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/trails/${trail.trailSlug}`}
                                  target="_blank"
                                  className="font-medium text-gray-900 hover:text-cyan-700 hover:underline"
                                >
                                  {trail.trailTitle}
                                </Link>
                                <ExternalLink className="h-3 w-3 text-gray-400" />
                              </div>
                              <div className="flex items-center gap-2">
                                {trail.avgScore !== null && (
                                  <Badge className={`text-xs border-0 ${
                                    trail.avgScore >= 8
                                      ? "bg-green-100 text-green-700"
                                      : trail.avgScore >= 6
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-red-100 text-red-700"
                                  }`}>
                                    {trail.avgScore}/10
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {/* Date Start / Progress / Date End row */}
                            <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                              <div>
                                <span className="text-gray-400">Старт: </span>
                                <span className="text-gray-700 font-medium">{formatDate(trail.dateStart)}</span>
                              </div>
                              <div className="text-center">
                                <span className="text-gray-400">Прогресс: </span>
                                <span className="text-gray-700 font-medium">
                                  {trail.modulesCompleted}/{trail.totalModules} ({trail.completionPercent}%)
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-400">Завершение: </span>
                                {trail.dateEnd ? (
                                  <span className="text-green-700 font-medium">{formatDate(trail.dateEnd)}</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                              <Progress value={trail.completionPercent} className="h-2 flex-1" />
                              <span className="text-xs text-gray-600 whitespace-nowrap">
                                {trail.modulesCompleted}/{trail.totalModules} модулей
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                {trail.submissions?.approved || 0} принято
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-yellow-500" />
                                {trail.submissions?.pending || 0} на проверке
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3 text-orange-500" />
                                {trail.submissions?.revision || 0} на доработке
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Insights */}
                      {(selectedStudentData.strongModules.length > 0 || selectedStudentData.weakModules.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedStudentData.strongModules.length > 0 && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                                <TrendingUp className="h-4 w-4" />
                                Сильные модули
                              </div>
                              <ul className="text-sm text-green-600 space-y-1">
                                {selectedStudentData.strongModules.map((m, i) => (
                                  <li key={i}>• {m}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {selectedStudentData.weakModules.length > 0 && (
                            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <div className="flex items-center gap-2 text-orange-700 font-medium mb-2">
                                <AlertTriangle className="h-4 w-4" />
                                Сложные модули (узкие места)
                              </div>
                              <ul className="text-sm text-orange-600 space-y-1">
                                {selectedStudentData.weakModules.map((m, i) => (
                                  <li key={i}>• {m}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* AI Analysis Section */}
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            AI-анализ прогресса
                          </h4>
                          <Button
                            onClick={requestAiAnalysis}
                            disabled={aiAnalysis.loading}
                            size="sm"
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                          >
                            {aiAnalysis.loading ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Анализ...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Запросить анализ
                              </>
                            )}
                          </Button>
                        </div>

                        {aiAnalysis.error && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-red-700">{aiAnalysis.error}</span>
                          </div>
                        )}

                        {aiAnalysis.analysis && (
                          <div className="relative p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
                            <button
                              onClick={() => setAiAnalysis({ analysis: "", studentName: "", loading: false, error: null })}
                              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded z-10"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <MarkdownRenderer
                              content={aiAnalysis.analysis}
                              className="text-sm text-gray-700"
                            />
                          </div>
                        )}

                        {!aiAnalysis.analysis && !aiAnalysis.error && !aiAnalysis.loading && (
                          <p className="text-sm text-gray-500 text-center py-4">
                            Нажмите &quot;Запросить анализ&quot; для получения AI-рекомендаций по улучшению прогресса студента
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {!selectedStudentData && !loadingStudentDetail && (
                    <div className="text-center py-8 text-gray-500">
                      <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">Выберите студента для просмотра детальной аналитики</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Trail Progress */}
            {data.trailProgress && data.trailProgress.length > 0 && (
              <Card>
                <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSection("trailProgress")}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="h-4 w-4 text-blue-500" />
                      Прогресс по направлениям
                    </CardTitle>
                    {sectionsExpanded.trailProgress ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Завершённость и качество работ по каждому trail</p>
                </CardHeader>
                {sectionsExpanded.trailProgress && <CardContent className="space-y-4">
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
                </CardContent>}
              </Card>
            )}

            {/* Score Distribution */}
            {data.scoreDistribution && data.scoreDistribution.total > 0 && (
              <Card>
                <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSection("scoreDistribution")}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Star className="h-4 w-4 text-yellow-500" />
                      Распределение оценок
                    </CardTitle>
                    {sectionsExpanded.scoreDistribution ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Всего оценено работ: {data.scoreDistribution.total}
                    {data.scoreDistribution.avgScore && (
                      <> • Средняя: <span className="font-medium text-blue-600">{data.scoreDistribution.avgScore}/10</span></>
                    )}
                  </p>
                  {data.scoreDistribution.filteredByTrail && (
                    <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      Данные отфильтрованы по выбранному направлению
                    </p>
                  )}
                </CardHeader>
                {sectionsExpanded.scoreDistribution && <CardContent>
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
                </CardContent>}
              </Card>
            )}
          </div>

          {/* Top Students */}
          {data.topStudents && data.topStudents.length > 0 && (
            <Card className="mt-6">
              <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSection("topStudents")}>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GraduationCap className="h-4 w-4 text-purple-500" />
                    Лидеры платформы
                  </CardTitle>
                  {sectionsExpanded.topStudents ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500">Топ-10 студентов по XP и достижениям</p>
              </CardHeader>
              {sectionsExpanded.topStudents && <CardContent>
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
                        <tr key={student.id} className="border-b hover:bg-purple-50 transition-colors group">
                          <td className="py-2 text-gray-500">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                          </td>
                          <td className="py-2">
                            <Link
                              href={`/dashboard/${student.id}`}
                              target="_blank"
                              className="flex items-center gap-2 font-medium text-gray-900 hover:text-purple-700 transition-colors"
                            >
                              <span className="group-hover:underline">{student.name}</span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-500" />
                            </Link>
                          </td>
                          <td className="py-2 text-center">
                            <span className="font-bold text-amber-600">{student.totalXP.toLocaleString()}</span>
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
              </CardContent>}
            </Card>
          )}
        </div>

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
                  className="w-full flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
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
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="truncate">{student.email}</span>
                            {student.telegramUsername && (
                              <button
                                onClick={() => copyTg(student.telegramUsername!, student.name)}
                                className="text-blue-500 hover:text-blue-700 hover:underline transition-colors shrink-0"
                                title="Копировать TG-ник"
                              >
                                {copiedTg === student.telegramUsername ? "Скопировано" : student.telegramUsername}
                              </button>
                            )}
                          </div>
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
                  className="w-full flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors cursor-pointer"
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
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="truncate">{student.email}</span>
                            {student.telegramUsername && (
                              <button
                                onClick={() => copyTg(student.telegramUsername!, student.name)}
                                className="text-blue-500 hover:text-blue-700 hover:underline transition-colors shrink-0"
                                title="Копировать TG-ник"
                              >
                                {copiedTg === student.telegramUsername ? "Скопировано" : student.telegramUsername}
                              </button>
                            )}
                          </div>
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
              <div className="mb-4">
                <button
                  onClick={() => setExpandedRisk(expandedRisk === "low" ? null : "low")}
                  className="w-full flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500">Низкий</Badge>
                    <span className="text-green-700 font-medium">{data.churnRisk.lowCount} студентов</span>
                    <span className="text-green-600 text-sm">(активны)</span>
                  </div>
                  {expandedRisk === "low" ? (
                    <ChevronUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-green-500" />
                  )}
                </button>
                {expandedRisk === "low" && (
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {data.churnRisk.low.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">Нет активных студентов</p>
                    ) : (
                      data.churnRisk.low.map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-green-200 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900">{student.name}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="truncate">{student.email}</span>
                              {student.telegramUsername && (
                                <button
                                  onClick={() => copyTg(student.telegramUsername!, student.name)}
                                  className="text-blue-500 hover:text-blue-700 hover:underline transition-colors shrink-0"
                                  title="Копировать TG-ник"
                                >
                                  {copiedTg === student.telegramUsername ? "Скопировано" : student.telegramUsername}
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="text-xs bg-green-100 text-green-700 border-0">
                                {student.daysSinceActive === 0 ? "Сегодня" : `${student.daysSinceActive} д. назад`}
                              </Badge>
                              {student.modulesCompleted !== undefined && (
                                <span className="text-xs text-gray-400">
                                  {student.modulesCompleted} модулей
                                </span>
                              )}
                              {student.xp !== undefined && student.xp > 0 && (
                                <span className="text-xs text-amber-600">
                                  {student.xp} XP
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
                          </div>
                        </div>
                      ))
                    )}
                    {data.churnRisk.lowCount > 30 && (
                      <p className="text-xs text-gray-500 text-center py-2">
                        Показаны 30 из {data.churnRisk.lowCount} активных студентов
                      </p>
                    )}
                  </div>
                )}
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
                          style={{ width: `${stage.count > 0 ? Math.max(stage.percent, 2) : 0}%` }}
                        />
                      </div>
                      {index < data.funnel.length - 1 && (
                        <div className="text-center my-1">
                          {(() => {
                            const nextStage = data.funnel[index + 1]
                            if (stage.count === 0 || nextStage.count === 0) {
                              return <span className="text-xs text-gray-400">—</span>
                            }
                            const conversionRate = Math.round((nextStage.count / stage.count) * 100)
                            const isAnomalous = conversionRate > 100

                            return (
                              <span className={`text-xs ${isAnomalous ? "text-orange-500" : "text-gray-400"}`}>
                                {isAnomalous ? (
                                  <span className="flex items-center justify-center gap-1 relative">
                                    <AlertTriangle className="h-3 w-3" />
                                    {nextStage.count} из {stage.count} ({conversionRate}%)
                                    <span className="relative cursor-help">
                                      <HelpCircle className="h-3 w-3 hover:text-orange-600" />
                                      <span className="hidden group-hover:block absolute z-20 left-1/2 transform -translate-x-1/2 bottom-full mb-1 p-2 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
                                        &gt;100% означает, что студенты пропустили предыдущие шаги
                                      </span>
                                    </span>
                                  </span>
                                ) : (
                                  `${nextStage.count} из ${stage.count} (${conversionRate}%) переходят`
                                )}
                              </span>
                            )
                          })()}
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
          <CardHeader className="cursor-pointer" onClick={() => toggleSection("difficulty")}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                {ANALYTICS_INFO.difficulty.title}
              </CardTitle>
              {sectionsExpanded.difficulty ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">{ANALYTICS_INFO.difficulty.description}</p>
          </CardHeader>
          {sectionsExpanded.difficulty && <CardContent>
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
                    <th className="py-2 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.difficultyAnalysis.slice(0, 15).map((module) => (
                    <tr key={module.id} className="border-b hover:bg-gray-50 transition-colors group">
                      <td className="py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{module.title}</span>
                          {module.trailTitle && (
                            <Link
                              href={`/trails/${module.trailSlug}`}
                              target="_blank"
                              className="text-xs text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1"
                            >
                              <Layers className="h-3 w-3" />
                              {module.trailTitle}
                            </Link>
                          )}
                        </div>
                      </td>
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
                      <td className="py-2">
                        <Link
                          href={`/module/${module.slug}`}
                          target="_blank"
                          className="p-1 text-gray-400 hover:text-purple-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
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
          </CardContent>}
        </Card>

        {/* Module Drop-off Analysis - Bottlenecks */}
        {data.dropoffAnalysis && data.dropoffAnalysis.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => toggleSection("dropoffSection")}
              className="flex items-center gap-2 mb-4 cursor-pointer w-full"
            >
              <Zap className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-900">Анализ Drop-off по модулям</h2>
              <span className="text-xs text-gray-500">— Где студенты останавливаются</span>
              <div className="ml-auto">
                {sectionsExpanded.dropoffSection ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </button>

            {sectionsExpanded.dropoffSection && <div className="space-y-4">
              {data.dropoffAnalysis.map((trail) => (
                <Card key={trail.trailId}>
                  <CardHeader className="pb-2">
                    <div className="w-full flex items-center justify-between">
                      <button
                        onClick={() => setExpandedDropoff(expandedDropoff === trail.trailId ? null : trail.trailId)}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        <CardTitle className="text-base">{trail.trailTitle}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {trail.totalEnrolled} записались
                        </Badge>
                        {trail.modules.some(m => m.isBottleneck) && (
                          <Badge className="text-xs bg-orange-100 text-orange-700 border-0">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {trail.modules.filter(m => m.isBottleneck).length} узких мест
                          </Badge>
                        )}
                      </button>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/trails/${trail.trailSlug}`}
                          target="_blank"
                          className="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <button onClick={() => setExpandedDropoff(expandedDropoff === trail.trailId ? null : trail.trailId)} className="cursor-pointer">
                          {expandedDropoff === trail.trailId ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  {expandedDropoff === trail.trailId && (
                    <CardContent className="pt-0">
                      {/* Visual funnel */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                          <Info className="h-3.5 w-3.5" />
                          <span>Визуализация: ширина блока = % завершивших</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {trail.modules.map((module, index) => (
                            <div key={module.id} className="flex items-center">
                              <div
                                className={`h-8 rounded transition-all ${
                                  module.isBottleneck
                                    ? "bg-orange-400"
                                    : module.completionRate >= 70
                                    ? "bg-green-400"
                                    : module.completionRate >= 40
                                    ? "bg-yellow-400"
                                    : "bg-red-400"
                                }`}
                                style={{
                                  width: `${Math.max(module.completionRate, 5)}px`,
                                  minWidth: "20px",
                                  maxWidth: "100px",
                                }}
                                title={`${module.title}: ${module.completionRate}%`}
                              />
                              {index < trail.modules.length - 1 && (
                                <ArrowRight className="h-4 w-4 text-gray-300 mx-0.5" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="py-2 font-medium w-8">#</th>
                              <th className="py-2 font-medium">Модуль</th>
                              <th className="py-2 font-medium text-center">Тип</th>
                              <th className="py-2 font-medium text-center">Начали</th>
                              <th className="py-2 font-medium text-center">Завершили</th>
                              <th className="py-2 font-medium text-center">% завершения</th>
                              <th className="py-2 font-medium text-center">Drop-off</th>
                              <th className="py-2 font-medium text-center">Ср. время</th>
                              <th className="py-2 font-medium w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {trail.modules.map((module, index) => (
                              <tr
                                key={module.id}
                                className={`border-b hover:bg-gray-50 transition-colors group ${
                                  module.isBottleneck ? "bg-orange-50" : ""
                                }`}
                              >
                                <td className="py-2 text-gray-500">{index + 1}</td>
                                <td className="py-2">
                                  <div className="flex items-center gap-2">
                                    <Link
                                      href={`/module/${module.slug}`}
                                      target="_blank"
                                      className="font-medium text-gray-900 hover:text-purple-700 hover:underline"
                                    >
                                      {module.title}
                                    </Link>
                                    {module.isBottleneck && (
                                      <Badge className="text-xs bg-orange-100 text-orange-700 border-0">
                                        Узкое место
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 text-center">
                                  <Badge variant="outline" className="text-xs">
                                    {module.type === "THEORY" ? "Теория" : module.type === "PRACTICE" ? "Практика" : "Проект"}
                                  </Badge>
                                </td>
                                <td className="py-2 text-center">{module.startedCount}</td>
                                <td className="py-2 text-center font-medium">{module.completedCount}</td>
                                <td className="py-2 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <Progress
                                      value={module.completionRate}
                                      className="h-2 w-16"
                                    />
                                    <span className={`text-xs font-medium ${
                                      module.completionRate >= 70 ? "text-green-600" :
                                      module.completionRate >= 40 ? "text-yellow-600" :
                                      "text-red-600"
                                    }`}>
                                      {module.completionRate}%
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 text-center">
                                  {module.dropRate > 0 ? (
                                    <span className={`text-xs font-medium ${
                                      module.dropRate > 30 ? "text-red-600" :
                                      module.dropRate > 15 ? "text-yellow-600" :
                                      "text-gray-500"
                                    }`}>
                                      -{module.dropRate}%
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="py-2 text-center text-gray-500">
                                  {module.avgTimeDays > 0 ? `${module.avgTimeDays} д.` : "—"}
                                </td>
                                <td className="py-2">
                                  <Link
                                    href={`/module/${module.slug}`}
                                    target="_blank"
                                    className="p-1 text-gray-400 hover:text-purple-600 transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary insights */}
                      {trail.modules.some(m => m.isBottleneck) && (
                        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center gap-2 text-orange-700 font-medium mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            Обнаружены узкие места
                          </div>
                          <ul className="text-sm text-orange-600 space-y-1">
                            {trail.modules
                              .filter(m => m.isBottleneck)
                              .map(m => (
                                <li key={m.id}>
                                  • <strong>{m.title}</strong>: {m.dropRate}% студентов не продолжают после этого модуля
                                </li>
                              ))}
                          </ul>
                          <p className="text-xs text-orange-500 mt-2">
                            Рекомендация: проверьте сложность контента или добавьте дополнительные материалы
                          </p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>}
          </div>
        )}

      </div>
    </div>
  )
}
