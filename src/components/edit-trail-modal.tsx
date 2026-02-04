"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/toast"
import {
  X,
  Check,
  RefreshCw,
  Code,
  Target,
  Palette,
  Lightbulb,
  Eye,
  EyeOff,
  Users,
  ChevronDown,
} from "lucide-react"

const iconOptions = [
  { value: "Code", icon: Code, label: "Код" },
  { value: "Target", icon: Target, label: "Цель" },
  { value: "Palette", icon: Palette, label: "Дизайн" },
  { value: "Lightbulb", icon: Lightbulb, label: "Идея" },
]

const colorOptions = [
  { value: "#6366f1", label: "Индиго" },
  { value: "#8b5cf6", label: "Фиолетовый" },
  { value: "#ec4899", label: "Розовый" },
  { value: "#ef4444", label: "Красный" },
  { value: "#f97316", label: "Оранжевый" },
  { value: "#eab308", label: "Жёлтый" },
  { value: "#22c55e", label: "Зелёный" },
  { value: "#14b8a6", label: "Бирюзовый" },
  { value: "#0ea5e9", label: "Голубой" },
  { value: "#3b82f6", label: "Синий" },
]

export interface TrailFormData {
  id: string
  title: string
  subtitle: string
  description: string
  icon: string
  color: string
  duration: string
  isPublished: boolean
  teacherVisibility?: string
  assignedTeacherId?: string | null
}

interface Teacher {
  id: string
  name: string
  email: string
}

const visibilityOptions = [
  { value: "ADMIN_ONLY", label: "Только администрация" },
  { value: "ALL_TEACHERS", label: "Все учителя" },
  { value: "SPECIFIC", label: "Конкретный учитель" },
]

interface EditTrailModalProps {
  open: boolean
  trail: TrailFormData | null
  onClose: () => void
  onSave: (data: TrailFormData) => void
  mode?: "edit" | "create"
}

