"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/toast"
import {
  RefreshCw,
  Users,
  Lock,
  Unlock,
  Plus,
  X,
  Check,
  AlertCircle,
  BookOpen,
  Search,
  Eye,
  EyeOff,
  KeyRound,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react"
import { AdminTrailPasswordModal } from "@/components/admin-trail-password-modal"

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

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
  isPublished: boolean
  isPasswordProtected: boolean
  passwordHint: string | null
  createdById: string | null
}

interface Access {
  id: string
  studentId: string
  trailId: string
  student: Student
  trail: { id: string; title: string; slug: string }
}

// ────────────────────────────────────────────────────────────────────────────
// Password Modal
// ────────────────────────────────────────────────────────────────────────────

function TrailPasswordModal({
  trail,
  onClose,
  onSaved,
}: {
  trail: Trail
  onClose: () => void
  onSaved: () => void
}) {
  const { showToast } = useToast()
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [hint, setHint] = useState(trail.passwordHint || "")
  const [showPw, setShowPw] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const isUpdate = trail.isPasswordProtected

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const handleSave = async () => {
    if (!password.trim()) {
      showToast("Введите пароль", "error")
      return
    }
    if (password.length < 4) {
      showToast("Пароль должен быть минимум 4 символа", "error")
      return
    }
    if (password !== passwordConfirm) {
      showToast("Пароли не совпадают", "error")
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/admin/trails/${trail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPasswordProtected: true,
          password,
          passwordHint: hint.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Ошибка сохранения")
      }

      showToast(isUpdate ? "Пароль обновлён" : "Пароль установлен", "success")
      onSaved()
      onClose()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Ошибка", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/trails/${trail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removePassword: true }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Ошибка удаления пароля")
      }

      showToast("Защита паролем снята", "success")
      onSaved()
      onClose()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Ошибка", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-5 w-5 text-amber-600" />
              {isUpdate ? "Управление паролем" : "Установить пароль"}
            </CardTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500">{trail.title}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="trailPw">
              {isUpdate ? "Новый пароль" : "Пароль *"}
            </Label>
            <div className="relative">
              <Input
                id="trailPw"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  isUpdate ? "Введите новый пароль..." : "Введите пароль..."
                }
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="trailPwConfirm">Подтвердите пароль *</Label>
            <div className="relative">
              <Input
                id="trailPwConfirm"
                type={showPwConfirm ? "text" : "password"}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Повторите пароль..."
                className={`pr-10 ${
                  password &&
                  passwordConfirm &&
                  password !== passwordConfirm
                    ? "border-red-500"
                    : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPwConfirm(!showPwConfirm)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {password &&
              passwordConfirm &&
              password !== passwordConfirm && (
                <p className="text-xs text-red-600 mt-1">
                  Пароли не совпадают
                </p>
              )}
          </div>

          <div>
            <Label htmlFor="trailPwHint">Подсказка (опционально)</Label>
            <div className="relative">
              <KeyRound className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
              <Input
                id="trailPwHint"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="Подсказка для студентов..."
                className="pl-8"
              />
            </div>
          </div>

          <p className="text-xs text-amber-700">
            Доступ получают: создатель, пользователи с паролем, привязанные
            студенты.
          </p>

          <div className="flex justify-between pt-2 border-t">
            {isUpdate && (
              <Button
                variant="outline"
                onClick={handleRemove}
                disabled={loading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Снять пароль
              </Button>
            )}
            <div className={`flex gap-2 ${!isUpdate ? "ml-auto" : ""}`}>
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Отмена
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {isUpdate ? "Обновить" : "Установить"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────

const STUDENTS_PER_PAGE = 20

export function StudentAccessTab() {
  const { data: session } = useSession()
  const { showToast } = useToast()

  const [students, setStudents] = useState<Student[]>([])
  const [trails, setTrails] = useState<Trail[]>([])
  const [access, setAccess] = useState<Access[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Trail status update loading
  const [updatingTrail, setUpdatingTrail] = useState<string | null>(null)

  // Password modal
  const [passwordModalTrail, setPasswordModalTrail] = useState<Trail | null>(
    null
  )

  // Student access form
  const [selectedStudent, setSelectedStudent] = useState("")
  const [selectedTrail, setSelectedTrail] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [validationError, setValidationError] = useState("")

  // Student dropdown
  const [studentSearch, setStudentSearch] = useState("")
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const [studentPage, setStudentPage] = useState(1)
  const studentSearchRef = useRef<HTMLDivElement>(null)

  // Trail dropdown
  const [trailSearch, setTrailSearch] = useState("")
  const [showTrailDropdown, setShowTrailDropdown] = useState(false)
  const trailSearchRef = useRef<HTMLDivElement>(null)

  // Expanded trail sections
  const [expandedTrails, setExpandedTrails] = useState<Set<string>>(new Set())

  // Password verification for expanding locked trails
  const [verifiedTrails, setVerifiedTrails] = useState<Set<string>>(new Set())
  const [verifyPasswordTrail, setVerifyPasswordTrail] = useState<Trail | null>(null)
  const [showVerifyPasswordModal, setShowVerifyPasswordModal] = useState(false)
  const [verifyPasswordIsExpired, setVerifyPasswordIsExpired] = useState(false)

  const currentUserId = session?.user?.id

  // Check if a trail is locked for the current user
  const isTrailLocked = useCallback((trail: Trail): boolean => {
    if (!trail.isPasswordProtected) return false
    if (trail.createdById === currentUserId) return false
    if (verifiedTrails.has(trail.id)) return false
    return true
  }, [currentUserId, verifiedTrails])

  // ── Derived data ──────────────────────────────────────────────────────────

  const filteredStudents = studentSearch
    ? students.filter(
        (s) =>
          s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
          s.name.toLowerCase().includes(studentSearch.toLowerCase())
      )
    : students

  const paginatedStudents = filteredStudents.slice(
    0,
    studentPage * STUDENTS_PER_PAGE
  )
  const hasMoreStudents = filteredStudents.length > paginatedStudents.length

  const filteredRestrictedTrails = trails
    .filter((t) => t.isRestricted)
    .filter((t) => t.title.toLowerCase().includes(trailSearch.toLowerCase()))

  const restrictedTrails = trails.filter((t) => t.isRestricted)

  const accessByTrail = restrictedTrails.map((trail) => ({
    trail,
    students: access
      .filter((a) => a.trailId === trail.id)
      .map((a) => a.student),
  }))

  // ── Click outside handlers ────────────────────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        studentSearchRef.current &&
        !studentSearchRef.current.contains(event.target as Node)
      ) {
        setShowStudentDropdown(false)
      }
      if (
        trailSearchRef.current &&
        !trailSearchRef.current.contains(event.target as Node)
      ) {
        setShowTrailDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
        allUsers.filter((u: { role: string }) => u.role === "STUDENT")
      )

      const trailsData = await trailsRes.json()
      setTrails(trailsData)

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

  // ── Trail status update ───────────────────────────────────────────────────

  const updateTrailStatus = async (
    trailId: string,
    updates: Record<string, unknown>
  ) => {
    try {
      setUpdatingTrail(trailId)
      const res = await fetch(`/api/admin/trails/${trailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Ошибка обновления")
      }

      await fetchData()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Ошибка обновления",
        "error"
      )
    } finally {
      setUpdatingTrail(null)
    }
  }

  const togglePublished = (trail: Trail) => {
    updateTrailStatus(trail.id, { isPublished: !trail.isPublished })
  }

  const toggleRestriction = (trail: Trail) => {
    updateTrailStatus(trail.id, { isRestricted: !trail.isRestricted })
  }

  const togglePasswordProtection = (trail: Trail) => {
    if (!trail.isPasswordProtected) {
      // Enabling — open password modal to set password
      setPasswordModalTrail(trail)
    } else {
      // Disabling — remove password protection
      updateTrailStatus(trail.id, { removePassword: true })
    }
  }

  // ── Student access CRUD ───────────────────────────────────────────────────

  const grantAccess = async () => {
    if (!selectedStudent && !selectedTrail) {
      setValidationError("Выберите студента и trail")
      return
    }
    if (!selectedStudent) {
      setValidationError("Выберите студента")
      return
    }
    if (!selectedTrail) {
      setValidationError("Выберите trail")
      return
    }

    setValidationError("")

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
      setStudentSearch("")
      setTrailSearch("")
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

  // ── Expand/collapse trail ─────────────────────────────────────────────────

  const toggleExpanded = async (trail: Trail) => {
    // If already expanded, just collapse
    if (expandedTrails.has(trail.id)) {
      setExpandedTrails((prev) => {
        const next = new Set(prev)
        next.delete(trail.id)
        return next
      })
      return
    }

    // If trail is locked, check password before expanding
    if (isTrailLocked(trail)) {
      // Check server-side if already unlocked
      try {
        const res = await fetch(`/api/admin/trails/${trail.id}/password-status`)
        if (res.ok) {
          const data = await res.json()
          if (!data.needsPassword) {
            setVerifiedTrails(prev => new Set(prev).add(trail.id))
            setExpandedTrails(prev => new Set(prev).add(trail.id))
            return
          }
          setVerifyPasswordIsExpired(data.isExpired)
        }
      } catch {
        // Fall through to show modal
      }

      setVerifyPasswordTrail(trail)
      setShowVerifyPasswordModal(true)
      return
    }

    // Not locked, just expand
    setExpandedTrails((prev) => {
      const next = new Set(prev)
      next.add(trail.id)
      return next
    })
  }

  const handleVerifyPasswordSuccess = () => {
    setShowVerifyPasswordModal(false)
    if (verifyPasswordTrail) {
      setVerifiedTrails(prev => new Set(prev).add(verifyPasswordTrail.id))
      setExpandedTrails(prev => new Set(prev).add(verifyPasswordTrail.id))
      setVerifyPasswordTrail(null)
    }
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
      {/* Password Modal (for setting/updating trail password) */}
      {passwordModalTrail && (
        <TrailPasswordModal
          trail={passwordModalTrail}
          onClose={() => setPasswordModalTrail(null)}
          onSaved={fetchData}
        />
      )}

      {/* Password Verification Modal (for unlocking locked trails) */}
      {verifyPasswordTrail && (
        <AdminTrailPasswordModal
          open={showVerifyPasswordModal}
          trailId={verifyPasswordTrail.id}
          trailTitle={verifyPasswordTrail.title}
          isExpired={verifyPasswordIsExpired}
          onClose={() => {
            setShowVerifyPasswordModal(false)
            setVerifyPasswordTrail(null)
          }}
          onSuccess={handleVerifyPasswordSuccess}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-end gap-2 mb-6">
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
          <button onClick={() => setError("")} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Trail Status Card ────────────────────────────────────────── */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Статус Trails
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trails.map((trail) => {
              const isExpanded = expandedTrails.has(trail.id)
              const isUpdating = updatingTrail === trail.id
              const isCreator = trail.createdById === currentUserId

              return (
                <div key={trail.id} className="border rounded-lg overflow-hidden">
                  {/* Trail header row */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(trail)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {trail.isRestricted ? (
                        <Lock className="h-5 w-5 text-orange-500 shrink-0" />
                      ) : (
                        <Unlock className="h-5 w-5 text-green-500 shrink-0" />
                      )}
                      <span className="font-medium truncate">
                        {trail.title}
                      </span>
                      <div className="flex gap-1.5 shrink-0">
                        <Badge
                          variant={
                            trail.isPublished ? "secondary" : "destructive"
                          }
                          className="text-xs"
                        >
                          {trail.isPublished ? "Опубликован" : "Черновик"}
                        </Badge>
                        <Badge
                          variant={
                            trail.isRestricted ? "destructive" : "secondary"
                          }
                          className="text-xs"
                        >
                          {trail.isRestricted ? "Ограниченный" : "Публичный"}
                        </Badge>
                        {trail.isPasswordProtected && (
                          <Badge
                            variant="outline"
                            className="text-xs text-amber-700 border-amber-300"
                          >
                            Пароль
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isUpdating ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-gray-400 shrink-0 ml-2" />
                    ) : isTrailLocked(trail) ? (
                      <Lock className="h-4 w-4 text-amber-500 shrink-0 ml-2" />
                    ) : isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                    )}
                  </button>

                  {/* Expanded toggles — never show for locked trails */}
                  {isExpanded && !isTrailLocked(trail) && (
                    <div className="p-4 space-y-3 border-t bg-white">
                      {/* Published toggle */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {trail.isPublished ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                          <div>
                            <span className="text-sm font-medium">
                              Опубликован
                            </span>
                            <p className="text-xs text-gray-500">
                              Trail доступен на платформе
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={trail.isPublished}
                          onCheckedChange={() => togglePublished(trail)}
                          disabled={isUpdating}
                        />
                      </div>

                      {/* Visibility toggle */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {!trail.isRestricted ? (
                            <Unlock className="h-4 w-4 text-green-600" />
                          ) : (
                            <Lock className="h-4 w-4 text-orange-500" />
                          )}
                          <div>
                            <span className="text-sm font-medium">
                              Виден всем студентам
                            </span>
                            <p className="text-xs text-gray-500">
                              Все студенты видят этот trail
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={!trail.isRestricted}
                          onCheckedChange={() => toggleRestriction(trail)}
                          disabled={isUpdating}
                        />
                      </div>

                      {/* Password protection toggle */}
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-amber-600" />
                            <div>
                              <span className="text-sm font-medium text-amber-900">
                                Защита паролем
                              </span>
                              <p className="text-xs text-amber-700">
                                {trail.isPasswordProtected
                                  ? "Требуется пароль для доступа"
                                  : "Доступ без пароля"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {trail.isPasswordProtected && isCreator && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPasswordModalTrail(trail)}
                                className="text-xs"
                              >
                                Изменить
                              </Button>
                            )}
                            <Switch
                              checked={trail.isPasswordProtected}
                              onCheckedChange={() =>
                                togglePasswordProtection(trail)
                              }
                              disabled={isUpdating || !isCreator}
                            />
                          </div>
                        </div>
                        {trail.isPasswordProtected && trail.passwordHint && (
                          <p className="text-xs text-amber-600 mt-2">
                            Подсказка: {trail.passwordHint}
                          </p>
                        )}
                        {!isCreator && (
                          <p className="text-xs text-amber-600 mt-2">
                            Только создатель trail может управлять паролем
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {trails.length === 0 && (
              <p className="text-gray-500 text-center py-4">Нет trails</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Grant Access Card ────────────────────────────────────────── */}
      {restrictedTrails.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Выдать доступ к ограниченному Trail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              {/* Student search with dropdown */}
              <div className="flex-1" ref={studentSearchRef}>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Студент
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value)
                        setShowStudentDropdown(true)
                        setStudentPage(1)
                        if (!e.target.value) setSelectedStudent("")
                      }}
                      onFocus={() => setShowStudentDropdown(true)}
                      placeholder="Поиск или выберите из списка..."
                      className="w-full p-2 pl-10 border rounded-lg"
                    />
                  </div>
                  {showStudentDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                      {paginatedStudents.length === 0 ? (
                        <div className="p-3 text-gray-500 text-sm">
                          {studentSearch ? "Не найдено" : "Нет студентов"}
                        </div>
                      ) : (
                        <>
                          {paginatedStudents.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedStudent(s.id)
                                setStudentSearch(s.email)
                                setShowStudentDropdown(false)
                              }}
                              className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                                selectedStudent === s.id ? "bg-blue-50" : ""
                              }`}
                            >
                              <div className="font-medium text-sm">
                                {s.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {s.email}
                              </div>
                            </button>
                          ))}
                          {hasMoreStudents && (
                            <button
                              type="button"
                              onClick={() => setStudentPage((p) => p + 1)}
                              className="w-full text-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t"
                            >
                              Показать ещё (
                              {filteredStudents.length -
                                paginatedStudents.length}
                              )
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                {selectedStudent && (
                  <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Выбран:{" "}
                    {students.find((s) => s.id === selectedStudent)?.name}
                  </div>
                )}
              </div>

              {/* Trail search */}
              <div className="flex-1" ref={trailSearchRef}>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Trail (ограниченный)
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={trailSearch}
                      onChange={(e) => {
                        setTrailSearch(e.target.value)
                        setShowTrailDropdown(true)
                        if (!e.target.value) setSelectedTrail("")
                      }}
                      onFocus={() => setShowTrailDropdown(true)}
                      placeholder="Поиск по названию..."
                      className="w-full p-2 pl-10 border rounded-lg"
                    />
                  </div>
                  {showTrailDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredRestrictedTrails.length === 0 ? (
                        <div className="p-3 text-gray-500 text-sm">
                          Не найдено
                        </div>
                      ) : (
                        filteredRestrictedTrails.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedTrail(t.id)
                              setTrailSearch(t.title)
                              setShowTrailDropdown(false)
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                              selectedTrail === t.id ? "bg-blue-50" : ""
                            }`}
                          >
                            <div className="font-medium">{t.title}</div>
                            <div className="text-sm text-gray-500">
                              /{t.slug}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {selectedTrail && (
                  <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Выбран:{" "}
                    {trails.find((t) => t.id === selectedTrail)?.title}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-start gap-2">
                <Button onClick={grantAccess} disabled={assigning}>
                  {assigning ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Выдать доступ
                    </>
                  )}
                </Button>
                {validationError && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {validationError}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Access List by Trail ──────────────────────────────────────── */}
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
                          <span className="text-gray-400 ml-1">
                            ({student.email})
                          </span>
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
  )
}
