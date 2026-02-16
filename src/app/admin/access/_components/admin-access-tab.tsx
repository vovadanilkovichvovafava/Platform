"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/toast"
import {
  RefreshCw,
  Shield,
  ShieldCheck,
  Save,
  X,
  Check,
  AlertTriangle,
} from "lucide-react"
import { InfoHint } from "@/components/ui/info-hint"
import { HowItWorks } from "@/components/ui/how-it-works"
import { adminHelpHints, adminPageLegends } from "@/lib/admin-help-texts"

interface CoAdmin {
  id: string
  name: string
  email: string
  role: string
  trailIds: string[]
}

interface Trail {
  id: string
  title: string
  slug: string
  isPublished: boolean
}

export function AdminAccessTab() {
  const { data: session, status } = useSession()
  const [coAdmins, setCoAdmins] = useState<CoAdmin[]>([])
  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [changes, setChanges] = useState<Record<string, string[]>>({})
  const { showToast } = useToast()

  const isAdmin = session?.user?.role === "ADMIN"

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch("/api/admin/admin-access")

      if (res.status === 403) {
        setError("Доступ запрещён. Требуется роль ADMIN")
        return
      }

      if (!res.ok) throw new Error("Failed to fetch")

      const data = await res.json()
      setCoAdmins(data.coAdmins)
      setTrails(data.trails)
      const initialChanges: Record<string, string[]> = {}
      data.coAdmins.forEach((coAdmin: CoAdmin) => {
        initialChanges[coAdmin.id] = [...coAdmin.trailIds]
      })
      setChanges(initialChanges)
    } catch {
      setError("Ошибка загрузки данных")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "loading") return
    if (!isAdmin) return
    fetchData()
  }, [status, isAdmin, fetchData])

  const toggleTrail = (adminId: string, trailId: string) => {
    setChanges((prev) => {
      const current = prev[adminId] || []
      if (current.includes(trailId)) {
        return { ...prev, [adminId]: current.filter((id) => id !== trailId) }
      } else {
        return { ...prev, [adminId]: [...current, trailId] }
      }
    })
  }

  const selectAll = (adminId: string) => {
    setChanges((prev) => ({
      ...prev,
      [adminId]: trails.map((t) => t.id),
    }))
  }

  const deselectAll = (adminId: string) => {
    setChanges((prev) => ({
      ...prev,
      [adminId]: [],
    }))
  }

  const hasChanges = (coAdminId: string) => {
    const coAdmin = coAdmins.find((a) => a.id === coAdminId)
    if (!coAdmin) return false
    const current = changes[coAdminId] || []
    if (coAdmin.trailIds.length !== current.length) return true
    return !coAdmin.trailIds.every((id) => current.includes(id))
  }

  const saveAccess = async (coAdminId: string) => {
    try {
      setSavingId(coAdminId)
      const res = await fetch("/api/admin/admin-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coAdminId,
          trailIds: changes[coAdminId] || [],
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        showToast(data.error || "Ошибка сохранения", "error")
        return
      }

      setCoAdmins((prev) =>
        prev.map((a) =>
          a.id === coAdminId ? { ...a, trailIds: changes[coAdminId] || [] } : a
        )
      )
      showToast("Доступ обновлён", "success")
    } catch {
      showToast("Ошибка при сохранении", "error")
    } finally {
      setSavingId(null)
    }
  }

  const resetChanges = (coAdminId: string) => {
    const coAdmin = coAdmins.find((a) => a.id === coAdminId)
    if (coAdmin) {
      setChanges((prev) => ({
        ...prev,
        [coAdminId]: [...coAdmin.trailIds],
      }))
    }
  }

  // Access denied state
  if (status !== "loading" && !isAdmin) {
    return (
      <div className="bg-white rounded-xl border p-12 text-center">
        <ShieldCheck className="h-12 w-12 text-red-300 mx-auto mb-4" />
        <p className="text-red-600 font-medium mb-2">Доступ запрещён</p>
        <p className="text-sm text-gray-500">
          Эта вкладка доступна только пользователям с ролью ADMIN
        </p>
      </div>
    )
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      {/* Header actions */}
      <div className="flex items-center justify-end gap-2 mb-6">
        <Badge className="bg-red-100 text-red-700 border-0">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Только для ADMIN
        </Badge>
        <InfoHint hint={adminHelpHints.adminAccess.adminOnlyTab.shortHint} side="bottom" />
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* How it works legend */}
      <HowItWorks legend={adminPageLegends.adminAccess} className="mb-6" />

      {coAdmins.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Нет пользователей с ролью CO_ADMIN или HR</p>
          <p className="text-sm text-gray-400">
            Назначьте пользователям роль CO_ADMIN или HR в разделе{" "}
            <a href="/admin/users" className="text-blue-600 hover:underline">
              Управление пользователями
            </a>
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {coAdmins.map((coAdmin) => {
            const coAdminTrailIds = changes[coAdmin.id] || []
            const changed = hasChanges(coAdmin.id)
            const isSaving = savingId === coAdmin.id

            return (
              <div
                key={coAdmin.id}
                className={`bg-white rounded-xl border overflow-hidden ${
                  changed ? "ring-2 ring-blue-500" : ""
                }`}
              >
                {/* Co-admin header */}
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${coAdmin.role === "HR" ? "bg-amber-100" : "bg-purple-100"}`}>
                      <Shield className={`h-5 w-5 ${coAdmin.role === "HR" ? "text-amber-600" : "text-purple-600"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{coAdmin.name}</span>
                        <Badge className={`border-0 text-xs ${coAdmin.role === "HR" ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"}`}>
                          {coAdmin.role}
                        </Badge>
                        {changed && (
                          <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                            Не сохранено
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{coAdmin.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {coAdminTrailIds.length} из {trails.length} trails
                    </span>
                    <InfoHint hint={adminHelpHints.adminAccess.coAdminTrails.shortHint} side="left" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAll(coAdmin.id)}
                      disabled={isSaving}
                    >
                      Выбрать все
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deselectAll(coAdmin.id)}
                      disabled={isSaving}
                    >
                      Снять все
                    </Button>
                    {changed && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetChanges(coAdmin.id)}
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Отменить
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveAccess(coAdmin.id)}
                          disabled={isSaving}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isSaving ? (
                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-1" />
                          )}
                          Сохранить
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Trails grid */}
                <div className="p-4">
                  {trails.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      Нет доступных trails
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {trails.map((trail) => {
                        const isSelected = coAdminTrailIds.includes(trail.id)
                        return (
                          <label
                            key={trail.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-blue-50 border-blue-300"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() =>
                                toggleTrail(coAdmin.id, trail.id)
                              }
                              disabled={isSaving}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-900 truncate block">
                                {trail.title}
                              </span>
                              {!trail.isPublished && (
                                <span className="text-xs text-gray-400">
                                  Скрыт
                                </span>
                              )}
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-blue-600 shrink-0" />
                            )}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
