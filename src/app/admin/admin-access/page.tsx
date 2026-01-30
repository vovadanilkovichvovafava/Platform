"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/toast"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import {
  RefreshCw,
  Shield,
  ShieldCheck,
  Save,
  X,
  Check,
  AlertTriangle,
} from "lucide-react"

interface Admin {
  id: string
  name: string
  email: string
  trailIds: string[]
}

interface Trail {
  id: string
  title: string
  slug: string
  isPublished: boolean
}

export default function AdminAccessPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [changes, setChanges] = useState<Record<string, string[]>>({})
  const { showToast } = useToast()

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"

  const fetchData = async () => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch("/api/admin/admin-access")

      if (res.status === 403) {
        setError("Доступ запрещён. Требуется роль SUPER_ADMIN")
        return
      }

      if (!res.ok) throw new Error("Failed to fetch")

      const data = await res.json()
      setAdmins(data.admins)
      setTrails(data.trails)
      // Initialize changes from server data
      const initialChanges: Record<string, string[]> = {}
      data.admins.forEach((admin: Admin) => {
        initialChanges[admin.id] = [...admin.trailIds]
      })
      setChanges(initialChanges)
    } catch {
      setError("Ошибка загрузки данных")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "loading") return
    if (!isSuperAdmin) {
      router.push("/admin/users")
      return
    }
    fetchData()
  }, [status, isSuperAdmin, router])

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

  const hasChanges = (adminId: string) => {
    const admin = admins.find((a) => a.id === adminId)
    if (!admin) return false
    const current = changes[adminId] || []
    if (admin.trailIds.length !== current.length) return true
    return !admin.trailIds.every((id) => current.includes(id))
  }

  const saveAccess = async (adminId: string) => {
    try {
      setSavingId(adminId)
      const res = await fetch("/api/admin/admin-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId,
          trailIds: changes[adminId] || [],
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        showToast(data.error || "Ошибка сохранения", "error")
        return
      }

      // Update local state
      setAdmins((prev) =>
        prev.map((a) =>
          a.id === adminId ? { ...a, trailIds: changes[adminId] || [] } : a
        )
      )
      showToast("Доступ обновлён", "success")
    } catch {
      showToast("Ошибка при сохранении", "error")
    } finally {
      setSavingId(null)
    }
  }

  const resetChanges = (adminId: string) => {
    const admin = admins.find((a) => a.id === adminId)
    if (admin) {
      setChanges((prev) => ({
        ...prev,
        [adminId]: [...admin.trailIds],
      }))
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Breadcrumbs
            items={[
              { label: "Админ", href: "/admin/invites" },
              { label: "Доступ админов" },
            ]}
            className="mb-4"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Управление доступом админов
                </h1>
                <p className="text-gray-600 text-sm">
                  Назначьте каким trails имеет доступ каждый админ
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-700 border-0">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Только для SUPER_ADMIN
              </Badge>
              <Button onClick={fetchData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Обновить
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Info box */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">Как это работает:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>SUPER_ADMIN</strong> видит все trails без ограничений</li>
            <li>• <strong>ADMIN</strong> видит только назначенные trails (deny-by-default)</li>
            <li>• Если у админа нет назначенных trails — он не видит ничего</li>
            <li>• При создании trail админом — он автоматически получает к нему доступ</li>
          </ul>
        </div>

        {admins.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Нет администраторов с ролью ADMIN</p>
            <p className="text-sm text-gray-400">
              Назначьте пользователям роль ADMIN в разделе{" "}
              <a href="/admin/users" className="text-blue-600 hover:underline">
                Управление пользователями
              </a>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {admins.map((admin) => {
              const adminTrailIds = changes[admin.id] || []
              const changed = hasChanges(admin.id)
              const isSaving = savingId === admin.id

              return (
                <div
                  key={admin.id}
                  className={`bg-white rounded-xl border overflow-hidden ${
                    changed ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  {/* Admin header */}
                  <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Shield className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{admin.name}</span>
                          <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">
                            ADMIN
                          </Badge>
                          {changed && (
                            <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                              Не сохранено
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {adminTrailIds.length} из {trails.length} trails
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectAll(admin.id)}
                        disabled={isSaving}
                      >
                        Выбрать все
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deselectAll(admin.id)}
                        disabled={isSaving}
                      >
                        Снять все
                      </Button>
                      {changed && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetChanges(admin.id)}
                            disabled={isSaving}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Отменить
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveAccess(admin.id)}
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
                          const isSelected = adminTrailIds.includes(trail.id)
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
                                  toggleTrail(admin.id, trail.id)
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
    </div>
  )
}
