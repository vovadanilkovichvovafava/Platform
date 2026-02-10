"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
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
} from "lucide-react"
import { pluralizeRu } from "@/lib/utils"

const STUDENTS_PER_PAGE = 5

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
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function StudentsSearch({ students, trails }: StudentsSearchProps) {
  const [search, setSearch] = useState("")
  const [trailFilter, setTrailFilter] = useState("all")
  const [sortBy, setSortBy] = useState("xp")
  const [currentPage, setCurrentPage] = useState(1)
  const [copiedTg, setCopiedTg] = useState<string | null>(null)

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
  const totalPages = Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE)
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE
    return filteredStudents.slice(startIndex, startIndex + STUDENTS_PER_PAGE)
  }, [filteredStudents, currentPage])

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleTrailFilterChange = (value: string) => {
    setTrailFilter(value)
    setCurrentPage(1)
  }

  const handleSortChange = (value: string) => {
    setSortBy(value)
    setCurrentPage(1)
  }

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
            <div className="flex gap-2">
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
        <div className="space-y-3">
          {paginatedStudents.map((student) => {
            const lastSubmission = student.submissions[0]
            const progressPercent =
              student.maxXP > 0
                ? Math.round((student.totalXP / student.maxXP) * 100)
                : 0

            return (
              <Link key={student.id} href={`/teacher/students/${student.id}`}>
                <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
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

      {/* Pagination */}
      {filteredStudents.length > STUDENTS_PER_PAGE && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Показано {(currentPage - 1) * STUDENTS_PER_PAGE + 1}–
            {Math.min(currentPage * STUDENTS_PER_PAGE, filteredStudents.length)} из{" "}
            {filteredStudents.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Назад
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
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
