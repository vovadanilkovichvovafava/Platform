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
  Lock,
  Unlock,
  Plus,
  X,
  Check,
  AlertCircle,
  BookOpen,
} from "lucide-react"

interface Student {
  id: string
  name: string
  email: string
}

interface Trail {
  id: string
  title: string
  slug: string
  isRestricted: boolean
}

interface Access {
  id: string
  studentId: string
  trailId: string
  student: Student
  trail: Trail
}

export default function StudentAccessPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [trails, setTrails] = useState<Trail[]>([])
  const [access, setAccess] = useState<Access[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [selectedStudent, setSelectedStudent] = useState<string>("")
  const [selectedTrail, setSelectedTrail] = useState<string>("")
  const [assigning, setAssigning] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError("")

      // Fetch students
      const usersRes = await fetch("/api/admin/users")
      const allUsers = await usersRes.json()
      setStudents(allUsers.filter((u: { role: string }) => u.role === "STUDENT"))

      // Fetch trails
      const trailsRes = await fetch("/api/admin/trails")
      const trailsData = await trailsRes.json()
      setTrails(trailsData)

      // Fetch access entries
      const accessRes = await fetch("/api/admin/student-access")
      const accessData = await accessRes.json()
      setAccess(accessData)
    } catch {
      setError("Ошибка загрузки данных")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleRestriction = async (trailId: string, isRestricted: boolean) => {
    try {
      const res = await fetch("/api/admin/student-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trailId, isRestricted: !isRestricted }),
      })

      if (!res.ok) throw new Error("Failed to toggle")
      fetchData()
    } catch {
      setError("Ошибка изменения доступа")
    }
  }

  const grantAccess = async () => {
    if (!selectedStudent || !selectedTrail) return

    try {
      setAssigning(true)
      const res = await fetch("/api/admin/student-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent,
          trailId: selectedTrail,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to grant access")
      }

      setSelectedStudent("")
      setSelectedTrail("")
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка выдачи доступа")
    } finally {
      setAssigning(false)
    }
  }

  const revokeAccess = async (studentId: string, trailId: string) => {
    try {
      const res = await fetch(
        `/api/admin/student-access?studentId=${studentId}&trailId=${trailId}`,
        { method: "DELETE" }
      )

      if (!res.ok) throw new Error("Failed to revoke")
      fetchData()
    } catch {
      setError("Ошибка удаления доступа")
    }
  }

  // Group access by trail
  const restrictedTrails = trails.filter((t) => t.isRestricted)
  const publicTrails = trails.filter((t) => !t.isRestricted)

  const accessByTrail = restrictedTrails.map((trail) => ({
    trail,
    students: access
      .filter((a) => a.trailId === trail.id)
      .map((a) => a.student),
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
                Доступ студентов к Trails
              </h1>
              <p className="text-gray-600 mt-1">
                Управляйте видимостью trails для определённых студентов
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

        {/* Trail Restriction Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Статус Trails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trails.map((trail) => (
                <div
                  key={trail.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {trail.isRestricted ? (
                      <Lock className="h-5 w-5 text-orange-500" />
                    ) : (
                      <Unlock className="h-5 w-5 text-green-500" />
                    )}
                    <span className="font-medium">{trail.title}</span>
                    <Badge variant={trail.isRestricted ? "destructive" : "secondary"}>
                      {trail.isRestricted ? "Ограниченный" : "Публичный"}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleRestriction(trail.id, trail.isRestricted)}
                  >
                    {trail.isRestricted ? (
                      <>
                        <Unlock className="h-4 w-4 mr-2" />
                        Сделать публичным
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Ограничить доступ
                      </>
                    )}
                  </Button>
                </div>
              ))}
              {trails.length === 0 && (
                <p className="text-gray-500 text-center py-4">Нет trails</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Access for Restricted Trails */}
        {restrictedTrails.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Выдать доступ к ограниченному Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Студент
                  </label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">Выберите студента...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Trail (ограниченный)
                  </label>
                  <select
                    value={selectedTrail}
                    onChange={(e) => setSelectedTrail(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">Выберите trail...</option>
                    {restrictedTrails.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={grantAccess}
                    disabled={!selectedStudent || !selectedTrail || assigning}
                  >
                    {assigning ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Выдать доступ
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Access List by Trail */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Ограниченные Trails и доступ студентов
          </h2>

          {restrictedTrails.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Lock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Нет ограниченных trails</p>
                <p className="text-sm mt-2">
                  Ограничьте доступ к trail выше, чтобы управлять видимостью
                </p>
              </CardContent>
            </Card>
          ) : (
            accessByTrail.map(({ trail, students: trailStudents }) => (
              <Card key={trail.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Lock className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{trail.title}</CardTitle>
                        <p className="text-sm text-gray-500">/{trail.slug}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {trailStudents.length} студентов
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {trailStudents.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4 text-center">
                      Нет студентов с доступом — trail никому не виден
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {trailStudents.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"
                        >
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            {student.name}
                            <span className="text-gray-400 ml-1">({student.email})</span>
                          </span>
                          <button
                            onClick={() => revokeAccess(student.id, trail.id)}
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
