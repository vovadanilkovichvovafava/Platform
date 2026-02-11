"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Trophy,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  CalendarDays,
  Search,
  Filter,
  SortAsc,
  ChevronLeft,
  ChevronRight,
  List,
} from "lucide-react"
import { pluralizeRu } from "@/lib/utils"
import {
  PER_PAGE_OPTIONS,
  type PerPageOption,
  parsePageParam,
  parsePerPageParam,
  parseEnumParam,
  updateUrl,
  loadFiltersFromStorage,
} from "@/lib/url-state"

const VALID_SORTS = ["xp", "name", "activity", "modules"] as const
type SortOption = (typeof VALID_SORTS)[number]

const FILTER_DEFAULTS = {
  q: "",
  trail: "all",
  sort: "xp",
  page: "1",
  perPage: "10",
}

interface InitialFilters {
  q: string
  trail: string
  sort: string
  page: string
  perPage: string
}

interface StudentEnrollment {
  trailId: string
  trail: {
    id: string
    title: string
    slug: string
  }
}

interface StudentSubmission {
  status: string
  createdAt: string
  module: {
    title: string
  }
}

interface Student {
  id: string
  name: string
  email: string
  telegramUsername?: string | null
  totalXP: number
  enrollments: StudentEnrollment[]
  moduleProgress: { id: string }[]
  submissions: StudentSubmission[]
  _count: {
    submissions: number
    activityDays: number
  }
  stats: {
    pending: number
    approved: number
    revision: number
  }
  maxXP: number
}

