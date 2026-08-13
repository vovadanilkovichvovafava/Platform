"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Loader2, Plus, Trash2, Copy, Check, Ticket, FileText, Users, BarChart3, AlertTriangle, CheckCircle, Clock, Ban, ChevronDown, X, Map, Tag, Search, Pencil } from "lucide-react"
import Link from "next/link"
import { TAG_COLOR_CLASSES } from "@/components/student-tags-badges"
import { COLOR_OPTIONS } from "@/components/tag-assign-dropdown"

interface Trail {
  id: string
  title: string
  slug: string
}

interface TagOption {
  id: string
  name: string
  color: string
}

interface Invite {
  id: string
  code: string
  email: string | null
  role: string
  maxUses: number
  usedCount: number
  expiresAt: string | null
  createdAt: string
  createdBy: { name: string; email: string }
  selectedTrails?: Trail[]
  selectedTags?: TagOption[]
}

// Role options for invite creation
const ROLE_OPTIONS = [
  { value: "STUDENT", label: "Студент" },
  { value: "TEACHER", label: "Преподаватель" },
  { value: "HR", label: "HR" },
  { value: "CO_ADMIN", label: "Со-админ" },
  { value: "ADMIN", label: "Админ" },
] as const

// Role badge styles
const ROLE_BADGE_STYLES: Record<string, string> = {
  STUDENT: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  TEACHER: "bg-blue-100 dark:bg-blue-950 text-blue-700",
  HR: "bg-amber-100 dark:bg-amber-950 text-amber-700",
  CO_ADMIN: "bg-purple-100 dark:bg-purple-950 text-purple-700",
  ADMIN: "bg-red-100 dark:bg-red-950 text-red-700",
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Студент",
  TEACHER: "Преподаватель",
  HR: "HR",
  CO_ADMIN: "Со-админ",
  ADMIN: "Админ",
}

// Cleanup period options for auto-deletion of exhausted invites
const CLEANUP_PERIOD_OPTIONS = [
  { value: "10m", label: "10 минут" },
  { value: "1h", label: "1 час" },
  { value: "1d", label: "1 сутки" },
] as const

const CLEANUP_PERIOD_STORAGE_KEY = "invites_cleanup_period"

