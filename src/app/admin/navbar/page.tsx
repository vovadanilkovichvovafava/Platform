"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import {
  Loader2,
  Plus,
  Trash2,
  Edit,
  Check,
  Menu,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Users,
  Ticket,
  BarChart3,
  // Icons for navbar items
  Flame,
  BookOpen,
  ClipboardCheck,
  Trophy,
  Settings,
  FolderKanban,
  Shield,
  User,
  Award,
  Home,
  Star,
  Heart,
  Bell,
  Search,
  X,
  ArrowRight,
  ExternalLink,
  FileText,
  Calendar,
  Clock,
  Target,
  Zap,
  Code,
  Database,
  Globe,
  Lock,
  Unlock,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

// Available icons for navbar items
const ICON_MAP: Record<string, LucideIcon> = {
  Flame, BookOpen, ClipboardCheck, Trophy, Settings,
  FolderKanban, Shield, BarChart3, User, Award,
  Home, Star, Heart, Bell, Search, Menu, Plus,
  Check, X, ArrowRight, ExternalLink, FileText,
  Users, Calendar, Clock, Target, Zap, Code,
  Database, Globe, Lock, Unlock, Edit, Trash2,
}

const ICON_OPTIONS = Object.keys(ICON_MAP)

// Role options
const ROLE_OPTIONS = [
  { value: "STUDENT", label: "Студент" },
  { value: "TEACHER", label: "Учитель" },
  { value: "CO_ADMIN", label: "Со-админ" },
  { value: "ADMIN", label: "Админ" },
]

interface NavbarItemDTO {
  id: string
  label: string
  href: string
  icon: string
  order: number
  visibleTo: string[]
}

interface NavbarPresetListDTO {
  id: string
  name: string
  isActive: boolean
  itemsCount: number
  createdAt: string
  updatedAt: string
}

interface NavbarPresetDetailDTO {
  id: string
  name: string
  isActive: boolean
  items: NavbarItemDTO[]
  createdAt: string
  updatedAt: string
}

// Form item type for editing
interface FormItem {
  id?: string
  label: string
  href: string
  icon: string
  order: number
  visibleTo: string[]
}