interface StudentsSearchProps {
  students: Student[]
  trails: string[]
  initialFilters?: InitialFilters
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function StudentsSearch({ students, trails, initialFilters }: StudentsSearchProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Normalize and validate initial filter values from server props (for SSR hydration)
  const normalizedQ = initialFilters?.q || ""
  const normalizedTrail =
    initialFilters?.trail === "all" || (initialFilters?.trail && trails.includes(initialFilters.trail))
      ? initialFilters.trail
      : "all"
  const normalizedSort = parseEnumParam(initialFilters?.sort, VALID_SORTS, "xp")
  const normalizedPerPage = parsePerPageParam(initialFilters?.perPage, 10)
  const normalizedPage = parsePageParam(initialFilters?.page, 1)

  const [search, setSearch] = useState(normalizedQ)
  const [trailFilter, setTrailFilter] = useState(normalizedTrail)
  const [sortBy, setSortBy] = useState<SortOption>(normalizedSort)
  const [perPage, setPerPage] = useState<PerPageOption>(normalizedPerPage)
  const [currentPage, setCurrentPage] = useState(normalizedPage)
  const [copiedTg, setCopiedTg] = useState<string | null>(null)

  // Sync filter state to URL (without triggering server re-render)
  const syncUrl = useCallback(
    (params: { q: string; trail: string; sort: string; page: number; perPage: number }) => {
      updateUrl(
        pathname,
        {
          q: params.q,
          trail: params.trail,
          sort: params.sort,
          page: String(params.page),
          perPage: String(params.perPage),
        },
        FILTER_DEFAULTS,
      )
    },
    [pathname],
  )

  // Keep trails in a ref to avoid effect re-runs on array reference changes
  const trailsRef = useRef(trails)
  trailsRef.current = trails

  // Sync state from URL search params on every navigation change.
  // useSearchParams() reactively tracks URL changes (including replaceState in Next.js 14.1+),
  // so this fires on back/forward navigation, breadcrumb clicks, and filter changes.
  // Falls back to sessionStorage for breadcrumb links that navigate without query params.
  useEffect(() => {
    const currentTrails = trailsRef.current
    const stored = loadFiltersFromStorage(pathname)

    const resolvedQ = searchParams.get("q") ?? stored?.q ?? ""
    const rawTrail = searchParams.get("trail") ?? stored?.trail ?? "all"
    const resolvedTrail =
      rawTrail === "all" || currentTrails.includes(rawTrail) ? rawTrail : "all"
    const resolvedSort = parseEnumParam(
      searchParams.get("sort") ?? stored?.sort ?? undefined,
      VALID_SORTS,
      "xp",
    )
    const resolvedPerPage = parsePerPageParam(
      searchParams.get("perPage") ?? stored?.perPage ?? undefined,
      10,
    )
    const resolvedPage = parsePageParam(
      searchParams.get("page") ?? stored?.page ?? undefined,
      1,
    )

    setSearch(resolvedQ)
    setTrailFilter(resolvedTrail)
    setSortBy(resolvedSort)
    setPerPage(resolvedPerPage)
    setCurrentPage(resolvedPage)
  }, [searchParams, pathname])

  // Debounced URL sync for search input
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      setCurrentPage(1)
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(() => {
        syncUrl({ q: value, trail: trailFilter, sort: sortBy, page: 1, perPage })
      }, 300)
    },
    [trailFilter, sortBy, perPage, syncUrl],
  )

  const handleTrailFilterChange = useCallback(
    (value: string) => {
      setTrailFilter(value)
      setCurrentPage(1)
      syncUrl({ q: search, trail: value, sort: sortBy, page: 1, perPage })
    },
    [search, sortBy, perPage, syncUrl],
  )

  const handleSortChange = useCallback(
    (value: string) => {
      setSortBy(value as SortOption)
      setCurrentPage(1)
      syncUrl({ q: search, trail: trailFilter, sort: value, page: 1, perPage })
    },
    [search, trailFilter, perPage, syncUrl],
  )

  const handlePerPageChange = useCallback(
    (value: string) => {
      const newPerPage = parseInt(value, 10) as PerPageOption
      setPerPage(newPerPage)
      setCurrentPage(1)
      syncUrl({ q: search, trail: trailFilter, sort: sortBy, page: 1, perPage: newPerPage })
    },
    [search, trailFilter, sortBy, syncUrl],
  )

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page)
      syncUrl({ q: search, trail: trailFilter, sort: sortBy, page, perPage })
    },
    [search, trailFilter, sortBy, perPage, syncUrl],
  )

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let result = students.filter((student) => {
      const matchesSearch =
        !search ||
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.email.toLowerCase().includes(search.toLowerCase()) ||
        (student.telegramUsername && student.telegramUsername.toLowerCase().includes(search.toLowerCase()))
      const matchesTrail =
        trailFilter === "all" ||
        student.enrollments.some((e) => e.trail.title === trailFilter)
      return matchesSearch && matchesTrail
    })

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "xp":
          return b.totalXP - a.totalXP
        case "name":
          return a.name.localeCompare(b.name)
        case "activity":
          return b._count.activityDays - a._count.activityDays
        case "modules":
          return b.moduleProgress.length - a.moduleProgress.length
        default:
          return 0
      }
    })

    return result
  }, [students, search, trailFilter, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / perPage)
  // Clamp currentPage to valid range
  const safePage = Math.min(currentPage, Math.max(1, totalPages))

  const paginatedStudents = useMemo(() => {
    const startIndex = (safePage - 1) * perPage
    return filteredStudents.slice(startIndex, startIndex + perPage)
  }, [filteredStudents, safePage, perPage])

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
                placeholder="Поиск по имени, email или TG-нику..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={trailFilter} onValueChange={handleTrailFilterChange}>
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
                <SelectTrigger className="w-[180px]">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Сортировка" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xp">По XP</SelectItem>
                  <SelectItem value="name">По имени</SelectItem>
                  <SelectItem value="activity">По активности</SelectItem>
                  <SelectItem value="modules">По модулям</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(perPage)} onValueChange={handlePerPageChange}>
                <SelectTrigger className="w-[140px]">
                  <List className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="На странице" />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option} на стр.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(search || trailFilter !== "all") && (
            <p className="mt-2 text-sm text-gray-500">
              Найдено: {filteredStudents.length} из {students.length}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {students.length === 0 ? "Пока нет учеников" : "Ничего не найдено"}
            </h3>
            <p className="text-gray-600">
              {students.length === 0
                ? "Ученики появятся после регистрации по инвайту"
                : "Попробуйте изменить параметры поиска"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {paginatedStudents.map((student) => {
            const lastSubmission = student.submissions[0]
            const progressPercent =
              student.maxXP > 0
                ? Math.round((student.totalXP / student.maxXP) * 100)
                : 0

            return (
              <Link key={student.id} href={`/teacher/students/${student.id}`}>
                <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer pt-2">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      {/* Avatar & Info */}
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                            {getInitials(student.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {student.name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{student.email}</span>
                            {student.telegramUsername && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  navigator.clipboard.writeText(student.telegramUsername!).then(() => {
                                    setCopiedTg(student.telegramUsername!)
                                    setTimeout(() => setCopiedTg(null), 2000)
                                  })
                                }}
                                className="text-blue-500 hover:text-blue-700 hover:underline transition-colors shrink-0"
                                title="Копировать TG-ник"
                              >
                                {copiedTg === student.telegramUsername ? "Скопировано" : student.telegramUsername}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {student.enrollments.map((e) => (
                              <Badge
                                key={e.trailId}
                                variant="secondary"
                                className="text-xs px-1.5 py-0"
                              >
                                {e.trail.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-purple-600">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span className="font-bold text-sm">
                              {student._count.activityDays}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">Актив.</p>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center gap-1 text-blue-600">
                            <BookOpen className="h-3.5 w-3.5" />
                            <span className="font-bold text-sm">
                              {student.moduleProgress.length}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{pluralizeRu(student.moduleProgress.length, ["мод.", "мод.", "мод."])}</p>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="font-bold text-sm">{student.stats.approved}</span>
                          </div>
                          <p className="text-xs text-gray-500">Принято</p>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center gap-1 text-orange-600">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="font-bold text-sm">{student.stats.pending}</span>
                          </div>
                          <p className="text-xs text-gray-500">Ожидает</p>
                        </div>
                      </div>
                    </div>

                    {/* XP Progress Bar */}
                    {student.maxXP > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                            <span className="text-xs font-medium text-gray-700">
                              Прогресс XP
                            </span>
                          </div>
                          <span className="text-xs font-bold text-yellow-600">
                            {student.totalXP} / {student.maxXP} XP
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all"
                            style={{
                              width: `${Math.min(progressPercent, 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 text-right">
                          {Math.min(progressPercent, 100)}% завершено
                        </p>
                      </div>
                    )}

                    {/* Last submission */}
                    {lastSubmission && (
                      <div
                        className={`mt-3 pt-3 ${student.maxXP > 0 ? "" : "border-t"}`}
                      >
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                          <FileText className="h-3.5 w-3.5" />
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
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination - hidden when total fits in one page */}
      {filteredStudents.length > perPage && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Показано {(safePage - 1) * perPage + 1}–
            {Math.min(safePage * perPage, filteredStudents.length)} из{" "}
            {filteredStudents.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Назад
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === safePage ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}
            >
              Вперёд
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
