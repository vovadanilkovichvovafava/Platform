"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Search,
  Filter,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Timer,
  Pencil,
  ArrowUpDown,
} from "lucide-react"

interface TimeTracking {
  moduleStartedAt: string | null
  firstSubmittedAt: string | null
  timeToFirstSubmitMs: number | null
  totalEditTimeMs: number | null
  editCount: number
  lastActivityAt: string | null
}

interface Submission {
  id: string
  status: string
  createdAt: string
  updatedAt: string
  githubUrl: string | null
  deployUrl: string | null
  fileUrl: string | null
  user: {
    id?: string
    name: string
    email: string
    telegramUsername?: string | null
  }
  module: {
    title: string
    trail: {
      title: string
    }
  }
  review?: {
    score: number
    comment: string | null
    createdAt: string
    reviewer: {
      name: string
    }
  } | null
  timeTracking?: TimeTracking
}

interface InitialFilters {
  trail: string
  status: string
  sort: string
  q: string
}

interface SubmissionsFilterProps {
  pendingSubmissions: Submission[]
  reviewedSubmissions: Submission[]
  trails: string[]
  initialFilters: InitialFilters
}

/** Format milliseconds into a compact human-readable duration (e.g. "2ч 15мин", "45мин", "3д 1ч") */
function formatDuration(ms: number | null | undefined): string | null {
  if (ms == null || ms < 0) return null
  const totalMinutes = Math.floor(ms / 60000)
  if (totalMinutes < 1) return "< 1мин"
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}д ${hours}ч`
  if (hours > 0) return minutes > 0 ? `${hours}ч ${minutes}мин` : `${hours}ч`
  return `${minutes}мин`
}

/** Build a detailed tooltip string for time tracking metrics */
function buildTimeTooltip(tt: TimeTracking): string {
  const lines: string[] = []
  if (tt.moduleStartedAt) {
    lines.push(`Старт модуля: ${new Date(tt.moduleStartedAt).toLocaleString("ru-RU")}`)
  }
  if (tt.firstSubmittedAt) {
    lines.push(`Первая отправка: ${new Date(tt.firstSubmittedAt).toLocaleString("ru-RU")}`)
  }
  const ttfs = formatDuration(tt.timeToFirstSubmitMs)
  if (ttfs) {
    lines.push(`Время до первой отправки: ${ttfs}`)
  }
  if (tt.editCount > 0) {
    const editDur = formatDuration(tt.totalEditTimeMs)
    lines.push(`Правок: ${tt.editCount}${editDur ? ` (${editDur})` : ""}`)
  }
  if (tt.lastActivityAt) {
    lines.push(`Последняя активность: ${new Date(tt.lastActivityAt).toLocaleString("ru-RU")}`)
  }
  return lines.join("\n")
}

function getDaysWaiting(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function getDaysWaitingLabel(days: number): { label: string; color: string } {
  if (days === 0) return { label: "Сегодня", color: "bg-green-100 text-green-700" }
  if (days === 1) return { label: "1 день", color: "bg-green-100 text-green-700" }
  if (days <= 3) return { label: `${days} дня`, color: "bg-yellow-100 text-yellow-700" }
  if (days <= 7) return { label: `${days} дней`, color: "bg-orange-100 text-orange-700" }
  return { label: `${days} дней`, color: "bg-red-100 text-red-700" }
}

/** Build a URL query string from filter state. Default values are omitted to keep URLs clean. */
function buildFilterQuery(filters: { trail: string; status: string; sort: string; q: string }): string {
  const params = new URLSearchParams()
  if (filters.trail && filters.trail !== "all") params.set("trail", filters.trail)
  if (filters.status && filters.status !== "all") params.set("status", filters.status)
  if (filters.sort && filters.sort !== "waiting") params.set("sort", filters.sort)
  if (filters.q) params.set("q", filters.q)
  return params.toString()
}

/** Normalize initial filter values: validate trail against available list, validate sort/status enums */
function normalizeFilters(initial: InitialFilters, trails: string[]): { trail: string; status: string; sort: "waiting" | "time_to_submit"; q: string } {
  const validStatuses = ["all", "APPROVED", "REVISION", "FAILED"]
  const validSorts = ["waiting", "time_to_submit"]
  return {
    trail: initial.trail === "all" || trails.includes(initial.trail) ? initial.trail : "all",
    status: validStatuses.includes(initial.status) ? initial.status : "all",
    sort: (validSorts.includes(initial.sort) ? initial.sort : "waiting") as "waiting" | "time_to_submit",
    q: initial.q || "",
  }
}

export function SubmissionsFilter({
  pendingSubmissions,
  reviewedSubmissions,
  trails,
  initialFilters,
}: SubmissionsFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  // Normalize and validate initial filter values from URL
  const normalized = useMemo(() => normalizeFilters(initialFilters, trails), [initialFilters, trails])

  const [search, setSearch] = useState(normalized.q)
  const [trailFilter, setTrailFilter] = useState(normalized.trail)
  const [statusFilter, setStatusFilter] = useState(normalized.status)
  const [sortBy, setSortBy] = useState<"waiting" | "time_to_submit">(normalized.sort)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Sync filter state to URL (without triggering server re-render)
  const updateUrl = useCallback((filters: { trail: string; status: string; sort: string; q: string }) => {
    const qs = buildFilterQuery(filters)
    const newUrl = qs ? `${pathname}?${qs}` : pathname
    window.history.replaceState(null, "", newUrl)
  }, [pathname])

  // Build current query string for use in links
  const currentQueryString = useMemo(
    () => buildFilterQuery({ trail: trailFilter, status: statusFilter, sort: sortBy, q: search }),
    [trailFilter, statusFilter, sortBy, search],
  )

  // Debounced URL sync for search input
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      updateUrl({ trail: trailFilter, status: statusFilter, sort: sortBy, q: value })
    }, 300)
  }, [trailFilter, statusFilter, sortBy, updateUrl])

  // Immediate URL sync for select-based filters
  const handleTrailChange = useCallback((value: string) => {
    setTrailFilter(value)
    updateUrl({ trail: value, status: statusFilter, sort: sortBy, q: search })
  }, [statusFilter, sortBy, search, updateUrl])

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value)
    updateUrl({ trail: trailFilter, status: value, sort: sortBy, q: search })
  }, [trailFilter, sortBy, search, updateUrl])

  const handleSortChange = useCallback((value: string) => {
    setSortBy(value as "waiting" | "time_to_submit")
    updateUrl({ trail: trailFilter, status: statusFilter, sort: value, q: search })
  }, [trailFilter, statusFilter, search, updateUrl])

  // Hover-based activation: button becomes active after 1.5s of hovering
  const [readyToDeleteId, setReadyToDeleteId] = useState<string | null>(null)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)
  const HOVER_DELAY_MS = 1500

  // Handle mouse enter - start 1.5s timer
  const handleDeleteMouseEnter = (id: string) => {
    // Clear any existing timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
    }
    // Start new timer - after 1.5s button becomes active
    hoverTimerRef.current = setTimeout(() => {
      setReadyToDeleteId(id)
    }, HOVER_DELAY_MS)
  }

  // Handle mouse leave - cancel timer and reset ready state
  const handleDeleteMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setReadyToDeleteId(null)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
      }
    }
  }, [])

  const handleDeleteSubmission = async (id: string, userName: string, moduleTitle: string) => {
    // Only allow if button is ready (hovered for 1.5s) and not already deleting
    if (readyToDeleteId !== id || deletingId) {
      return
    }

    const confirmed = await confirm({
      title: "Удалить работу?",
      message: `Вы уверены, что хотите удалить работу "${moduleTitle}" от ${userName}? Это действие необратимо. Студент получит уведомление об удалении.`,
      confirmText: "Удалить",
      variant: "danger",
    })

    if (!confirmed) return

    // Reset ready state after action
    setReadyToDeleteId(null)

    try {
      setDeletingId(id)
      const res = await fetch(`/api/teacher/submissions/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Ошибка удаления")
      }

      showToast("Работа удалена", "success")
      router.refresh() // Refresh to get updated list
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Ошибка при удалении", "error")
    } finally {
      setDeletingId(null)
    }
  }

  const filteredPending = useMemo(() => {
    return pendingSubmissions.filter((sub) => {
      const matchesSearch =
        !search ||
        sub.user.name.toLowerCase().includes(search.toLowerCase()) ||
        sub.user.email.toLowerCase().includes(search.toLowerCase()) ||
        (sub.user.telegramUsername && sub.user.telegramUsername.toLowerCase().includes(search.toLowerCase())) ||
        sub.module.title.toLowerCase().includes(search.toLowerCase())
      const matchesTrail =
        trailFilter === "all" || sub.module.trail.title === trailFilter
      return matchesSearch && matchesTrail
    })
  }, [pendingSubmissions, search, trailFilter])

  const filteredReviewed = useMemo(() => {
    return reviewedSubmissions.filter((sub) => {
      const matchesSearch =
        !search ||
        sub.user.name.toLowerCase().includes(search.toLowerCase()) ||
        sub.user.email.toLowerCase().includes(search.toLowerCase()) ||
        (sub.user.telegramUsername && sub.user.telegramUsername.toLowerCase().includes(search.toLowerCase())) ||
        sub.module.title.toLowerCase().includes(search.toLowerCase())
      const matchesTrail =
        trailFilter === "all" || sub.module.trail.title === trailFilter
      const matchesStatus =
        statusFilter === "all" || sub.status === statusFilter
      return matchesSearch && matchesTrail && matchesStatus
    })
  }, [reviewedSubmissions, search, trailFilter, statusFilter])

  // Sort pending submissions
  const sortedPending = useMemo(() => {
    return [...filteredPending].sort((a, b) => {
      if (sortBy === "time_to_submit") {
        // Sort by time to first submit (longest first), null values at end
        const aMs = a.timeTracking?.timeToFirstSubmitMs
        const bMs = b.timeTracking?.timeToFirstSubmitMs
        if (aMs == null && bMs == null) return 0
        if (aMs == null) return 1
        if (bMs == null) return -1
        return bMs - aMs
      }
      // Default: oldest first (days waiting)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }, [filteredPending, sortBy])

  return (
    <>
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Поиск по имени, email или модулю..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={trailFilter} onValueChange={handleTrailChange}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Trail" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все trails</SelectItem>
                  {trails.map((trail) => (
                    <SelectItem key={trail} value={trail}>
                      {trail}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[200px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Сортировка" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiting">По времени ожидания</SelectItem>
                  <SelectItem value="time_to_submit">По времени выполнения</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="APPROVED">Принято</SelectItem>
                  <SelectItem value="REVISION">На доработку</SelectItem>
                  <SelectItem value="FAILED">Провал</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Submissions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Работы на проверку
            {sortedPending.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {sortedPending.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedPending.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {pendingSubmissions.length === 0
                  ? "Все работы проверены!"
                  : "Нет работ по выбранным фильтрам"}
              </h3>
              <p className="text-gray-600">
                {pendingSubmissions.length === 0
                  ? "Новые работы появятся здесь автоматически"
                  : "Попробуйте изменить фильтры"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedPending.map((submission) => {
                const days = getDaysWaiting(submission.createdAt)
                const { label, color } = getDaysWaitingLabel(days)

                return (
                  <div
                    key={submission.id}
                    className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {submission.module.trail.title}
                        </Badge>
                        <Badge className={`${color} border-0`}>
                          <Clock className="h-3 w-3 mr-1" />
                          {label}
                        </Badge>
                        {days >= 3 && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900">
                        {submission.module.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {submission.user.name} ({submission.user.email}){submission.user.telegramUsername && <span className="ml-1 text-blue-500">{submission.user.telegramUsername}</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Отправлено{" "}
                        {new Date(submission.createdAt).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {/* Time tracking metrics (teacher only) */}
                      {submission.timeTracking && (
                        <div
                          className="flex items-center gap-3 mt-1.5 text-xs text-gray-400"
                          title={buildTimeTooltip(submission.timeTracking)}
                        >
                          {submission.timeTracking.timeToFirstSubmitMs != null && (
                            <span className="inline-flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {formatDuration(submission.timeTracking.timeToFirstSubmitMs)}
                            </span>
                          )}
                          {submission.timeTracking.editCount > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Pencil className="h-3 w-3" />
                              {submission.timeTracking.editCount}
                              {submission.timeTracking.totalEditTimeMs != null && (
                                <span>({formatDuration(submission.timeTracking.totalEditTimeMs)})</span>
                              )}
                            </span>
                          )}
                        </div>
                      )}
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
                        <Link href={`/teacher/reviews/${submission.id}${currentQueryString ? `?from=${encodeURIComponent(currentQueryString)}` : ""}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Проверить
                        </Link>
                      </Button>
                      <Button
                        variant="ghost-destructive"
                        size="sm"
                        className={
                          deletingId === submission.id
                            ? "text-red-500"
                            : readyToDeleteId !== submission.id
                              ? "opacity-50"
                              : ""
                        }
                        onClick={() => handleDeleteSubmission(
                          submission.id,
                          submission.user.name,
                          submission.module.title
                        )}
                        onMouseEnter={() => handleDeleteMouseEnter(submission.id)}
                        onMouseLeave={handleDeleteMouseLeave}
                        disabled={deletingId === submission.id}
                        title={
                          deletingId === submission.id
                            ? "Удаляем…"
                            : readyToDeleteId !== submission.id
                              ? "Наведите и подождите 1.5с"
                              : "Удалить работу"
                        }
                      >
                        {deletingId === submission.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                            <span className="text-xs">Удаляем…</span>
                          </>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
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
            {filteredReviewed.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filteredReviewed.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReviewed.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {reviewedSubmissions.length === 0
                ? "Пока нет проверенных работ"
                : "Нет работ по выбранным фильтрам"}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReviewed.map((submission) => (
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
                      {submission.user.name}{submission.user.telegramUsername && <span className="ml-1 text-blue-500">{submission.user.telegramUsername}</span>}
                    </p>
                    {/* Time tracking metrics for reviewed submissions */}
                    {submission.timeTracking && (
                      <div
                        className="flex items-center gap-3 mt-1 text-xs text-gray-400"
                        title={buildTimeTooltip(submission.timeTracking)}
                      >
                        {submission.timeTracking.timeToFirstSubmitMs != null && (
                          <span className="inline-flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {formatDuration(submission.timeTracking.timeToFirstSubmitMs)}
                          </span>
                        )}
                        {submission.timeTracking.editCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Pencil className="h-3 w-3" />
                            {submission.timeTracking.editCount}
                          </span>
                        )}
                      </div>
                    )}
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
                      <Link href={`/teacher/reviews/${submission.id}${currentQueryString ? `?from=${encodeURIComponent(currentQueryString)}` : ""}`}>
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
    </>
  )
}
