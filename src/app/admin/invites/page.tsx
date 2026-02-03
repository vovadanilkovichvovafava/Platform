"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Loader2, Plus, Trash2, Copy, Check, Ticket, FileText, Users, BarChart3, AlertTriangle, CheckCircle, Clock, Ban } from "lucide-react"
import Link from "next/link"

interface Invite {
  id: string
  code: string
  email: string | null
  maxUses: number
  usedCount: number
  expiresAt: string | null
  createdAt: string
  createdBy: { name: string; email: string }
}

export default function AdminInvitesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [invites, setInvites] = useState<Invite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const [newInvite, setNewInvite] = useState({
    code: "",
    email: "",
    maxUses: 1,
    expiresAt: "",
  })

  // Validation errors state
  const [errors, setErrors] = useState<{
    code?: string
    email?: string
    maxUses?: string
  }>({})

  // Simple email validation regex (basic check)
  const isValidEmail = (email: string): boolean => {
    if (!email) return true // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate maxUses field
  const validateMaxUses = (value: number | string): string | undefined => {
    const num = typeof value === "string" ? parseInt(value, 10) : value
    if (isNaN(num)) return "Введите число"
    if (!Number.isInteger(num)) return "Должно быть целым числом"
    if (num < 1) return "Минимум 1 использование"
    return undefined
  }

  // Validate email field
  const validateEmail = (value: string): string | undefined => {
    if (!value) return undefined // Email is optional
    if (!isValidEmail(value)) return "Некорректный формат email"
    return undefined
  }

  // Validate code field
  const validateCode = (value: string): string | undefined => {
    if (!value.trim()) return "Введите код приглашения"
    if (value.length < 3) return "Код должен быть минимум 3 символа"
    return undefined
  }

  // Validate all fields
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    const codeError = validateCode(newInvite.code)
    if (codeError) newErrors.code = codeError

    const emailError = validateEmail(newInvite.email)
    if (emailError) newErrors.email = emailError

    const maxUsesError = validateMaxUses(newInvite.maxUses)
    if (maxUsesError) newErrors.maxUses = maxUsesError

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Check if form has validation errors (for disabling submit button)
  const hasErrors = Boolean(errors.code || errors.email || errors.maxUses)

  useEffect(() => {
    if (status === "loading") return

    // Allow both ADMIN and CO_ADMIN
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "CO_ADMIN")) {
      router.push("/")
      return
    }

    fetchInvites()
  }, [session, status, router])

  const fetchInvites = async () => {
    try {
      const res = await fetch("/api/invites")
      if (res.ok) {
        const data = await res.json()
        setInvites(data)
      }
    } catch (error) {
      console.error("Error fetching invites:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validation
    if (!validateForm()) {
      return
    }

    setIsCreating(true)

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newInvite,
          code: newInvite.code.toUpperCase(),
        }),
      })

      if (res.ok) {
        setNewInvite({ code: "", email: "", maxUses: 1, expiresAt: "" })
        setErrors({}) // Clear validation errors
        fetchInvites()
        showToast("Приглашение создано", "success")
      } else {
        const data = await res.json()
        showToast(data.error, "error")
      }
    } catch (error) {
      console.error("Error creating invite:", error)
      showToast("Ошибка создания приглашения", "error")
    } finally {
      setIsCreating(false)
    }
  }

  const deleteInvite = async (id: string) => {
    const confirmed = await confirm({
      title: "Удалить приглашение?",
      message: "Это действие нельзя отменить.",
      confirmText: "Удалить",
      variant: "danger",
    })

    if (!confirmed) return

    try {
      const res = await fetch(`/api/invites?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchInvites()
        showToast("Приглашение удалено", "success")
      }
    } catch (error) {
      console.error("Error deleting invite:", error)
      showToast("Ошибка удаления", "error")
    }
  }

  const copyInviteLink = (code: string, id: string) => {
    const link = `${window.location.origin}/register?invite=${code}`
    navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let code = ""
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewInvite({ ...newInvite, code })
    // Clear code error when generating
    if (errors.code) {
      setErrors({ ...errors, code: undefined })
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  // Allow both ADMIN and CO_ADMIN
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "CO_ADMIN")) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
              <Ticket className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Управление приглашениями</h1>
              <p className="text-slate-500 text-sm">Создавайте и управляйте кодами приглашений</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Users className="h-4 w-4" />
              Пользователи
            </Link>
            <Link
              href="/admin/content"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileText className="h-4 w-4" />
              Контент
            </Link>
            <Link
              href="/admin/analytics"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Аналитика
            </Link>
          </div>
        </div>

        {/* Statistics */}
        {invites.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-2xl font-bold text-slate-900">{invites.length}</div>
              <div className="text-xs text-slate-500">Всего кодов</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-2xl font-bold text-green-600">
                {invites.filter(i => {
                  const isExpired = i.expiresAt && new Date(i.expiresAt) < new Date()
                  return !isExpired && i.usedCount < i.maxUses
                }).length}
              </div>
              <div className="text-xs text-slate-500">Активных</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-2xl font-bold text-blue-600">
                {invites.reduce((sum, i) => sum + i.usedCount, 0)}
              </div>
              <div className="text-xs text-slate-500">Использовано</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-2xl font-bold text-slate-400">
                {invites.filter(i => i.usedCount >= i.maxUses).length}
              </div>
              <div className="text-xs text-slate-500">Исчерпано</div>
            </div>
          </div>
        )}

        {/* Create New Invite */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Создать приглашение</h2>
          <form onSubmit={createInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Код приглашения</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={newInvite.code}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase()
                      setNewInvite({ ...newInvite, code: value })
                      // Clear error when user types
                      if (errors.code) {
                        setErrors({ ...errors, code: undefined })
                      }
                    }}
                    onBlur={() => {
                      const codeError = validateCode(newInvite.code)
                      if (codeError) setErrors({ ...errors, code: codeError })
                    }}
                    placeholder="MYCODE2024"
                    className="uppercase"
                    required
                    aria-invalid={!!errors.code}
                    aria-describedby={errors.code ? "code-error" : undefined}
                  />
                  <Button type="button" variant="outline" onClick={generateRandomCode}>
                    Сгенерировать
                  </Button>
                </div>
                {errors.code && (
                  <p id="code-error" className="text-sm text-red-500" role="alert">
                    {errors.code}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (опционально)</Label>
                <Input
                  id="email"
                  type="email"
                  value={newInvite.email}
                  onChange={(e) => {
                    setNewInvite({ ...newInvite, email: e.target.value })
                    // Clear error when user types
                    if (errors.email) {
                      setErrors({ ...errors, email: undefined })
                    }
                  }}
                  onBlur={() => {
                    const emailError = validateEmail(newInvite.email)
                    if (emailError) setErrors({ ...errors, email: emailError })
                  }}
                  placeholder="user@example.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-red-500" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUses">Макс. использований</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  step="1"
                  value={newInvite.maxUses}
                  onChange={(e) => {
                    const rawValue = e.target.value
                    const num = parseInt(rawValue, 10)
                    // Allow empty input (will show error), otherwise validate
                    if (rawValue === "") {
                      setNewInvite({ ...newInvite, maxUses: 0 })
                      setErrors({ ...errors, maxUses: "Введите число" })
                    } else if (!isNaN(num)) {
                      setNewInvite({ ...newInvite, maxUses: num })
                      const maxUsesError = validateMaxUses(num)
                      setErrors({ ...errors, maxUses: maxUsesError })
                    }
                  }}
                  aria-invalid={!!errors.maxUses}
                  aria-describedby={errors.maxUses ? "maxUses-error" : undefined}
                />
                {errors.maxUses && (
                  <p id="maxUses-error" className="text-sm text-red-500" role="alert">
                    {errors.maxUses}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Истекает (опционально)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={newInvite.expiresAt}
                  onChange={(e) => setNewInvite({ ...newInvite, expiresAt: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" disabled={isCreating || hasErrors} className="bg-orange-500 hover:bg-orange-600">
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Создать приглашение
            </Button>
          </form>
        </div>

        {/* Invites List */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Все приглашения ({invites.length})</h2>
          </div>

          {invites.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Приглашений пока нет
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invites.map((invite) => {
                const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date()
                const isExhausted = invite.usedCount >= invite.maxUses
                const isActive = !isExpired && !isExhausted
                const usagePercent = Math.round((invite.usedCount / invite.maxUses) * 100)

                return (
                  <div key={invite.id} className={`p-4 hover:bg-slate-50 transition-colors ${
                    !isActive ? "bg-slate-50/50" : ""
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <code className={`px-3 py-1 rounded-lg font-mono text-sm font-semibold ${
                            isActive ? "bg-slate-100 text-slate-900" : "bg-slate-200 text-slate-500"
                          }`}>
                            {invite.code}
                          </code>

                          {/* Status Badge */}
                          {isExpired ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              <Clock className="h-3 w-3" />
                              Истёк
                            </span>
                          ) : isExhausted ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                              <Ban className="h-3 w-3" />
                              Исчерпан
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Активен
                            </span>
                          )}

                          {/* Usage Progress */}
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isExhausted ? "bg-red-500" :
                                  usagePercent >= 75 ? "bg-yellow-500" :
                                  "bg-green-500"
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${
                              isExhausted ? "text-red-600" : "text-slate-600"
                            }`}>
                              {invite.usedCount}/{invite.maxUses}
                            </span>
                          </div>

                          {invite.email && (
                            <span className="text-xs text-slate-500 bg-blue-50 px-2 py-0.5 rounded-full">
                              🔒 {invite.email}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                          <span>Создан {new Date(invite.createdAt).toLocaleDateString("ru")}</span>
                          {invite.expiresAt && (
                            <span className={`flex items-center gap-1 ${
                              isExpired ? "text-red-500" : "text-slate-400"
                            }`}>
                              <Clock className="h-3 w-3" />
                              {isExpired ? "Истёк" : "Истекает"} {new Date(invite.expiresAt).toLocaleDateString("ru")}
                            </span>
                          )}
                          <span className="text-slate-300">•</span>
                          <span>от {invite.createdBy.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteLink(invite.code, invite.id)}
                          className="text-slate-600"
                          disabled={!isActive}
                          title={isActive ? "Копировать ссылку" : "Код неактивен"}
                        >
                          {copiedId === invite.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteInvite(invite.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
