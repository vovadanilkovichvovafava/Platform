"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  RefreshCw,
  Users,
  BookOpen,
  Plus,
  X,
  Check,
  AlertCircle,
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

  const [selectedTeacher, setSelectedTeacher] = useState<string>("")
  const [selectedTrail, setSelectedTrail] = useState<string>("")
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

  const assignTeacher = async () => {
    if (!selectedTeacher || !selectedTrail) return

    try {
      setAssigning(true)
      const res = await fetch("/api/admin/trail-teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: selectedTeacher,
          trailId: selectedTrail,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to assign")
      }

      setSelectedTeacher("")
      setSelectedTrail("")
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка назначения")
    } finally {
      setAssigning(false)
    }
  }

  const removeAssignment = async (trailId: string, teacherId: string) => {
    try {
      const res = await fetch(
        `/api/admin/trail-teachers?trailId=${trailId}&teacherId=${teacherId}`,
        { method: "DELETE" }
      )

      if (!res.ok) throw new Error("Failed to remove")
      fetchData()
    } catch {
      setError("Ошибка удаления")
    }
  }

  // Group assignments by teacher
  const assignmentsByTeacher = teachers.map((teacher) => ({
    teacher,
    trails: assignments
      .filter((a) => a.teacherId === teacher.id)
      .map((a) => a.trail),
  }))

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
          <Link
            href="/admin/content"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            К контенту
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Назначение учителей
              </h1>
              <p className="text-gray-600 mt-1">
                Назначайте учителей на trails для проверки работ
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

        {/* Add Assignment */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Назначить учителя на Trail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Учитель
                </label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Выберите учителя...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Trail
                </label>
                <select
                  value={selectedTrail}
                  onChange={(e) => setSelectedTrail(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Выберите trail...</option>
                  {trails.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={assignTeacher}
                  disabled={!selectedTeacher || !selectedTrail || assigning}
                >
                  {assigning ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Назначить
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teachers and their trails */}
        <div className="space-y-6">
          {teachers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Нет учителей</p>
                <p className="text-sm mt-2">
                  Сначала назначьте роль TEACHER пользователям в разделе{" "}
                  <Link href="/admin/users" className="text-blue-600 hover:underline">
                    Пользователи
                  </Link>
                </p>
              </CardContent>
            </Card>
          ) : (
            assignmentsByTeacher.map(({ teacher, trails: assignedTrails }) => (
              <Card key={teacher.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{teacher.name}</CardTitle>
                        <p className="text-sm text-gray-500">{teacher.email}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {assignedTrails.length} trails
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {assignedTrails.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4 text-center">
                      Нет назначенных trails — учитель видит все работы
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {assignedTrails.map((trail) => (
                        <div
                          key={trail.id}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"
                        >
                          <BookOpen className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{trail.title}</span>
                          <button
                            onClick={() => removeAssignment(trail.id, teacher.id)}
                            className="ml-1 p-1 hover:bg-gray-200 rounded"
                          >
                            <X className="h-3 w-3 text-gray-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
