"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import {
  ChevronDown, Edit, Plus, Check, X, GripVertical, Trash2, Save,
  Flame, BookOpen, ClipboardCheck, Trophy, Settings, FolderKanban,
  Shield, BarChart3, User, Award, Home, Star, Heart, Bell, Search,
  Menu, ArrowRight, ExternalLink, FileText, Users, Calendar, Clock,
  Target, Zap, Code, Database, Globe, Lock, Unlock, GraduationCap,
  History, UserCheck, BookMarked, Layers, PenTool, Eye, MessageSquare,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { FEATURE_FLAGS } from "@/lib/feature-flags"

// Icon map
const ICON_MAP: Record<string, LucideIcon> = {
  Flame, BookOpen, ClipboardCheck, Trophy, Settings,
  FolderKanban, Shield, BarChart3, User, Award,
  Home, Star, Heart, Bell, Search, Menu, Plus,
  Check, X, ArrowRight, ExternalLink, FileText,
  Users, Calendar, Clock, Target, Zap, Code,
  Database, Globe, Lock, Unlock, Edit, Trash2,
  GraduationCap, History, UserCheck, BookMarked,
  Layers, PenTool, Eye, MessageSquare,
}

// Navbar item type
export interface NavbarItemDTO {
  id: string
  label: string
  href: string
  icon: string
  order: number
  visibleTo: string[]
}

// Preset type for list
interface PresetListItem {
  id: string
  name: string
  isActive: boolean
  itemsCount: number
}

