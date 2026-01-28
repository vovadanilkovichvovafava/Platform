"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { useToast } from "@/components/ui/toast"
import {
  ArrowLeft,
  RefreshCw,
  Users,
  BookOpen,
  X,
  AlertCircle,
  Search,
  GripVertical,
  User,
  Target,
} from "lucide-react"

interface Teacher {
  id: string
  name: string
  email: string
}

interface Trail {
  id: string
  title: string
  slug: string
}

interface Assignment {
  id: string
  trailId: string
  teacherId: string
  trail: Trail
  teacher: Teacher
}

export default function TeacherAssignmentsPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [trails, setTrails] = useState<Trail[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { showToast } = useToast()

  // Search/filter states
  const [teacherSearch, setTeacherSearch] = useState("")
  const [trailSearch, setTrailSearch] = useState("")

  // Drag states
  const [draggedTeacher, setDraggedTeacher] = useState<Teacher | null>(null)
  const [dragOverTrail, setDragOverTrail] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError("")

      // Fetch teachers
      const teachersRes = await fetch("/api/admin/users")
      const allUsers = await teachersRes.json()
      setTeachers(allUsers.filter((u: { role: string }) => u.role === "TEACHER"))

      // Fetch trails
      const trailsRes = await fetch("/api/admin/trails")
      const trailsData = await trailsRes.json()
      setTrails(trailsData.map((t: { id: string; title: string; slug: string }) => ({
        id: t.id,
        title: t.title,
        slug: t.slug,
      })))

      // Fetch assignments
      const assignmentsRes = await fetch("/api/admin/trail-teachers")
      const assignmentsData = await assignmentsRes.json()
      setAssignments(assignmentsData)
    } catch {
      setError("Ошибка загрузки данных")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Get assignments for a specific trail
  const getTrailAssignments = (trailId: string) => {
    return assignments
      .filter((a) => a.trailId === trailId)
      .map((a) => a.teacher)
  }

  // Check if teacher is assigned to a trail
  const isTeacherAssignedToTrail = (teacherId: string, trailId: string) => {
    return assignments.some((a) => a.teacherId === teacherId && a.trailId === trailId)
  }

  // Drag handlers
  const handleDragStart = (teacher: Teacher) => {
    setDraggedTeacher(teacher)
  }

  const handleDragEnd = () => {
    setDraggedTeacher(null)
    setDragOverTrail(null)
  }

  const handleDragOver = (e: React.DragEvent, trailId: string) => {
    e.preventDefault()
    setDragOverTrail(trailId)
  }

  const handleDragLeave = () => {
    setDragOverTrail(null)
  }

  const handleDrop = async (e: React.DragEvent, trailId: string) => {
    e.preventDefault()
    setDragOverTrail(null)

    if (!draggedTeacher) return

    // Check if already assigned
    if (isTeacherAssignedToTrail(draggedTeacher.id, trailId)) {
      showToast("Учитель уже назначен на этот trail", "warning")
      setDraggedTeacher(null)
      return
    }

    try {
      setAssigning(true)
      const res = await fetch("/api/admin/trail-teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: draggedTeacher.id,
          trailId: trailId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to assign")
      }

      showToast(`${draggedTeacher.name} назначен на trail`, "success")
      fetchData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Ошибка назначения", "error")
    } finally {
      setAssigning(false)
      setDraggedTeacher(null)
    }
  }

  const removeAssignment = async (trailId: string, teacherId: string, teacherName: string) => {
    try {
      const res = await fetch(
        `/api/admin/trail-teachers?trailId=${trailId}&teacherId=${teacherId}`,
        { method: "DELETE" }
      )

      if (!res.ok) throw new Error("Failed to remove")
      showToast(`${teacherName} снят с trail`, "success")
      fetchData()
    } catch {
      showToast("Ошибка удаления", "error")
    }
  }

  // Filtered lists
  const filteredTeachers = teachers.filter((t) =>
    t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.email.toLowerCase().includes(teacherSearch.toLowerCase())
  )

  const filteredTrails = trails.filter((t) =>
    t.title.toLowerCase().includes(trailSearch.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Breadcrumbs
            items={[
              { label: "Админ", href: "/admin/invites" },
              { label: "Назначение учителей" },
            ]}
            className="mb-4"
          />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Назначение учителей
              </h1>
              <p className="text-gray-600 mt-1">
                Перетащите учителя на trail для назначения
              </p>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
            <button onClick={() => setError("")} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Drag indicator */}
        {draggedTeacher && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg flex items-center gap-2">
            <GripVertical className="h-4 w-4" />
            Перетащите {draggedTeacher.name} на trail
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Teachers */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                  Учителя
                  <Badge variant="secondary" className="ml-2">
                    {teachers.length}
                  </Badge>
                </CardTitle>
                <div className="mt-3 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Поиск по имени или email..."
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="max-h-[600px] overflow-y-auto">
                {filteredTeachers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    {teachers.length === 0 ? (
                      <>
                        <p>Нет учителей</p>
                        <p className="text-sm mt-2">
                          Назначьте роль TEACHER пользователям в{" "}
                          <Link href="/admin/users" className="text-blue-600 hover:underline">
                            Пользователях
                          </Link>
                        </p>
                      </>
                    ) : (
                      <p>Учителя не найдены</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTeachers.map((teacher) => {
                      const assignedCount = assignments.filter(
                        (a) => a.teacherId === teacher.id
                      ).length

                      return (
                        <div
                          key={teacher.id}
                          draggable
                          onDragStart={() => handleDragStart(teacher)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-3 p-3 rounded-lg border bg-white cursor-grab active:cursor-grabbing transition-all ${
                            draggedTeacher?.id === teacher.id
                              ? "opacity-50 border-blue-400 bg-blue-50"
                              : "hover:border-blue-300 hover:shadow-sm"
                          }`}
                        >
                          <GripVertical className="h-4 w-4 text-gray-400 shrink-0" />
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {teacher.name}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {teacher.email}
                            </p>
                          </div>
                          {assignedCount > 0 && (
                            <Badge variant="secondary" className="shrink-0">
                              {assignedCount} trails
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: Trails */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-green-600" />
                  Trails
                  <Badge variant="secondary" className="ml-2">
                    {trails.length}
                  </Badge>
                </CardTitle>
                <div className="mt-3 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Поиск по названию..."
                    value={trailSearch}
                    onChange={(e) => setTrailSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="max-h-[600px] overflow-y-auto">
                {filteredTrails.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Trails не найдены</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTrails.map((trail) => {
                      const trailTeachers = getTrailAssignments(trail.id)
                      const isDragOver = dragOverTrail === trail.id

                      return (
                        <div
                          key={trail.id}
                          onDragOver={(e) => handleDragOver(e, trail.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, trail.id)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            isDragOver
                              ? "border-blue-500 bg-blue-50 border-dashed"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-5 w-5 text-green-600" />
                              <h3 className="font-medium text-gray-900">
                                {trail.title}
                              </h3>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {trailTeachers.length} учителей
                            </Badge>
                          </div>

                          {/* Assigned teachers */}
                          {trailTeachers.length === 0 ? (
                            <div className={`text-center py-4 rounded-lg border border-dashed ${
                              isDragOver ? "border-blue-400 bg-blue-100" : "border-gray-300"
                            }`}>
                              <p className="text-sm text-gray-500">
                                {isDragOver ? "Отпустите для назначения" : "Нет назначенных учителей"}
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {trailTeachers.map((teacher) => (
                                <div
                                  key={teacher.id}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full group"
                                >
                                  <User className="h-3 w-3 text-gray-500" />
                                  <span className="text-sm">{teacher.name}</span>
                                  <button
                                    onClick={() => removeAssignment(trail.id, teacher.id, teacher.name)}
                                    className="p-0.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
                                    title="Снять назначение"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Drop zone indicator when dragging */}
                          {draggedTeacher && !isDragOver && (
                            <div className="mt-2 text-center py-2 text-xs text-gray-400">
                              Перетащите сюда для назначения
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info panel */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Как работает назначение:</p>
              <ul className="list-disc ml-4 space-y-1 text-blue-700">
                <li>Перетащите учителя из левой колонки на trail справа</li>
                <li>Учитель будет видеть только работы учеников с назначенных trails</li>
                <li>Если у учителя нет назначений — он видит все работы</li>
                <li>Нажмите × рядом с именем учителя, чтобы снять назначение</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
