"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import {
  RefreshCw,
  Users,
  X,
  Check,
  AlertCircle,
  Search,
  Plus,
  Undo2,
  LayoutGrid,
  List,
  Mail,
  MessageCircle,
  User,
  ChevronDown,
} from "lucide-react"
import { HowItWorks } from "@/components/ui/how-it-works"
import { adminPageLegends } from "@/lib/admin-help-texts"

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface Student {
  id: string
  name: string
  email: string
  telegramUsername: string | null
}

interface Trail {
  id: string
  title: string
  slug: string
  isRestricted: boolean
  isPublished: boolean
}

interface Access {
  id: string
  studentId: string
  trailId: string
  student: Student
  trail: { id: string; title: string; slug: string }
}

interface PendingChange {
  type: "add" | "remove"
  studentId: string
  trailId: string
  trailTitle: string
}

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────

const STUDENTS_PER_PAGE = 24

interface StudentAccessTabProps {
  initialStudentId?: string
}

export function StudentAccessTab({ initialStudentId }: StudentAccessTabProps) {
  const { showToast } = useToast()

  const [students, setStudents] = useState<Student[]>([])
  const [trails, setTrails] = useState<Trail[]>([])
  const [access, setAccess] = useState<Access[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Search
  const [searchQuery, setSearchQuery] = useState("")

  // Pagination
  const [studentPage, setStudentPage] = useState(1)

  // Pending changes (save/cancel pattern)
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [saving, setSaving] = useState(false)

  // Trail assignment dropdown
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)
  const [trailDropdownSearch, setTrailDropdownSearch] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ── Fetch data ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      const [usersRes, trailsRes, accessRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/trails"),
        fetch("/api/admin/student-access"),
      ])

      const allUsers = await usersRes.json()
      setStudents(
        allUsers
          .filter((u: { role: string }) => u.role === "STUDENT")
          .map((u: { id: string; name: string; email: string; telegramUsername?: string | null }) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            telegramUsername: u.telegramUsername ?? null,
          }))
      )

      const trailsData = await trailsRes.json()
      setTrails(
        trailsData.map((t: { id: string; title: string; slug: string; isRestricted: boolean; isPublished: boolean }) => ({
          id: t.id,
          title: t.title,
          slug: t.slug,
          isRestricted: t.isRestricted,
          isPublished: t.isPublished,
        }))
      )

      const accessData = await accessRes.json()
      setAccess(accessData)
    } catch {
      setError("Ошибка загрузки данных")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-focus on student if initialStudentId provided
  useEffect(() => {
    if (initialStudentId && students.length > 0) {
      const student = students.find((s) => s.id === initialStudentId)
      if (student) {
        setSearchQuery(student.name)
      }
    }
  }, [initialStudentId, students])

  // ── Click outside handler for dropdown ──────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setActiveDropdownId(null)
        setTrailDropdownSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // ── Assignable trails (restricted + published) ─────────────────────────

  const assignableTrails = trails.filter(
    (t) => t.isRestricted && t.isPublished
  )

  // ── Compute student trail state with pending changes ───────────────────

  const getStudentTrailState = useCallback(
    (studentId: string) => {
      const currentTrailIds = access
        .filter((a) => a.studentId === studentId)
        .map((a) => a.trailId)

      const pendingAdds = pendingChanges.filter(
        (p) => p.studentId === studentId && p.type === "add"
      )
      const pendingRemoveIds = pendingChanges
        .filter((p) => p.studentId === studentId && p.type === "remove")
        .map((p) => p.trailId)

      return {
        active: currentTrailIds.filter((id) => !pendingRemoveIds.includes(id)),
        pendingAdd: pendingAdds,
        pendingRemove: pendingRemoveIds,
      }
    },
    [access, pendingChanges]
  )

  // ── Pending changes actions ────────────────────────────────────────────

  const addTrailToStudent = (studentId: string, trail: Trail) => {
    // Check if already in pending adds
    const exists = pendingChanges.some(
      (p) =>
        p.studentId === studentId &&
        p.trailId === trail.id &&
        p.type === "add"
    )
    if (exists) return

    // Check if removing a pending remove (undo remove)
    const removeIndex = pendingChanges.findIndex(
      (p) =>
        p.studentId === studentId &&
        p.trailId === trail.id &&
        p.type === "remove"
    )
    if (removeIndex !== -1) {
      setPendingChanges((prev) => prev.filter((_, i) => i !== removeIndex))
      return
    }

    setPendingChanges((prev) => [
      ...prev,
      {
        type: "add",
        studentId,
        trailId: trail.id,
        trailTitle: trail.title,
      },
    ])
  }

  const removeTrailFromStudent = (studentId: string, trailId: string) => {
    // Check if it's a pending add — just remove it
    const addIndex = pendingChanges.findIndex(
      (p) =>
        p.studentId === studentId &&
        p.trailId === trailId &&
        p.type === "add"
    )
    if (addIndex !== -1) {
      setPendingChanges((prev) => prev.filter((_, i) => i !== addIndex))
      return
    }

    // Check if already pending remove
    const alreadyPending = pendingChanges.some(
      (p) =>
        p.studentId === studentId &&
        p.trailId === trailId &&
        p.type === "remove"
    )
    if (alreadyPending) return

    const trail = trails.find((t) => t.id === trailId)
    const trailTitle =
      trail?.title ||
      access.find((a) => a.trailId === trailId)?.trail.title ||
      trailId

    setPendingChanges((prev) => [
      ...prev,
      { type: "remove", studentId, trailId, trailTitle },
    ])
  }

  const undoRemove = (studentId: string, trailId: string) => {
    setPendingChanges((prev) =>
      prev.filter(
        (p) =>
          !(
            p.studentId === studentId &&
            p.trailId === trailId &&
            p.type === "remove"
          )
      )
    )
  }

  const cancelAllChanges = () => {
    setPendingChanges([])
  }

  const saveAllChanges = async () => {
    if (pendingChanges.length === 0) return

    try {
      setSaving(true)
      let successCount = 0
      let errorCount = 0

      for (const change of pendingChanges) {
        try {
          if (change.type === "add") {
            const res = await fetch("/api/admin/student-access", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                studentId: change.studentId,
                trailId: change.trailId,
              }),
            })
            if (!res.ok) {
              const data = await res.json()
              throw new Error(data.error || "Ошибка")
            }
          } else {
            const res = await fetch(
              `/api/admin/student-access?studentId=${change.studentId}&trailId=${change.trailId}`,
              { method: "DELETE" }
            )
            if (!res.ok) throw new Error("Ошибка удаления")
          }
          successCount++
        } catch {
          errorCount++
        }
      }

      setPendingChanges([])
      await fetchData()

      if (errorCount === 0) {
        showToast(`Сохранено: ${successCount} изменений`, "success")
      } else {
        showToast(
          `Сохранено: ${successCount}, ошибок: ${errorCount}`,
          "warning"
        )
      }
    } catch {
      showToast("Ошибка сохранения", "error")
    } finally {
      setSaving(false)
    }
  }

  // ── Filtered & paginated students ─────────────────────────────────────

  const filteredStudents = searchQuery
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.telegramUsername &&
            s.telegramUsername
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      )
    : students

  const paginatedStudents = filteredStudents.slice(
    0,
    studentPage * STUDENTS_PER_PAGE
  )
  const hasMoreStudents = filteredStudents.length > paginatedStudents.length

  // ── Get available trails for a student dropdown ────────────────────────

  const getAvailableTrails = (studentId: string) => {
    const state = getStudentTrailState(studentId)
    const assignedIds = [
      ...state.active,
      ...state.pendingAdd.map((p) => p.trailId),
    ]

    return assignableTrails
      .filter((t) => !assignedIds.includes(t.id))
      .filter((t) =>
        trailDropdownSearch
          ? t.title.toLowerCase().includes(trailDropdownSearch.toLowerCase())
          : true
      )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
          <button onClick={() => setError("")} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* How it works */}
      <HowItWorks legend={adminPageLegends.studentAccess} className="mb-6" />

      {/* ── Header: search, view toggle, refresh ───────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setStudentPage(1)
            }}
            placeholder="Поиск по имени, email или Telegram..."
            className="w-full p-2 pl-10 border rounded-lg text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("")
                setStudentPage(1)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${
                viewMode === "grid"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
              title="Карточки"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${
                viewMode === "list"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
              title="Список"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      {/* ── Pending changes bar ─────────────────────────────────────── */}
      {pendingChanges.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">
              {pendingChanges.length} несохранённых{" "}
              {pendingChanges.length === 1
                ? "изменение"
                : pendingChanges.length < 5
                  ? "изменения"
                  : "изменений"}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cancelAllChanges}
              disabled={saving}
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Отменить
            </Button>
            <Button size="sm" onClick={saveAllChanges} disabled={saving}>
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Сохранить
            </Button>
          </div>
        </div>
      )}

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
        <span>
          Студентов: {filteredStudents.length}
          {searchQuery && ` из ${students.length}`}
        </span>
        <span>Ограниченных трейлов: {assignableTrails.length}</span>
      </div>

      {/* ── Student cards ───────────────────────────────────────────── */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>{searchQuery ? "Студенты не найдены" : "Нет студентов"}</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* ── Grid view ─────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedStudents.map((student) => {
            const trailState = getStudentTrailState(student.id)

            return (
              <Card key={student.id} className="relative">
                <CardContent className="p-4">
                  {/* Student info */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-900 truncate">
                        {student.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{student.email}</span>
                    </div>
                    {student.telegramUsername && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MessageCircle className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {student.telegramUsername}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Trail tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">
                    {/* Active trails */}
                    {trailState.active.map((trailId) => {
                      const trailInfo =
                        access.find(
                          (a) =>
                            a.studentId === student.id &&
                            a.trailId === trailId
                        )?.trail ||
                        trails.find((t) => t.id === trailId)

                      return (
                        <Badge
                          key={trailId}
                          variant="secondary"
                          className="text-xs gap-1 pr-1"
                        >
                          {trailInfo?.title || trailId}
                          <button
                            onClick={() =>
                              removeTrailFromStudent(student.id, trailId)
                            }
                            className="ml-0.5 p-0.5 rounded hover:bg-gray-300/50"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    })}

                    {/* Pending adds */}
                    {trailState.pendingAdd.map((change) => (
                      <Badge
                        key={`add-${change.trailId}`}
                        variant="outline"
                        className="text-xs gap-1 pr-1 bg-green-50 border-green-300 border-dashed text-green-700"
                      >
                        + {change.trailTitle}
                        <button
                          onClick={() =>
                            removeTrailFromStudent(
                              student.id,
                              change.trailId
                            )
                          }
                          className="ml-0.5 p-0.5 rounded hover:bg-green-200/50"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}

                    {/* Pending removes */}
                    {trailState.pendingRemove.map((trailId) => {
                      const trailInfo =
                        access.find(
                          (a) =>
                            a.studentId === student.id &&
                            a.trailId === trailId
                        )?.trail ||
                        trails.find((t) => t.id === trailId)

                      return (
                        <Badge
                          key={`rm-${trailId}`}
                          variant="outline"
                          className="text-xs gap-1 pr-1 opacity-60 line-through border-red-300 text-red-600"
                        >
                          {trailInfo?.title || trailId}
                          <button
                            onClick={() =>
                              undoRemove(student.id, trailId)
                            }
                            className="ml-0.5 p-0.5 rounded hover:bg-red-200/50 no-underline"
                            title="Отменить удаление"
                          >
                            <Undo2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>

                  {/* Assign trail dropdown */}
                  {assignableTrails.length > 0 && (
                    <div className="relative" ref={activeDropdownId === student.id ? dropdownRef : undefined}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveDropdownId(
                            activeDropdownId === student.id
                              ? null
                              : student.id
                          )
                          setTrailDropdownSearch("")
                        }}
                        className="w-full justify-between text-xs"
                      >
                        <span className="flex items-center gap-1">
                          <Plus className="h-3 w-3" />
                          Назначить трейл
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>

                      {activeDropdownId === student.id && (
                        <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                          {/* Search in dropdown */}
                          <div className="p-2 border-b sticky top-0 bg-white">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                              <input
                                type="text"
                                value={trailDropdownSearch}
                                onChange={(e) =>
                                  setTrailDropdownSearch(e.target.value)
                                }
                                placeholder="Поиск трейла..."
                                className="w-full py-1 pl-7 pr-2 text-xs border rounded"
                                autoFocus
                              />
                            </div>
                          </div>

                          {(() => {
                            const available = getAvailableTrails(student.id)
                            return available.length === 0 ? (
                              <div className="p-3 text-gray-500 text-xs text-center">
                                {trailDropdownSearch
                                  ? "Не найдено"
                                  : "Все трейлы уже назначены"}
                              </div>
                            ) : (
                              available.map((trail) => (
                                <button
                                  key={trail.id}
                                  type="button"
                                  onClick={() =>
                                    addTrailToStudent(student.id, trail)
                                  }
                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                                >
                                  <div className="font-medium text-xs">
                                    {trail.title}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    /{trail.slug}
                                  </div>
                                </button>
                              ))
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* ── List view ──────────────────────────────────────────────── */
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {paginatedStudents.map((student) => {
                const trailState = getStudentTrailState(student.id)

                return (
                  <div
                    key={student.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-gray-50"
                  >
                    {/* Student info */}
                    <div className="min-w-0 sm:w-64 shrink-0">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="font-medium text-sm text-gray-900 truncate">
                          {student.name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 ml-6 truncate">
                        {student.email}
                        {student.telegramUsername && (
                          <span className="ml-2">{student.telegramUsername}</span>
                        )}
                      </div>
                    </div>

                    {/* Trail tags */}
                    <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                      {trailState.active.map((trailId) => {
                        const trailInfo =
                          access.find(
                            (a) =>
                              a.studentId === student.id &&
                              a.trailId === trailId
                          )?.trail ||
                          trails.find((t) => t.id === trailId)

                        return (
                          <Badge
                            key={trailId}
                            variant="secondary"
                            className="text-xs gap-1 pr-1"
                          >
                            {trailInfo?.title || trailId}
                            <button
                              onClick={() =>
                                removeTrailFromStudent(student.id, trailId)
                              }
                              className="ml-0.5 p-0.5 rounded hover:bg-gray-300/50"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )
                      })}

                      {trailState.pendingAdd.map((change) => (
                        <Badge
                          key={`add-${change.trailId}`}
                          variant="outline"
                          className="text-xs gap-1 pr-1 bg-green-50 border-green-300 border-dashed text-green-700"
                        >
                          + {change.trailTitle}
                          <button
                            onClick={() =>
                              removeTrailFromStudent(
                                student.id,
                                change.trailId
                              )
                            }
                            className="ml-0.5 p-0.5 rounded hover:bg-green-200/50"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}

                      {trailState.pendingRemove.map((trailId) => {
                        const trailInfo =
                          access.find(
                            (a) =>
                              a.studentId === student.id &&
                              a.trailId === trailId
                          )?.trail ||
                          trails.find((t) => t.id === trailId)

                        return (
                          <Badge
                            key={`rm-${trailId}`}
                            variant="outline"
                            className="text-xs gap-1 pr-1 opacity-60 line-through border-red-300 text-red-600"
                          >
                            {trailInfo?.title || trailId}
                            <button
                              onClick={() =>
                                undoRemove(student.id, trailId)
                              }
                              className="ml-0.5 p-0.5 rounded hover:bg-red-200/50 no-underline"
                              title="Отменить удаление"
                            >
                              <Undo2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        )
                      })}
                    </div>

                    {/* Assign button */}
                    {assignableTrails.length > 0 && (
                      <div className="relative shrink-0" ref={activeDropdownId === student.id ? dropdownRef : undefined}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveDropdownId(
                              activeDropdownId === student.id
                                ? null
                                : student.id
                            )
                            setTrailDropdownSearch("")
                          }}
                          className="text-xs whitespace-nowrap"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Назначить
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>

                        {activeDropdownId === student.id && (
                          <div className="absolute z-20 right-0 w-64 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                            <div className="p-2 border-b sticky top-0 bg-white">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                                <input
                                  type="text"
                                  value={trailDropdownSearch}
                                  onChange={(e) =>
                                    setTrailDropdownSearch(e.target.value)
                                  }
                                  placeholder="Поиск трейла..."
                                  className="w-full py-1 pl-7 pr-2 text-xs border rounded"
                                  autoFocus
                                />
                              </div>
                            </div>

                            {(() => {
                              const available = getAvailableTrails(student.id)
                              return available.length === 0 ? (
                                <div className="p-3 text-gray-500 text-xs text-center">
                                  {trailDropdownSearch
                                    ? "Не найдено"
                                    : "Все трейлы уже назначены"}
                                </div>
                              ) : (
                                available.map((trail) => (
                                  <button
                                    key={trail.id}
                                    type="button"
                                    onClick={() =>
                                      addTrailToStudent(student.id, trail)
                                    }
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                                  >
                                    <div className="font-medium text-xs">
                                      {trail.title}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      /{trail.slug}
                                    </div>
                                  </button>
                                ))
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Load more ──────────────────────────────────────────────── */}
      {hasMoreStudents && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => setStudentPage((p) => p + 1)}
          >
            Показать ещё ({filteredStudents.length - paginatedStudents.length})
          </Button>
        </div>
      )}
    </div>
  )
}