// Available menu items that can be added - comprehensive list of all useful pages
const ALL_AVAILABLE_ITEMS: Omit<NavbarItemDTO, "id" | "order">[] = [
  // Student pages
  { label: "Dashboard", href: "/dashboard", icon: "Flame", visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { label: "Trails", href: "/trails", icon: "BookOpen", visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { label: "Мои работы", href: "/my-work", icon: "ClipboardCheck", visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { label: "Лидерборд", href: "/leaderboard", icon: "Trophy", visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { label: "Сертификаты", href: "/certificates", icon: "Award", visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { label: "Мой профиль", href: "/profile", icon: "User", visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { label: "Контент", href: "/content", icon: "FolderKanban", visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { label: "Главная", href: "/", icon: "Home", visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },

  // Teacher pages
  { label: "Панель эксперта", href: "/teacher", icon: "Settings", visibleTo: ["TEACHER", "CO_ADMIN", "ADMIN"] },
  { label: "Аналитика эксперта", href: "/teacher/analytics", icon: "BarChart3", visibleTo: ["TEACHER", "CO_ADMIN", "ADMIN"] },
  { label: "Контент эксперта", href: "/teacher/content", icon: "Layers", visibleTo: ["TEACHER", "CO_ADMIN", "ADMIN"] },
  { label: "Статистика эксперта", href: "/teacher/stats", icon: "Target", visibleTo: ["TEACHER", "CO_ADMIN", "ADMIN"] },
  { label: "Мои студенты", href: "/teacher/students", icon: "GraduationCap", visibleTo: ["TEACHER", "CO_ADMIN", "ADMIN"] },

  // Admin pages
  { label: "Админ панель", href: "/admin/invites", icon: "Shield", visibleTo: ["CO_ADMIN", "ADMIN"] },
  { label: "Аналитика", href: "/admin/analytics", icon: "BarChart3", visibleTo: ["CO_ADMIN", "ADMIN"] },
  { label: "Пользователи", href: "/admin/users", icon: "Users", visibleTo: ["CO_ADMIN", "ADMIN"] },
  { label: "Приглашения", href: "/admin/invites", icon: "FileText", visibleTo: ["CO_ADMIN", "ADMIN"] },
  { label: "Эксперты", href: "/admin/access?tab=teachers", icon: "UserCheck", visibleTo: ["CO_ADMIN", "ADMIN"] },
  { label: "История", href: "/admin/history", icon: "History", visibleTo: ["CO_ADMIN", "ADMIN"] },
  { label: "Доступы", href: "/admin/access?tab=student-access", icon: "Lock", visibleTo: ["CO_ADMIN", "ADMIN"] },
  { label: "Админ доступы", href: "/admin/access?tab=admin-access", icon: "Unlock", visibleTo: ["ADMIN"] },
]

// Filter out items disabled by feature flags
const AVAILABLE_ITEMS = ALL_AVAILABLE_ITEMS.filter(
  (item) => item.href !== "/leaderboard" || FEATURE_FLAGS.LEADERBOARD_ENABLED
)

// Render icon
function NavIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name]
  return Icon ? <Icon className={className} /> : <Flame className={className} />
}

interface Props {
  userRole: string
  currentItems: NavbarItemDTO[]
  onItemsChange: (items: NavbarItemDTO[]) => void
}

export function NavbarPresetsEditor({ userRole, currentItems, onItemsChange }: Props) {
  const { showToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [presets, setPresets] = useState<PresetListItem[]>([])
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [editItems, setEditItems] = useState<NavbarItemDTO[]>([])
  const [newPresetName, setNewPresetName] = useState("")
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Mount state for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Only show for admins
  const isAdmin = userRole === "ADMIN" || userRole === "CO_ADMIN"

  // Fetch presets on mount
  const fetchPresets = useCallback(async () => {
    if (!isAdmin) return
    try {
      const res = await fetch("/api/admin/navbar-presets")
      if (res.ok) {
        const data = await res.json()
        setPresets(data)
        const active = data.find((p: PresetListItem) => p.isActive)
        setActivePresetId(active?.id || null)
      }
    } catch {
      // Silent fail
    }
  }, [isAdmin])

  useEffect(() => {
    if (isAdmin) {
      fetchPresets()
    }
  }, [isAdmin, fetchPresets])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (!isEditing) setIsOpen(false)
      }
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isEditing])

  // Start editing
  const handleStartEdit = () => {
    if (activePresetId === null || activePresetId === "default") {
      // Default preset - need to create new
      setIsCreatingNew(true)
      setEditItems([...currentItems])
    } else {
      setEditItems([...currentItems])
    }
    setIsEditing(true)
    setIsOpen(false)
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false)
    setIsCreatingNew(false)
    setNewPresetName("")
    setEditItems([])
  }

  // Save changes
  const handleSave = async () => {
    if (isCreatingNew && !newPresetName.trim()) {
      showToast("Введите название пресета", "error")
      return
    }

    setIsSaving(true)
    try {
      if (isCreatingNew) {
        // Create new preset
        const res = await fetch("/api/admin/navbar-presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newPresetName.trim(),
            items: editItems.map((item, idx) => ({
              label: item.label,
              href: item.href,
              icon: item.icon,
              order: idx,
              visibleTo: item.visibleTo,
            })),
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Ошибка создания")
        }

        const newPreset = await res.json()

        // Activate new preset
        await fetch(`/api/admin/navbar-presets/${newPreset.id}`, { method: "PATCH" })

        showToast("Пресет создан и активирован", "success")
      } else {
        // Update existing preset
        const res = await fetch(`/api/admin/navbar-presets/${activePresetId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: presets.find(p => p.id === activePresetId)?.name || "Preset",
            items: editItems.map((item, idx) => ({
              label: item.label,
              href: item.href,
              icon: item.icon,
              order: idx,
              visibleTo: item.visibleTo,
            })),
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Ошибка сохранения")
        }

        showToast("Пресет обновлён", "success")
      }

      // Refresh
      onItemsChange(editItems)
      fetchPresets()
      handleCancelEdit()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Ошибка", "error")
    } finally {
      setIsSaving(false)
    }
  }

  // Select preset
  const handleSelectPreset = async (presetId: string) => {
    if (presetId === "default") {
      // Deactivate all presets via API
      try {
        const res = await fetch("/api/admin/navbar-presets", { method: "PATCH" })
        if (res.ok) {
          showToast("Переключено на настройки по умолчанию", "success")
          setActivePresetId(null)
          setIsOpen(false)
          window.location.reload()
        } else {
          showToast("Ошибка при переключении", "error")
        }
      } catch {
        showToast("Ошибка при переключении", "error")
      }
      return
    }

    try {
      const res = await fetch(`/api/admin/navbar-presets/${presetId}`, { method: "PATCH" })
      if (res.ok) {
        showToast("Пресет активирован", "success")
        setActivePresetId(presetId)
        setIsOpen(false)
        // Reload to apply
        window.location.reload()
      }
    } catch {
      showToast("Ошибка активации", "error")
    }
  }

  // Delete preset
  const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent selecting the preset

    if (deletingPresetId) return // Already deleting

    setDeletingPresetId(presetId)
    try {
      const res = await fetch(`/api/admin/navbar-presets/${presetId}`, { method: "DELETE" })
      if (res.ok) {
        showToast("Пресет удалён", "success")
        fetchPresets()
      } else {
        const data = await res.json()
        showToast(data.error || "Ошибка удаления", "error")
      }
    } catch {
      showToast("Ошибка удаления", "error")
    } finally {
      setDeletingPresetId(null)
    }
  }

  // Create new preset (open dialog)
  const handleCreateNew = () => {
    setIsCreatingNew(true)
    setEditItems([...currentItems])
    setIsEditing(true)
    setIsOpen(false)
  }

  // Delete item
  const handleDeleteItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index))
  }

  // Add item
  const handleAddItem = (item: Omit<NavbarItemDTO, "id" | "order">) => {
    // Check if already exists
    if (editItems.some(i => i.href === item.href)) {
      showToast("Этот элемент уже добавлен", "error")
      return
    }

    const newItem: NavbarItemDTO = {
      ...item,
      id: `new-${Date.now()}`,
      order: editItems.length,
    }
    setEditItems([...editItems, newItem])
    setShowAddMenu(false)
  }

  // Drag handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newItems = [...editItems]
      const [dragged] = newItems.splice(draggedIndex, 1)
      newItems.splice(dragOverIndex, 0, dragged)
      setEditItems(newItems)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Filter items visible to user role
  const availableToAdd = AVAILABLE_ITEMS.filter(
    item => item.visibleTo.includes(userRole) && !editItems.some(e => e.href === item.href)
  )

  if (!isAdmin) return null

  // Edit mode UI - rendered via portal to escape header stacking context
  const editModal = isEditing && mounted ? createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-start justify-center pt-10 sm:pt-20 px-2 sm:px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-3 sm:p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                {isCreatingNew ? "Новый пресет" : "Редактирование navbar"}
              </h3>
              {isCreatingNew && (
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Название пресета..."
                  className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  autoFocus
                />
              )}
            </div>
            <button onClick={handleCancelEdit} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg ml-2 flex-shrink-0">
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
            </button>
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
            {editItems.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-slate-50 rounded-lg border transition-all ${
                  dragOverIndex === index ? "border-orange-400 bg-orange-50" : "border-transparent"
                } ${draggedIndex === index ? "opacity-50" : ""}`}
              >
                <GripVertical className="h-4 w-4 text-slate-400 cursor-grab flex-shrink-0" />
                <NavIcon name={item.icon} className="h-4 w-4 text-slate-600 flex-shrink-0" />
                <span className="flex-1 text-sm font-medium text-slate-700 truncate">{item.label}</span>
                <span className="text-xs text-slate-400 hidden sm:block">{item.href}</span>
                <button
                  onClick={() => handleDeleteItem(index)}
                  className="p-1 hover:bg-red-100 rounded text-red-500 flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {editItems.length === 0 && (
              <div className="text-center py-6 sm:py-8 text-slate-400 text-sm">
                Нет элементов. Добавьте из меню ниже.
              </div>
            )}
          </div>

          {/* Add button */}
          <div className="p-3 sm:p-4 border-t border-slate-200" ref={addMenuRef}>
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border border-dashed border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm"
              >
                <Plus className="h-4 w-4" />
                Добавить элемент
              </button>

              {showAddMenu && availableToAdd.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 sm:max-h-48 overflow-y-auto">
                  {availableToAdd.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => handleAddItem(item)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                    >
                      <NavIcon name={item.icon} className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span className="text-sm text-slate-700 truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              onClick={handleCancelEdit}
              className="px-3 sm:px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || (isCreatingNew && !newPresetName.trim())}
              className="px-3 sm:px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>Сохранение...</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Сохранить</span>
                  <span className="sm:hidden">OK</span>
                </>
              )}
            </button>
          </div>
      </div>
    </div>,
    document.body
  ) : null

  // Normal view - dropdown and edit button
  return (
    <>
      {editModal}
    <div className="flex items-center gap-1" ref={dropdownRef}>
      {/* Preset selector dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <Layers className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline max-w-[80px] truncate">
            {activePresetId ? presets.find(p => p.id === activePresetId)?.name || "Пресет" : "По умолчанию"}
          </span>
          <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-40 sm:w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
            {/* Default option */}
            <button
              onClick={() => handleSelectPreset("default")}
              className={`w-full flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-slate-50 ${
                !activePresetId ? "text-orange-600 bg-orange-50" : "text-slate-700"
              }`}
            >
              <Check className={`h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 ${!activePresetId ? "opacity-100" : "opacity-0"}`} />
              <span className="truncate">По умолчанию</span>
            </button>

            {presets.length > 0 && <div className="border-t border-slate-100" />}

            {/* Custom presets */}
            {presets.map((preset) => (
              <div
                key={preset.id}
                className={`flex items-center hover:bg-slate-50 ${
                  preset.isActive ? "text-orange-600 bg-orange-50" : "text-slate-700"
                }`}
              >
                <button
                  onClick={() => handleSelectPreset(preset.id)}
                  className="flex-1 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-left min-w-0"
                >
                  <Check className={`h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 ${preset.isActive ? "opacity-100" : "opacity-0"}`} />
                  <span className="truncate">{preset.name}</span>
                </button>
                {/* Delete button - only for non-active presets */}
                {!preset.isActive && (
                  <button
                    onClick={(e) => handleDeletePreset(preset.id, e)}
                    disabled={deletingPresetId === preset.id}
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded mr-0.5 sm:mr-1 disabled:opacity-50 flex-shrink-0"
                    title="Удалить пресет"
                  >
                    <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </button>
                )}
              </div>
            ))}

            <div className="border-t border-slate-100" />

            {/* Create new */}
            <button
              onClick={handleCreateNew}
              className="w-full flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-orange-600 hover:bg-orange-50"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="truncate">Создать пресет</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit button */}
      <button
        onClick={handleStartEdit}
        className="p-1 sm:p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
        title="Редактировать navbar"
      >
        <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
    </div>
    </>
  )
}