// Default items for new preset
const DEFAULT_ITEMS: FormItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "Flame", order: 0, visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { label: "Trails", href: "/trails", icon: "BookOpen", order: 1, visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { label: "Мои работы", href: "/my-work", icon: "ClipboardCheck", order: 2, visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { label: "Лидерборд", href: "/leaderboard", icon: "Trophy", order: 3, visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
]

export default function NavbarPresetsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const [presets, setPresets] = useState<NavbarPresetListDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<NavbarPresetDetailDTO | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formItems, setFormItems] = useState<FormItem[]>([])
  const [formError, setFormError] = useState("")

  // Fetch presets
  const fetchPresets = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/admin/navbar-presets")
      if (res.ok) {
        const data = await res.json()
        setPresets(data)
      } else {
        showToast("Ошибка загрузки пресетов", "error")
      }
    } catch {
      showToast("Ошибка сети", "error")
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (status === "loading") return

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "CO_ADMIN")) {
      router.push("/")
      return
    }

    fetchPresets()
  }, [session, status, router, fetchPresets])

  // Open dialog for new preset
  const handleNewPreset = () => {
    setEditingPreset(null)
    setFormName("")
    setFormItems([...DEFAULT_ITEMS])
    setFormError("")
    setIsDialogOpen(true)
  }

  // Open dialog for editing preset
  const handleEditPreset = async (presetId: string) => {
    try {
      const res = await fetch(`/api/admin/navbar-presets/${presetId}`)
      if (res.ok) {
        const data: NavbarPresetDetailDTO = await res.json()
        setEditingPreset(data)
        setFormName(data.name)
        setFormItems(data.items.map((item) => ({
          id: item.id,
          label: item.label,
          href: item.href,
          icon: item.icon,
          order: item.order,
          visibleTo: item.visibleTo,
        })))
        setFormError("")
        setIsDialogOpen(true)
      } else {
        showToast("Ошибка загрузки пресета", "error")
      }
    } catch {
      showToast("Ошибка сети", "error")
    }
  }

  // Save preset (create or update)
  const handleSavePreset = async () => {
    // Validate
    if (!formName.trim()) {
      setFormError("Введите название пресета")
      return
    }
    if (formItems.length === 0) {
      setFormError("Добавьте хотя бы один элемент")
      return
    }

    // Check for empty labels/hrefs
    for (const item of formItems) {
      if (!item.label.trim()) {
        setFormError("Все элементы должны иметь название")
        return
      }
      if (!item.href.trim() || !item.href.startsWith("/")) {
        setFormError("Все элементы должны иметь путь, начинающийся с /")
        return
      }
      if (item.visibleTo.length === 0) {
        setFormError("Выберите хотя бы одну роль для каждого элемента")
        return
      }
    }

    // Check for duplicates
    const labels = formItems.map((i) => i.label)
    if (new Set(labels).size !== labels.length) {
      setFormError("Названия элементов не должны повторяться")
      return
    }
    const hrefs = formItems.map((i) => i.href)
    if (new Set(hrefs).size !== hrefs.length) {
      setFormError("Пути элементов не должны повторяться")
      return
    }

    setFormError("")
    setIsSaving(true)

    try {
      const payload = {
        name: formName.trim(),
        items: formItems.map((item, index) => ({
          label: item.label.trim(),
          href: item.href.trim(),
          icon: item.icon,
          order: index,
          visibleTo: item.visibleTo,
        })),
      }

      const url = editingPreset
        ? `/api/admin/navbar-presets/${editingPreset.id}`
        : "/api/admin/navbar-presets"
      const method = editingPreset ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        showToast(editingPreset ? "Пресет обновлён" : "Пресет создан", "success")
        setIsDialogOpen(false)
        fetchPresets()
      } else {
        const data = await res.json()
        setFormError(data.error || "Ошибка сохранения")
      }
    } catch {
      setFormError("Ошибка сети")
    } finally {
      setIsSaving(false)
    }
  }

  // Activate preset
  const handleActivatePreset = async (presetId: string) => {
    try {
      const res = await fetch(`/api/admin/navbar-presets/${presetId}`, {
        method: "PATCH",
      })

      if (res.ok) {
        showToast("Пресет активирован", "success")
        fetchPresets()
      } else {
        const data = await res.json()
        showToast(data.error || "Ошибка активации", "error")
      }
    } catch {
      showToast("Ошибка сети", "error")
    }
  }

  // Delete preset
  const handleDeletePreset = async (presetId: string, presetName: string) => {
    const confirmed = await confirm({
      title: "Удалить пресет?",
      message: `Вы уверены, что хотите удалить пресет "${presetName}"?`,
      confirmText: "Удалить",
      variant: "danger",
    })

    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/navbar-presets/${presetId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        showToast("Пресет удалён", "success")
        fetchPresets()
      } else {
        const data = await res.json()
        showToast(data.error || "Ошибка удаления", "error")
      }
    } catch {
      showToast("Ошибка сети", "error")
    }
  }

  // Add new item to form
  const handleAddItem = () => {
    setFormItems([
      ...formItems,
      {
        label: "",
        href: "/",
        icon: "Home",
        order: formItems.length,
        visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"],
      },
    ])
  }

  // Remove item from form
  const handleRemoveItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index))
  }

  // Move item up
  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newItems = [...formItems]
    ;[newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]]
    setFormItems(newItems)
  }

  // Move item down
  const handleMoveDown = (index: number) => {
    if (index === formItems.length - 1) return
    const newItems = [...formItems]
    ;[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]]
    setFormItems(newItems)
  }

  // Update item field
  const handleItemChange = (index: number, field: keyof FormItem, value: string | string[]) => {
    const newItems = [...formItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setFormItems(newItems)
  }

  // Toggle role for item
  const handleToggleRole = (index: number, role: string) => {
    const item = formItems[index]
    const newVisibleTo = item.visibleTo.includes(role)
      ? item.visibleTo.filter((r) => r !== role)
      : [...item.visibleTo, role]
    handleItemChange(index, "visibleTo", newVisibleTo)
  }

  // Render icon
  const renderIcon = (iconName: string, className = "h-4 w-4") => {
    const Icon = ICON_MAP[iconName]
    return Icon ? <Icon className={className} /> : null
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "CO_ADMIN")) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
              <Menu className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Настройки Navbar</h1>
              <p className="text-slate-500 text-sm">Управляйте пресетами навигации</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/invites"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Ticket className="h-4 w-4" />
              Приглашения
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Users className="h-4 w-4" />
              Пользователи
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

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <Button onClick={handleNewPreset} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            Создать пресет
          </Button>
          <Button onClick={fetchPresets} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          <p className="font-medium mb-1">Как это работает:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Создайте пресет с нужными элементами навигации</li>
            <li>Активируйте пресет — он сразу применится для всех пользователей</li>
            <li>Если нет активного пресета, используется стандартный navbar</li>
            <li>Для каждого элемента можно настроить видимость по ролям</li>
          </ul>
        </div>

        {/* Presets List */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Пресеты ({presets.length})
            </h2>
          </div>

          {presets.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Menu className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>Пресетов пока нет</p>
              <p className="text-sm mt-2">Создайте первый пресет для настройки навигации</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className={`p-4 hover:bg-slate-50 transition-colors ${
                    preset.isActive ? "bg-green-50/50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-900">{preset.name}</span>
                        {preset.isActive && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                            <Check className="h-3 w-3" />
                            Активен
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {preset.itemsCount} элементов
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Обновлён: {new Date(preset.updatedAt).toLocaleDateString("ru")}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!preset.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivatePreset(preset.id)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Активировать
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPreset(preset.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!preset.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePreset(preset.id, preset.name)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle>
                {editingPreset ? "Редактировать пресет" : "Новый пресет"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Preset Name */}
              <div className="space-y-2">
                <Label htmlFor="preset-name">Название пресета</Label>
                <Input
                  id="preset-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Например: Стандартный"
                />
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Элементы навигации</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить
                  </Button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {formItems.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-3"
                    >
                      {/* Row 1: Order controls, Label, Href */}
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === formItems.length - 1}
                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>

                        <Input
                          value={item.label}
                          onChange={(e) => handleItemChange(index, "label", e.target.value)}
                          placeholder="Название"
                          className="flex-1"
                        />
                        <Input
                          value={item.href}
                          onChange={(e) => handleItemChange(index, "href", e.target.value)}
                          placeholder="/path"
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 rounded hover:bg-red-100 text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Row 2: Icon selector and Role checkboxes */}
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-slate-500 whitespace-nowrap">Иконка:</Label>
                          <select
                            value={item.icon}
                            onChange={(e) => handleItemChange(index, "icon", e.target.value)}
                            className="text-sm border border-slate-200 rounded px-2 py-1"
                          >
                            {ICON_OPTIONS.map((iconName) => (
                              <option key={iconName} value={iconName}>
                                {iconName}
                              </option>
                            ))}
                          </select>
                          <span className="p-1 bg-white border border-slate-200 rounded">
                            {renderIcon(item.icon)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <Label className="text-xs text-slate-500 whitespace-nowrap">Видно:</Label>
                          {ROLE_OPTIONS.map((role) => (
                            <label key={role.value} className="flex items-center gap-1 text-xs">
                              <Checkbox
                                checked={item.visibleTo.includes(role.value)}
                                onCheckedChange={() => handleToggleRole(index, role.value)}
                              />
                              {role.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {formItems.length === 0 && (
                  <div className="p-4 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    Нет элементов. Нажмите &ldquo;Добавить&rdquo; для создания.
                  </div>
                )}
              </div>

              {/* Error message */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button
                onClick={handleSavePreset}
                disabled={isSaving}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingPreset ? "Сохранить" : "Создать"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
