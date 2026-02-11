"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { pluralizeRu } from "@/lib/utils"
import {
  RefreshCw,
  Users,
  GraduationCap,
  Shield,
  ShieldCheck,
  BookOpen,
  Trash2,
  CalendarDays,
  Search,
  X,
  Gift,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { getUrlParams, parseEnumParam, updateUrl } from "@/lib/url-state"

type UserRole = "STUDENT" | "TEACHER" | "CO_ADMIN" | "ADMIN"
type RoleFilterValue = "ALL" | UserRole
const VALID_ROLE_FILTERS: readonly RoleFilterValue[] = ["ALL", "STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"]
const FILTER_DEFAULTS = { q: "", role: "ALL" }

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  totalXP: number
  createdAt: string
  _count: {
    enrollments: number
    submissions: number
    activityDays: number
  }
}

const roleConfig: Record<UserRole, { label: string; color: string; icon: typeof Shield }> = {
  STUDENT: {
    label: "Студент",
    color: "bg-blue-100 text-blue-700",
    icon: GraduationCap,
  },
  TEACHER: {
    label: "Учитель",
    color: "bg-green-100 text-green-700",
    icon: BookOpen,
  },
  CO_ADMIN: {
    label: "Со-админ",
    color: "bg-purple-100 text-purple-700",
    icon: Shield,
  },
  ADMIN: {
    label: "Админ",
    color: "bg-red-100 text-red-700",
    icon: ShieldCheck,
  },
}

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [grantingAchievementId, setGrantingAchievementId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>("ALL")
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const isAdmin = session?.user?.role === "ADMIN"

  // Read initial filter values from URL on mount
  useEffect(() => {
    const params = getUrlParams()
    const q = params.get("q") || ""
    const role = parseEnumParam(params.get("role"), VALID_ROLE_FILTERS, "ALL")
    if (q) setSearchQuery(q)
    if (role !== "ALL") setRoleFilter(role)
  }, [])

  // Sync filter state to URL
  const syncUrl = useCallback(
    (params: { q: string; role: string }) => {
      updateUrl(pathname, params, FILTER_DEFAULTS)
    },
    [pathname],
  )

  // Debounced URL sync for search input
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(() => {
        syncUrl({ q: value, role: roleFilter })
      }, 300)
    },
    [roleFilter, syncUrl],
  )

  const handleRoleFilterChange = useCallback(
    (value: string) => {
      const role = value as RoleFilterValue
      setRoleFilter(role)
      syncUrl({ q: searchQuery, role })
    },
    [searchQuery, syncUrl],
  )

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setUsers(data)
    } catch {
      setError("Ошибка загрузки пользователей")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const updateRole = async (userId: string, newRole: UserRole) => {
    // Only ADMIN can assign ADMIN role
    if (newRole === "ADMIN" && !isAdmin) {
      showToast("Только админ может назначать роль админа", "error")
      return
    }

    try {
      setUpdatingId(userId)
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })

      if (!res.ok) {
        const data = await res.json()
        showToast(data.error || "Ошибка", "error")
        return
      }

      // Update local state
      setUsers(users.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ))
      showToast("Роль обновлена", "success")
    } catch {
      showToast("Ошибка при обновлении роли", "error")
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteUser = async (userId: string, userName: string) => {
    const confirmed = await confirm({
      title: "Удалить пользователя?",
      message: `Вы уверены, что хотите удалить "${userName}"? Это действие нельзя отменить.`,
      confirmText: "Удалить",
      variant: "danger",
    })

    if (!confirmed) return

    try {
      setDeletingId(userId)
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        showToast(data.error + (data.details ? ` ${data.details}` : "") || "Ошибка при удалении", "error")
        return
      }

      // Remove from local state
      setUsers(users.filter(u => u.id !== userId))
      showToast("Пользователь удалён", "success")
    } catch {
      showToast("Ошибка при удалении пользователя", "error")
    } finally {
      setDeletingId(null)
    }
  }

  const grantRandomAchievement = async (userId: string, userName: string) => {
    try {
      setGrantingAchievementId(userId)
      const res = await fetch("/api/admin/achievements/grant-random", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()

      if (!res.ok) {
        showToast(data.message || data.error || "Ошибка при выдаче достижения", "error")
        return
      }

      showToast(
        `Достижение "${data.achievement.name}" выдано пользователю ${userName}`,
        "success"
      )
    } catch {
      showToast("Ошибка при выдаче достижения", "error")
    } finally {
      setGrantingAchievementId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const students = users.filter(u => u.role === "STUDENT")
  const teachers = users.filter(u => u.role === "TEACHER")
  const admins = users.filter(u => u.role === "CO_ADMIN" || u.role === "ADMIN")

  // Filter users by search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === "" ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Breadcrumbs
            items={[
              { label: "Админ", href: "/admin/invites" },
              { label: "Пользователи" },
            ]}
            className="mb-4"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Управление пользователями
                </h1>
                <p className="text-gray-600 text-sm">
                  {users.length} пользователей • {teachers.length} учителей
                </p>
              </div>
            </div>
            <Button onClick={fetchUsers} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <GraduationCap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-sm text-gray-500">Студентов</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{teachers.length}</p>
                <p className="text-sm text-gray-500">Учителей</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{admins.length}</p>
                <p className="text-sm text-gray-500">Админов</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold">Все пользователи</h2>
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск по имени или email..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 pr-8 py-1.5 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearchChange("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {/* Role filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => handleRoleFilterChange(e.target.value)}
                  className="px-3 py-1.5 border rounded-lg text-sm bg-white"
                >
                  <option value="ALL">Все роли</option>
                  <option value="STUDENT">Студенты</option>
                  <option value="TEACHER">Учителя</option>
                  <option value="CO_ADMIN">Со-админы</option>
                  <option value="ADMIN">Админы</option>
                </select>
              </div>
            </div>
            {/* Results count */}
            {(searchQuery || roleFilter !== "ALL") && (
              <p className="text-sm text-gray-500 mt-2">
                Найдено: {filteredUsers.length} из {users.length}
              </p>
            )}
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {users.length === 0 ? "Нет пользователей" : "Никого не найдено"}
            </div>
          ) : (
            <div className="divide-y">
              {filteredUsers.map((user) => {
                const config = roleConfig[user.role]
                const RoleIcon = config.icon
                const isUpdating = updatingId === user.id
                const isDeleting = deletingId === user.id

                return (
                  <div key={user.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.color.replace('text-', 'bg-').replace('700', '100')}`}>
                          <RoleIcon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.name}</span>
                            <Badge className={`${config.color} border-0 text-xs`}>
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1 text-purple-600" title="Активных дней">
                            <CalendarDays className="h-4 w-4" />
                            <span className="font-medium">{user._count.activityDays}</span>
                          </div>
                          <span>•</span>
                          <span>{user.totalXP} XP</span>
                          <span>•</span>
                          <span>{user._count.submissions} {pluralizeRu(user._count.submissions, ["работа", "работы", "работ"])}</span>
                        </div>

                        {/* Role selector */}
                        {/* CO_ADMIN cannot change roles of ADMIN/CO_ADMIN users */}
                        {!isAdmin && (user.role === "ADMIN" || user.role === "CO_ADMIN") ? (
                          <span className="px-3 py-1.5 text-sm text-gray-500">
                            {roleConfig[user.role].label}
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => updateRole(user.id, e.target.value as UserRole)}
                            disabled={isUpdating || isDeleting}
                            className="px-3 py-1.5 border rounded-lg text-sm bg-white disabled:opacity-50"
                          >
                            <option value="STUDENT">Студент</option>
                            <option value="TEACHER">Учитель</option>
                            {/* Only ADMIN can assign CO_ADMIN/ADMIN roles */}
                            {isAdmin && <option value="CO_ADMIN">Со-админ</option>}
                            {isAdmin && <option value="ADMIN">Админ</option>}
                          </select>
                        )}

                        {/* Grant random achievement button */}
                        <button
                          onClick={() => grantRandomAchievement(user.id, user.name)}
                          disabled={grantingAchievementId === user.id}
                          className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Выдать случайное достижение"
                        >
                          {grantingAchievementId === user.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Gift className="h-4 w-4" />
                          )}
                        </button>

                        {/* Delete button - CO_ADMIN cannot delete ADMIN/CO_ADMIN users */}
                        {(isAdmin || (user.role !== "ADMIN" && user.role !== "CO_ADMIN")) && (
                          <button
                            onClick={() => deleteUser(user.id, user.name)}
                            disabled={isDeleting}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Удалить пользователя"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Help text */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Как это работает:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Студент</strong> — может проходить тесты и сдавать проекты</li>
            <li>• <strong>Учитель</strong> — может проверять работы на /teacher</li>
            <li>• <strong>Со-админ</strong> — доступ к админке только для назначенных trails</li>
            <li>• <strong>Админ</strong> — полный доступ ко всем trails и управление доступом со-админов</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
