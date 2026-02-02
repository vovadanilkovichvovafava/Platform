"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
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
} from "lucide-react"
import { pluralizeRu } from "@/lib/utils"

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

  const filteredStudents = useMemo(() => {
    let result = students.filter((student) => {
      const matchesSearch =
        !search ||
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.email.toLowerCase().includes(search.toLowerCase())
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по имени или email..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={trailFilter} onValueChange={setTrailFilter}>
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
              <Select value={sortBy} onValueChange={setSortBy}>
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
          {search && (
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
        <div className="space-y-4">
          {filteredStudents.map((student) => {
            const lastSubmission = student.submissions[0]
            const progressPercent =
              student.maxXP > 0
                ? Math.round((student.totalXP / student.maxXP) * 100)
                : 0

            return (
              <Link key={student.id} href={`/teacher/students/${student.id}`}>
                <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
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
                          <div className="flex items-center gap-1 text-purple-600">
                            <CalendarDays className="h-4 w-4" />
                            <span className="font-bold">
                              {student._count.activityDays}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">Актив. дней</p>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center gap-1 text-blue-600">
                            <BookOpen className="h-4 w-4" />
                            <span className="font-bold">
                              {student.moduleProgress.length}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{pluralizeRu(student.moduleProgress.length, ["модуль", "модуля", "модулей"])}</p>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-bold">{student.stats.approved}</span>
                          </div>
                          <p className="text-xs text-gray-500">Принято</p>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center gap-1 text-orange-600">
                            <Clock className="h-4 w-4" />
                            <span className="font-bold">{student.stats.pending}</span>
                          </div>
                          <p className="text-xs text-gray-500">Ожидает</p>
                        </div>
                      </div>
                    </div>

                    {/* XP Progress Bar */}
                    {student.maxXP > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium text-gray-700">
                              Прогресс XP
                            </span>
                          </div>
                          <span className="text-sm font-bold text-yellow-600">
                            {student.totalXP} / {student.maxXP} XP
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all"
                            style={{
                              width: `${Math.min(progressPercent, 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-right">
                          {progressPercent}% завершено
                        </p>
                      </div>
                    )}

                    {/* Last submission */}
                    {lastSubmission && (
                      <div
                        className={`mt-4 pt-4 ${student.maxXP > 0 ? "" : "border-t"}`}
                      >
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
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