export function EditTrailModal({
  open,
  trail,
  onClose,
  onSave,
  mode = "edit",
}: EditTrailModalProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  const { showToast } = useToast()

  // Check if user is admin (only admins can change teacherVisibility)
  const isAdmin = session?.user?.role === "ADMIN"
  const [form, setForm] = useState<TrailFormData>({
    id: "",
    title: "",
    subtitle: "",
    description: "",
    icon: "Code",
    color: "#6366f1",
    duration: "",
    isPublished: true,
    teacherVisibility: "ADMIN_ONLY",
    assignedTeacherId: null,
  })

  // Fetch teachers list
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoadingTeachers(true)
        const res = await fetch("/api/admin/teachers")
        if (res.ok) {
          const data = await res.json()
          setTeachers(data)
        }
      } catch {
        console.error("Failed to fetch teachers")
      } finally {
        setLoadingTeachers(false)
      }
    }

    if (open) {
      fetchTeachers()
    }
  }, [open])

  // Reset form when trail changes or modal opens
  useEffect(() => {
    if (mode === "create") {
      // Reset to defaults for create mode
      setForm({
        id: "",
        title: "",
        subtitle: "",
        description: "",
        icon: "Code",
        color: "#6366f1",
        duration: "",
        isPublished: true,
        teacherVisibility: "ADMIN_ONLY",
        assignedTeacherId: null,
      })
    } else if (trail) {
      setForm({
        id: trail.id,
        title: trail.title,
        subtitle: trail.subtitle || "",
        description: trail.description || "",
        icon: trail.icon || "Code",
        color: trail.color || "#6366f1",
        duration: trail.duration || "",
        isPublished: trail.isPublished,
        teacherVisibility: trail.teacherVisibility || "ADMIN_ONLY",
        assignedTeacherId: trail.assignedTeacherId || null,
      })
    }
  }, [trail, mode, open])

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      showToast("Название обязательно", "error")
      return
    }

    // Validate: if SPECIFIC visibility, teacher must be selected (edit mode only, admin only)
    if (mode === "edit" && isAdmin && form.teacherVisibility === "SPECIFIC" && !form.assignedTeacherId) {
      showToast("Выберите учителя для конкретного назначения", "error")
      return
    }

    try {
      setLoading(true)

      // Build payload
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        icon: form.icon,
        color: form.color,
        duration: form.duration.trim(),
        isPublished: form.isPublished,
      }

      // Only include teacherVisibility for admins in edit mode
      if (mode === "edit" && isAdmin) {
        payload.teacherVisibility = form.teacherVisibility
        payload.assignedTeacherId = form.teacherVisibility === "SPECIFIC" ? form.assignedTeacherId : null
      }

      let res: Response
      if (mode === "create") {
        // POST for creating new trail
        res = await fetch("/api/admin/trails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        // PATCH for updating existing trail
        res = await fetch(`/api/admin/trails/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || (mode === "create" ? "Ошибка создания" : "Ошибка сохранения"))
      }

      const savedTrail = await res.json()
      showToast(mode === "create" ? "Trail успешно создан" : "Trail успешно обновлён", "success")
      onSave(mode === "create" ? { ...form, id: savedTrail.id } : form)
      onClose()
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : (mode === "create" ? "Ошибка создания" : "Ошибка сохранения"),
        "error"
      )
    } finally {
      setLoading(false)
    }
  }

  // In create mode, trail is not required
  if (!open || (mode === "edit" && !trail)) return null

  const SelectedIcon = iconOptions.find(i => i.value === form.icon)?.icon || Code

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${form.color}20` }}
              >
                <SelectedIcon className="h-4 w-4" style={{ color: form.color }} />
              </div>
              {mode === "create" ? "Создать Trail" : "Редактировать Trail"}
            </CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="trailTitle">Название *</Label>
            <Input
              id="trailTitle"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Например: Vibe Coder"
            />
          </div>

          {/* Subtitle */}
          <div>
            <Label htmlFor="trailSubtitle">Подзаголовок</Label>
            <Input
              id="trailSubtitle"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="Краткое описание направления"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="trailDescription">Описание</Label>
            <Textarea
              id="trailDescription"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Полное описание trail (markdown поддерживается)"
              rows={3}
            />
          </div>

          {/* Duration */}
          <div>
            <Label htmlFor="trailDuration">Длительность</Label>
            <Input
              id="trailDuration"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              placeholder="4-6 недель"
            />
          </div>

          {/* Icon selection */}
          <div>
            <Label className="mb-2 block">Иконка</Label>
            <div className="grid grid-cols-4 gap-2">
              {iconOptions.map(({ value, icon: IconComponent, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, icon: value })}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    form.icon === value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <IconComponent
                    className={`h-5 w-5 mx-auto mb-1 ${
                      form.icon === value ? "text-blue-600" : "text-gray-500"
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      form.icon === value ? "text-blue-700" : "text-gray-600"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Color selection */}
          <div>
            <Label className="mb-2 block">Цвет</Label>
            <div className="grid grid-cols-5 gap-2">
              {colorOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, color: value })}
                  title={label}
                  className={`h-10 rounded-lg border-2 transition-all ${
                    form.color === value
                      ? "border-gray-900 scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: value }}
                />
              ))}
            </div>
          </div>

          {/* Published toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {form.isPublished ? (
                <Eye className="h-4 w-4 text-green-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-400" />
              )}
              <div>
                <span className="text-sm font-medium">
                  {form.isPublished ? "Опубликован" : "Скрыт"}
                </span>
                <p className="text-xs text-gray-500">
                  {form.isPublished
                    ? "Trail виден всем пользователям"
                    : "Trail скрыт от студентов"}
                </p>
              </div>
            </div>
            <Switch
              checked={form.isPublished}
              onCheckedChange={(checked) => setForm({ ...form, isPublished: checked })}
            />
          </div>

          {/* Teacher Visibility - Admin only */}
          {isAdmin && (
            <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Видимость для учителей</span>
              </div>

              <div className="relative">
                <select
                  value={form.teacherVisibility}
                  onChange={(e) => setForm({
                    ...form,
                    teacherVisibility: e.target.value,
                    assignedTeacherId: e.target.value !== "SPECIFIC" ? null : form.assignedTeacherId
                  })}
                  className="w-full p-2 pr-8 border border-blue-200 rounded-lg bg-white text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {visibilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Teacher selection for SPECIFIC visibility */}
              {form.teacherVisibility === "SPECIFIC" && (
                <div className="relative">
                  {loadingTeachers ? (
                    <div className="flex items-center gap-2 p-2 text-sm text-gray-500">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Загрузка учителей...
                    </div>
                  ) : teachers.length === 0 ? (
                    <div className="p-2 text-sm text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
                      Нет учителей для назначения. Сначала создайте учителя в разделе "Пользователи".
                    </div>
                  ) : (
                    <>
                      <select
                        value={form.assignedTeacherId || ""}
                        onChange={(e) => setForm({ ...form, assignedTeacherId: e.target.value || null })}
                        className="w-full p-2 pr-8 border border-blue-200 rounded-lg bg-white text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Выберите учителя...</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name} ({teacher.email})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </>
                  )}
                </div>
              )}

              <p className="text-xs text-blue-700">
                {form.teacherVisibility === "ADMIN_ONLY" && "Только администраторы могут управлять этим trail"}
                {form.teacherVisibility === "ALL_TEACHERS" && "Все учителя видят этот trail во вкладке \"Контент\""}
                {form.teacherVisibility === "SPECIFIC" && "Только выбранный учитель видит этот trail во вкладке \"Контент\""}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={!form.title.trim() || loading}>
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {mode === "create" ? "Создать" : "Сохранить"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