export default function AdminInvitesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [invites, setInvites] = useState<Invite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  // Available trails for selection
  const [availableTrails, setAvailableTrails] = useState<Trail[]>([])
  const [selectedTrailIds, setSelectedTrailIds] = useState<string[]>([])
  const [isTrailDropdownOpen, setIsTrailDropdownOpen] = useState(false)
  const trailDropdownRef = useRef<HTMLDivElement>(null)

  // Available tags for selection
  const [availableTags, setAvailableTags] = useState<TagOption[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false)
  const tagDropdownRef = useRef<HTMLDivElement>(null)

  // Tag CRUD state
  const [tagSearch, setTagSearch] = useState("")
  const [newTagColor, setNewTagColor] = useState("gray")
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editTagName, setEditTagName] = useState("")
  const [editTagColor, setEditTagColor] = useState("gray")
  const [confirmDeleteTagId, setConfirmDeleteTagId] = useState<string | null>(null)

  // Role selection
  const [selectedRole, setSelectedRole] = useState("STUDENT")

  const [newInvite, setNewInvite] = useState({
    code: "",
    email: "",
    maxUses: 1,
    expiresAt: "",
  })

  // Cleanup period for auto-deletion (default: 1 day)
  const [cleanupPeriod, setCleanupPeriod] = useState<string>("1d")

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

  // Initialize cleanup period from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(CLEANUP_PERIOD_STORAGE_KEY)
    if (saved && CLEANUP_PERIOD_OPTIONS.some(opt => opt.value === saved)) {
      setCleanupPeriod(saved)
    }
  }, [])

  // Fetch available trails on mount
  useEffect(() => {
    const fetchTrails = async () => {
      try {
        const res = await fetch("/api/admin/trails")
        if (res.ok) {
          const data = await res.json()
          // Map to simplified trail objects
          setAvailableTrails(data.map((t: { id: string; title: string; slug: string }) => ({
            id: t.id,
            title: t.title,
            slug: t.slug,
          })))
        }
      } catch (error) {
        console.error("Error fetching trails:", error)
      }
    }

    if (session?.user?.role === "ADMIN" || session?.user?.role === "CO_ADMIN" || session?.user?.role === "HR") {
      fetchTrails()
    }
  }, [session])

  // Fetch available tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch("/api/admin/student-tags")
        if (res.ok) {
          const data = await res.json()
          setAvailableTags(data.map((t: { id: string; name: string; color: string }) => ({
            id: t.id,
            name: t.name,
            color: t.color,
          })))
        }
      } catch (error) {
        console.error("Error fetching tags:", error)
      }
    }

    if (session?.user?.role === "ADMIN" || session?.user?.role === "CO_ADMIN" || session?.user?.role === "HR") {
      fetchTags()
    }
  }, [session])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (trailDropdownRef.current && !trailDropdownRef.current.contains(event.target as Node)) {
        setIsTrailDropdownOpen(false)
      }
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Toggle trail selection
  const toggleTrailSelection = (trailId: string) => {
    setSelectedTrailIds((prev) =>
      prev.includes(trailId)
        ? prev.filter((id) => id !== trailId)
        : [...prev, trailId]
    )
  }

  // Remove trail from selection
  const removeTrail = (trailId: string) => {
    setSelectedTrailIds((prev) => prev.filter((id) => id !== trailId))
  }

  // Toggle tag selection
  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  // Remove tag from selection
  const removeTag = (tagId: string) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId))
  }

  // Create new tag
  const handleCreateTag = async (name: string, color: string) => {
    try {
      const res = await fetch("/api/admin/student-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      })
      const data = await res.json()
      if (res.ok) {
        setAvailableTags((prev) => [...prev, { id: data.id, name: data.name, color: data.color }])
        setTagSearch("")
        setNewTagColor("gray")
        showToast("Тег создан", "success")
      } else if (data.tag) {
        showToast("Тег с таким именем уже существует", "error")
      } else {
        showToast(data.error || "Ошибка создания тега", "error")
      }
    } catch {
      showToast("Ошибка создания тега", "error")
    }
  }

  // Edit tag
  const handleEditTag = async () => {
    if (!editingTagId || !editTagName.trim()) return
    try {
      const res = await fetch("/api/admin/student-tags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingTagId, name: editTagName.trim(), color: editTagColor }),
      })
      if (!res.ok) {
        const data = await res.json()
        showToast(data.error || "Ошибка редактирования тега", "error")
        return
      }
      const updated = await res.json()
      setAvailableTags((prev) => prev.map((t) => (t.id === editingTagId ? { ...t, name: updated.name, color: updated.color } : t)))
      setEditingTagId(null)
      showToast("Тег обновлён", "success")
    } catch {
      showToast("Ошибка редактирования тега", "error")
    }
  }

  // Delete tag
  const handleDeleteTag = async (tagId: string) => {
    try {
      const res = await fetch(`/api/admin/student-tags?id=${tagId}`, { method: "DELETE" })
      if (!res.ok) {
        showToast("Ошибка удаления тега", "error")
        return
      }
      setAvailableTags((prev) => prev.filter((t) => t.id !== tagId))
      setSelectedTagIds((prev) => prev.filter((id) => id !== tagId))
      setConfirmDeleteTagId(null)
      showToast("Тег удалён", "success")
    } catch {
      showToast("Ошибка удаления тега", "error")
    }
  }

  const startEditTag = (tag: TagOption) => {
    setEditingTagId(tag.id)
    setEditTagName(tag.name)
    setEditTagColor(tag.color)
    setConfirmDeleteTagId(null)
  }

  const cancelEditTag = () => {
    setEditingTagId(null)
    setEditTagName("")
    setEditTagColor("gray")
  }

  useEffect(() => {
    if (status === "loading") return

    // Allow ADMIN, CO_ADMIN, and HR
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "CO_ADMIN" && session.user.role !== "HR")) {
      router.push("/")
      return
    }

    fetchInvites()
  }, [session, status, router, cleanupPeriod])

  const fetchInvites = async () => {
    try {
      // Pass cleanup period to trigger opportunistic cleanup on server
      const res = await fetch(`/api/invites?cleanupPeriod=${cleanupPeriod}`)
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

  // Handle cleanup period change
  const handleCleanupPeriodChange = (newPeriod: string) => {
    setCleanupPeriod(newPeriod)
    localStorage.setItem(CLEANUP_PERIOD_STORAGE_KEY, newPeriod)
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
          trailIds: selectedTrailIds,
          tagIds: selectedTagIds,
          role: selectedRole,
        }),
      })

      if (res.ok) {
        setNewInvite({ code: "", email: "", maxUses: 1, expiresAt: "" })
        setSelectedTrailIds([]) // Clear selected trails
        setSelectedTagIds([]) // Clear selected tags
        setSelectedRole("STUDENT") // Reset role
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

  // Allow ADMIN, CO_ADMIN, and HR
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "CO_ADMIN" && session.user.role !== "HR")) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
              <Ticket className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Управление приглашениями</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Создавайте и управляйте кодами приглашений</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session.user.role !== "HR" && (
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Users className="h-4 w-4" />
                Пользователи
              </Link>
            )}
            {session.user.role !== "HR" && (
              <Link
                href="/admin/content"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <FileText className="h-4 w-4" />
                Контент
              </Link>
            )}
            <Link
              href="/admin/analytics"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Аналитика
            </Link>
          </div>
        </div>

        {/* Statistics */}
        {invites.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{invites.length}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Всего кодов</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-2xl font-bold text-green-600">
                {invites.filter(i => {
                  const isExpired = i.expiresAt && new Date(i.expiresAt) < new Date()
                  return !isExpired && i.usedCount < i.maxUses
                }).length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Активных</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-2xl font-bold text-blue-600">
                {invites.reduce((sum, i) => sum + i.usedCount, 0)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Использовано</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-2xl font-bold text-slate-400 dark:text-slate-500">
                {invites.filter(i => i.usedCount >= i.maxUses).length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Исчерпано</div>
            </div>
          </div>
        )}

        {/* Create New Invite */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Создать приглашение</h2>
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

            {/* Role Select */}
            <div className="space-y-2">
              <Label htmlFor="role">Роль при регистрации</Label>
              <div className="relative">
                <select
                  id="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {ROLE_OPTIONS.filter((opt) => {
                    // CO_ADMIN can only create STUDENT and TEACHER invites
                    if (session?.user?.role === "CO_ADMIN" && (opt.value === "CO_ADMIN" || opt.value === "ADMIN")) {
                      return false
                    }
                    // HR can only create STUDENT and HR invites
                    if (session?.user?.role === "HR" && opt.value !== "STUDENT" && opt.value !== "HR") {
                      return false
                    }
                    // Only ADMIN can create CO_ADMIN and ADMIN invites
                    if (session?.user?.role !== "ADMIN" && (opt.value === "CO_ADMIN" || opt.value === "ADMIN")) {
                      return false
                    }
                    return true
                  }).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Роль, которая будет назначена пользователю при регистрации
              </p>
            </div>

            {/* Trail Multi-Select */}
            {availableTrails.length > 0 && (
              <div className="space-y-2">
                <Label>Доступ к трейлам (опционально)</Label>
                <div ref={trailDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTrailDropdownOpen(!isTrailDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <span className="flex items-center gap-2">
                      <Map className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      {selectedTrailIds.length === 0
                        ? "Выберите трейлы..."
                        : `Выбрано: ${selectedTrailIds.length}`}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform ${isTrailDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isTrailDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {availableTrails.map((trail) => {
                        const isSelected = selectedTrailIds.includes(trail.id)
                        return (
                          <label
                            key={trail.id}
                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                              isSelected ? "bg-orange-50 dark:bg-orange-950" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleTrailSelection(trail.id)}
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{trail.title}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Selected trails chips */}
                {selectedTrailIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTrailIds.map((trailId) => {
                      const trail = availableTrails.find((t) => t.id === trailId)
                      if (!trail) return null
                      return (
                        <span
                          key={trailId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-950 text-orange-700 rounded-md text-xs"
                        >
                          {trail.title}
                          <button
                            type="button"
                            onClick={() => removeTrail(trailId)}
                            className="hover:text-orange-900 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Студент получит доступ к выбранным трейлам при регистрации по приглашению
                </p>
              </div>
            )}

            {/* Tag Multi-Select with CRUD */}
            <div className="space-y-2">
              <Label>Теги для студента (опционально)</Label>
              <div ref={tagDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsTagDropdownOpen(!isTagDropdownOpen)
                    setTagSearch("")
                    setEditingTagId(null)
                    setConfirmDeleteTagId(null)
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <span className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    {selectedTagIds.length === 0
                      ? "Выберите теги..."
                      : `Выбрано: ${selectedTagIds.length}`}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform ${isTagDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isTagDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-80 overflow-auto">
                    {/* Search */}
                    <div className="p-2 border-b sticky top-0 bg-white dark:bg-slate-800 z-10">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 dark:text-slate-500" />
                        <input
                          type="text"
                          value={tagSearch}
                          onChange={(e) => setTagSearch(e.target.value)}
                          placeholder="Поиск или создать тег..."
                          className="w-full py-1 pl-7 pr-2 text-xs border rounded"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {/* Tags list */}
                    {(() => {
                      const filtered = availableTags.filter((t) =>
                        tagSearch ? t.name.toLowerCase().includes(tagSearch.toLowerCase()) : true
                      )
                      const hasExactMatch = availableTags.some(
                        (t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase()
                      )
                      const showCreate = tagSearch.trim().length > 0 && !hasExactMatch

                      return (
                        <>
                          {filtered.length === 0 && !showCreate ? (
                            <div className="p-3 text-gray-500 dark:text-slate-400 text-xs text-center">
                              {tagSearch ? "Не найдено" : "Нет тегов"}
                            </div>
                          ) : (
                            filtered.map((tag) => {
                              // Edit mode
                              if (editingTagId === tag.id) {
                                return (
                                  <div key={tag.id} className="px-3 py-2 border-b last:border-b-0 bg-gray-50 dark:bg-slate-900">
                                    <input
                                      type="text"
                                      value={editTagName}
                                      onChange={(e) => setEditTagName(e.target.value)}
                                      className="w-full py-1 px-2 text-xs border rounded mb-1.5"
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleEditTag()
                                        if (e.key === "Escape") cancelEditTag()
                                      }}
                                    />
                                    <div className="flex items-center gap-1 mb-1.5">
                                      {COLOR_OPTIONS.map((c) => (
                                        <button
                                          key={c.value}
                                          type="button"
                                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditTagColor(c.value) }}
                                          className={`w-4 h-4 rounded-full ${c.dot} ${
                                            editTagColor === c.value
                                              ? "ring-2 ring-offset-1 ring-gray-400"
                                              : "hover:ring-1 hover:ring-offset-1 hover:ring-gray-300"
                                          }`}
                                          title={c.label}
                                        />
                                      ))}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditTag() }}
                                        className="flex items-center gap-0.5 px-2 py-0.5 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                                      >
                                        <Check className="h-3 w-3" /> Сохранить
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); cancelEditTag() }}
                                        className="flex items-center gap-0.5 px-2 py-0.5 text-xs bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600"
                                      >
                                        <X className="h-3 w-3" /> Отмена
                                      </button>
                                    </div>
                                  </div>
                                )
                              }

                              // Confirm delete mode
                              if (confirmDeleteTagId === tag.id) {
                                return (
                                  <div key={tag.id} className="px-3 py-2 border-b last:border-b-0 bg-red-50 dark:bg-red-950">
                                    <p className="text-xs text-red-700 mb-1.5">
                                      Удалить тег &laquo;{tag.name}&raquo;? Он будет убран у всех студентов.
                                    </p>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteTag(tag.id) }}
                                        className="flex items-center gap-0.5 px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                      >
                                        <Trash2 className="h-3 w-3" /> Удалить
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteTagId(null) }}
                                        className="flex items-center gap-0.5 px-2 py-0.5 text-xs bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600"
                                      >
                                        Отмена
                                      </button>
                                    </div>
                                  </div>
                                )
                              }

                              // Normal tag row with checkbox + edit/delete
                              const isSelected = selectedTagIds.includes(tag.id)
                              return (
                                <div
                                  key={tag.id}
                                  className={`flex items-center gap-2 px-3 py-2 border-b last:border-b-0 transition-colors ${
                                    isSelected ? "bg-orange-50 dark:bg-orange-950" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                                  }`}
                                >
                                  <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleTagSelection(tag.id)}
                                    />
                                    <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
                                      COLOR_OPTIONS.find((c) => c.value === tag.color)?.dot || "bg-gray-400"
                                    }`} />
                                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{tag.name}</span>
                                  </label>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEditTag(tag) }}
                                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 hover:text-gray-600"
                                      title="Редактировать тег"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteTagId(tag.id); setEditingTagId(null) }}
                                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950 text-gray-400 dark:text-slate-500 hover:text-red-500"
                                      title="Удалить тег"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })
                          )}

                          {/* Create new tag */}
                          {showCreate && (
                            <div className="border-t">
                              <div className="px-3 py-2">
                                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1.5">Создать новый тег:</p>
                                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                  {COLOR_OPTIONS.map((c) => (
                                    <button
                                      key={c.value}
                                      type="button"
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNewTagColor(c.value) }}
                                      className={`w-5 h-5 rounded-full ${c.dot} ${
                                        newTagColor === c.value
                                          ? "ring-2 ring-offset-1 ring-gray-400"
                                          : "hover:ring-1 hover:ring-offset-1 hover:ring-gray-300"
                                      }`}
                                      title={c.label}
                                    />
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleCreateTag(tagSearch.trim(), newTagColor)
                                  }}
                                  className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium hover:opacity-80 transition-opacity border ${
                                    TAG_COLOR_CLASSES[newTagColor] || TAG_COLOR_CLASSES.gray
                                  }`}
                                >
                                  + Создать &ldquo;{tagSearch.trim()}&rdquo;
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Selected tags chips */}
              {selectedTagIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTagIds.map((tagId) => {
                    const tag = availableTags.find((t) => t.id === tagId)
                    if (!tag) return null
                    return (
                      <span
                        key={tagId}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${TAG_COLOR_CLASSES[tag.color] || TAG_COLOR_CLASSES.gray}`}
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => removeTag(tagId)}
                          className="hover:opacity-70 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Студент получит выбранные теги при регистрации по приглашению
              </p>
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Все приглашения ({invites.length})</h2>

            {/* Cleanup Period Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Авто-удаление:</span>
              <div className="relative">
                <select
                  value={cleanupPeriod}
                  onChange={(e) => handleCleanupPeriodChange(e.target.value)}
                  className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 pr-8 text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  title="Исчерпанные приглашения старше этого периода удаляются автоматически"
                >
                  {CLEANUP_PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {invites.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              Приглашений пока нет
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {invites.map((invite) => {
                const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date()
                const isExhausted = invite.usedCount >= invite.maxUses
                const isActive = !isExpired && !isExhausted
                const usagePercent = Math.round((invite.usedCount / invite.maxUses) * 100)

                return (
                  <div key={invite.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    !isActive ? "bg-slate-50/50 dark:bg-slate-800/50" : ""
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <code className={`px-3 py-1 rounded-lg font-mono text-sm font-semibold ${
                            isActive ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                          }`}>
                            {invite.code}
                          </code>

                          {/* Status Badge */}
                          {isExpired ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400">
                              <Clock className="h-3 w-3" />
                              Истёк
                            </span>
                          ) : isExhausted ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-600">
                              <Ban className="h-3 w-3" />
                              Исчерпан
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Активен
                            </span>
                          )}

                          {/* Usage Progress */}
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
                              isExhausted ? "text-red-600" : "text-slate-600 dark:text-slate-400"
                            }`}>
                              {invite.usedCount}/{invite.maxUses}
                            </span>
                          </div>

                          {/* Role Badge */}
                          {invite.role && invite.role !== "STUDENT" && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE_STYLES[invite.role] || ROLE_BADGE_STYLES.STUDENT}`}>
                              {ROLE_LABELS[invite.role] || invite.role}
                            </span>
                          )}

                          {invite.email && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                              🔒 {invite.email}
                            </span>
                          )}
                        </div>

                        {/* Selected Trails Display */}
                        {invite.selectedTrails && invite.selectedTrails.length > 0 && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <Map className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                            {invite.selectedTrails.map((trail) => (
                              <span
                                key={trail.id}
                                className="text-xs px-2 py-0.5 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 rounded-md"
                              >
                                {trail.title}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Selected Tags Display */}
                        {invite.selectedTags && invite.selectedTags.length > 0 && (
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <Tag className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                            {invite.selectedTags.map((tag) => (
                              <span
                                key={tag.id}
                                className={`text-xs px-2 py-0.5 rounded-md border ${TAG_COLOR_CLASSES[tag.color] || TAG_COLOR_CLASSES.gray}`}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                          <span>Создан {new Date(invite.createdAt).toLocaleDateString("ru")}</span>
                          {invite.expiresAt && (
                            <span className={`flex items-center gap-1 ${
                              isExpired ? "text-red-500" : "text-slate-400 dark:text-slate-500"
                            }`}>
                              <Clock className="h-3 w-3" />
                              {isExpired ? "Истёк" : "Истекает"} {new Date(invite.expiresAt).toLocaleDateString("ru")}
                            </span>
                          )}
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span>от {invite.createdBy.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteLink(invite.code, invite.id)}
                          className="text-slate-600 dark:text-slate-400"
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
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
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
