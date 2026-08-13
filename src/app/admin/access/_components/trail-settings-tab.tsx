"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/toast"
import {
  RefreshCw,
  Lock,
  Unlock,
  X,
  AlertCircle,
  BookOpen,
  Eye,
  EyeOff,
  KeyRound,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { AdminTrailPasswordModal } from "@/components/admin-trail-password-modal"
import { InfoHint } from "@/components/ui/info-hint"
import { HowItWorks } from "@/components/ui/how-it-works"
import { adminHelpHints, adminPageLegends } from "@/lib/admin-help-texts"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// Password Modal (inline — setting/updating trail password)
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

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

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
                    <KeyRound className="h-4 w-4 mr-2" />
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

export function TrailSettingsTab() {
  const { data: session } = useSession()
  const { showToast } = useToast()

  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Trail status update loading
  const [updatingTrail, setUpdatingTrail] = useState<string | null>(null)

  // Password modal
  const [passwordModalTrail, setPasswordModalTrail] = useState<Trail | null>(null)

  // Expanded trail sections
  const [expandedTrails, setExpandedTrails] = useState<Set<string>>(new Set())

  // Password verification for expanding locked trails
  const [verifiedTrails, setVerifiedTrails] = useState<Set<string>>(new Set())
  const [verifyPasswordTrail, setVerifyPasswordTrail] = useState<Trail | null>(null)
  const [showVerifyPasswordModal, setShowVerifyPasswordModal] = useState(false)
  const [verifyPasswordIsExpired, setVerifyPasswordIsExpired] = useState(false)

  const currentUserId = session?.user?.id
  const currentUserRole = session?.user?.role

  // Check if current user can manage password settings for a trail
  const canManageTrailPassword = useCallback((trail: Trail): boolean => {
    if (trail.createdById === currentUserId) return true
    if (currentUserRole === "ADMIN" && !trail.createdById) return true
    return false
  }, [currentUserId, currentUserRole])

  // Check if a trail is locked for the current user
  const isTrailLocked = useCallback((trail: Trail): boolean => {
    if (!trail.isPasswordProtected) return false
    if (trail.createdById === currentUserId) return false
    if (verifiedTrails.has(trail.id)) return false
    return true
  }, [currentUserId, verifiedTrails])

  // ── Fetch data ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      const trailsRes = await fetch("/api/admin/trails")
      const trailsData = await trailsRes.json()
      setTrails(trailsData)
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
      setPasswordModalTrail(trail)
    } else {
      updateTrailStatus(trail.id, { removePassword: true })
    }
  }

  // ── Expand/collapse trail ─────────────────────────────────────────────────

  const toggleExpanded = async (trail: Trail) => {
    if (expandedTrails.has(trail.id)) {
      setExpandedTrails((prev) => {
        const next = new Set(prev)
        next.delete(trail.id)
        return next
      })
      return
    }

    if (isTrailLocked(trail)) {
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

      {/* How it works legend */}
      <HowItWorks legend={adminPageLegends.trailSettings ?? adminPageLegends.studentAccess} className="mb-6" />

      {/* ── Trail Status Card ────────────────────────────────────────── */}
      <Card>
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
              const isCreator = canManageTrailPassword(trail)

              return (
                <div key={trail.id} className="border rounded-lg overflow-hidden">
                  {/* Trail header row */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(trail)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
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
                    <div className="p-4 space-y-3 border-t bg-white dark:bg-slate-900">
                      {/* Published toggle */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          {trail.isPublished ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium">
                                Опубликован
                              </span>
                              <InfoHint hint={adminHelpHints.studentAccess.trailPublished.shortHint} side="right" />
                            </div>
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
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          {!trail.isRestricted ? (
                            <Unlock className="h-4 w-4 text-green-600" />
                          ) : (
                            <Lock className="h-4 w-4 text-orange-500" />
                          )}
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium">
                                Виден всем студентам
                              </span>
                              <InfoHint hint={adminHelpHints.studentAccess.trailRestricted.shortHint} side="right" />
                            </div>
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
                      <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-100 dark:border-amber-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                                  Защита паролем
                                </span>
                                <InfoHint hint={adminHelpHints.studentAccess.trailPasswordProtection.shortHint} side="right" />
                              </div>
                              <p className="text-xs text-amber-700 dark:text-amber-300">
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
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                            Подсказка: {trail.passwordHint}
                          </p>
                        )}
                        {!isCreator && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
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
    </div>
  )
}
