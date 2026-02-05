"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  BookOpen,
  Wrench,
  FolderGit2,
  X,
  Check,
  RefreshCw,
} from "lucide-react"

const typeIcons = {
  THEORY: BookOpen,
  PRACTICE: Wrench,
  PROJECT: FolderGit2,
}

const typeLabels = {
  THEORY: "Теория",
  PRACTICE: "Практика",
  PROJECT: "Проект",
}

interface ModuleFormData {
  title: string
  description: string
  type: "THEORY" | "PRACTICE" | "PROJECT"
  level: string
  points: number
  duration: string
}

interface CreateModuleModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ModuleFormData) => Promise<void>
  trailId: string
}

export function CreateModuleModal({
  open,
  onClose,
  onSubmit,
}: CreateModuleModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<ModuleFormData>({
    title: "",
    description: "",
    type: "THEORY",
    level: "Middle",
    points: 50,
    duration: "15 мин",
  })

  // Block background scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const handleSubmit = async () => {
    if (!form.title.trim()) return

    try {
      setLoading(true)
      await onSubmit(form)
      // Reset form after successful submit
      setForm({
        title: "",
        description: "",
        type: "THEORY",
        level: "Middle",
        points: 50,
        duration: "15 мин",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setForm({
      title: "",
      description: "",
      type: "THEORY",
      level: "Middle",
      points: 50,
      duration: "15 мин",
    })
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto overscroll-contain">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Добавить модуль</CardTitle>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="moduleTitle">Название *</Label>
            <Input
              id="moduleTitle"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Например: Основы промптинга"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="moduleDescription">Описание</Label>
            <Textarea
              id="moduleDescription"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Краткое описание модуля"
              rows={6}
              className="resize-y max-h-80"
            />
          </div>

          {/* Type - visual grid selection */}
          <div>
            <Label className="mb-2 block">Тип модуля</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["THEORY", "PRACTICE", "PROJECT"] as const).map((type) => {
                const TypeIcon = typeIcons[type]
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, type })}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      form.type === type
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <TypeIcon
                      className={`h-5 w-5 mx-auto mb-1 ${
                        form.type === type ? "text-blue-600" : "text-gray-500"
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        form.type === type ? "text-blue-700" : "text-gray-600"
                      }`}
                    >
                      {typeLabels[type]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Level and Points row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="moduleLevel">Уровень</Label>
              <select
                id="moduleLevel"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="w-full p-2 border rounded-lg text-sm"
              >
                <option value="Beginner">Beginner</option>
                <option value="Junior">Junior</option>
                <option value="Middle">Middle</option>
                <option value="Senior">Senior</option>
              </select>
            </div>
            <div>
              <Label htmlFor="modulePoints">Очки XP</Label>
              <Input
                id="modulePoints"
                type="number"
                value={form.points}
                onChange={(e) =>
                  setForm({ ...form, points: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <Label htmlFor="moduleDuration">Длительность</Label>
            <Input
              id="moduleDuration"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              placeholder="15 мин"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={!form.title.trim() || loading}>
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Создать
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
