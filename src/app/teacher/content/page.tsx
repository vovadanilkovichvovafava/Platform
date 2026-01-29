"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import {
  BookOpen,
  Wrench,
  FolderGit2,
  Code,
  Target,
  Palette,
  Lightbulb,
  RefreshCw,
  Plus,
  X,
  Trash2,
  Edit,
  Check,
  AlertCircle,
} from "lucide-react"
import { CreateModuleModal } from "@/components/create-module-modal"

interface Module {
  id: string
  slug: string
  title: string
  description: string
  type: "THEORY" | "PRACTICE" | "PROJECT"
  level: string
  points: number
  duration: string
  order: number
  _count: {
    questions: number
  }
}

interface Trail {
  id: string
  slug: string
  title: string
  subtitle: string
  description: string
  icon: string
  color: string
  duration: string
  isPublished: boolean
  modules: Module[]
}

interface Assignment {
  trailId: string
}

const iconMap: Record<string, typeof Code> = {
  Code,
  Target,
  Palette,
  Lightbulb,
}

const typeIcons: Record<string, typeof BookOpen> = {
  THEORY: BookOpen,
  PRACTICE: Wrench,
  PROJECT: FolderGit2,
}

export default function TeacherContentPage() {
  const [trails, setTrails] = useState<Trail[]>([])
  const [assignedTrailIds, setAssignedTrailIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const [showTrailModal, setShowTrailModal] = useState(false)
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [selectedTrailId, setSelectedTrailId] = useState<string>("")

  // Trail form state
  const [trailForm, setTrailForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    icon: "Code",
    color: "#0176D3",
    duration: "2-4 недели",
  })


  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch all trails
      const trailsRes = await fetch("/api/admin/trails")
      const trailsData = await trailsRes.json()

      // Fetch teacher's assignments
      const assignmentsRes = await fetch("/api/teacher/assignments")
      const assignmentsData = await assignmentsRes.json()

      setTrails(trailsData)
      setAssignedTrailIds(assignmentsData.map((a: Assignment) => a.trailId))
    } catch {
      setError("Ошибка загрузки данных")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter trails to show only assigned ones
  const assignedTrails = trails.filter((t) => assignedTrailIds.includes(t.id))

  const createTrail = async () => {
    try {
      const slug = trailForm.title
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]+/gi, "-")
        .replace(/(^-|-$)/g, "")

      const res = await fetch("/api/admin/trails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...trailForm,
          slug,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create trail")
      }

      setShowTrailModal(false)
      setTrailForm({
        title: "",
        subtitle: "",
        description: "",
        icon: "Code",
        color: "#0176D3",
        duration: "2-4 недели",
      })
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания trail")
    }
  }

  const createModule = async (data: {
    title: string
    description: string
    type: "THEORY" | "PRACTICE" | "PROJECT"
    level: string
    points: number
    duration: string
  }) => {
    if (!selectedTrailId) return

    const slug = data.title
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, "-")
      .replace(/(^-|-$)/g, "")

    const trail = assignedTrails.find((t) => t.id === selectedTrailId)
    const order = trail ? trail.modules.length : 0

    const res = await fetch("/api/admin/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        slug,
        trailId: selectedTrailId,
        order,
      }),
    })

    if (!res.ok) {
      const resData = await res.json()
      throw new Error(resData.error || "Failed to create module")
    }

    setShowModuleModal(false)
    setSelectedTrailId("")
    fetchData()
  }

  const deleteTrail = async (trailId: string, title: string) => {
    const confirmed = await confirm({
      title: "Удалить trail?",
      message: `Вы уверены, что хотите удалить "${title}" и все его модули?`,
      confirmText: "Удалить",
      variant: "danger",
    })

    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/trails/${trailId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete trail")
      }
      fetchData()
      showToast("Trail удалён", "success")
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Ошибка удаления trail", "error")
    }
  }

  const deleteModule = async (moduleId: string, title: string) => {
    const confirmed = await confirm({
      title: "Удалить модуль?",
      message: `Вы уверены, что хотите удалить "${title}"?`,
      confirmText: "Удалить",
      variant: "danger",
    })

    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/modules/${moduleId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete module")
      }
      fetchData()
      showToast("Модуль удалён", "success")
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Ошибка удаления модуля", "error")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              Управление контентом
            </h1>
            <p className="text-gray-500 text-sm truncate">
              Редактирование trails и модулей
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button onClick={() => setShowTrailModal(true)} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-700 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{error}</span>
            </div>
            <button onClick={() => setError("")} className="flex-shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="space-y-6">
          {assignedTrails.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">Нет назначенных trails</p>
              </CardContent>
            </Card>
          ) : (
            assignedTrails.map((trail) => {
              const Icon = iconMap[trail.icon] || Code

              return (
                <Card key={trail.id}>
                  {/* Trail Header */}
                  <CardHeader className="p-4" style={{ background: `linear-gradient(135deg, ${trail.color}10 0%, ${trail.color}05 100%)` }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0"
                        style={{ background: trail.color }}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base truncate">{trail.title}</CardTitle>
                          <Badge variant={trail.isPublished ? "default" : "secondary"} className="flex-shrink-0 text-xs">
                            {trail.isPublished ? "✓" : "○"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{trail.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedTrailId(trail.id)
                            setShowModuleModal(true)
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteTrail(trail.id, trail.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Modules List */}
                  <CardContent className="p-0">
                    {trail.modules.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-6">Нет модулей</p>
                    ) : (
                      <div className="divide-y">
                        {trail.modules.map((module, index) => {
                          const TypeIcon = typeIcons[module.type]

                          return (
                            <div
                              key={module.id}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group"
                            >
                              <span className="text-gray-400 text-xs w-4 flex-shrink-0">{index + 1}</span>
                              <div className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 flex-shrink-0">
                                <TypeIcon className="h-3.5 w-3.5 text-gray-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 truncate">{module.title}</div>
                                <div className="text-xs text-gray-500 truncate">{module.description}</div>
                              </div>
                              <div className="text-xs text-gray-400 flex-shrink-0">{module.points}xp</div>
                              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100">
                                <Link href={`/content/modules/${module.id}`}>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                </Link>
                                <div className="w-px h-5 bg-gray-200 mx-1" />
                                <Button
                                  variant="ghost-destructive"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => deleteModule(module.id, module.title)}
                                  title="Удалить модуль"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Create Trail Modal */}
      {showTrailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Создать новый Trail</CardTitle>
                <button onClick={() => setShowTrailModal(false)}>
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="trailTitle">Название</Label>
                <Input
                  id="trailTitle"
                  value={trailForm.title}
                  onChange={(e) =>
                    setTrailForm({ ...trailForm, title: e.target.value })
                  }
                  placeholder="Например: Основы Python"
                />
              </div>
              <div>
                <Label htmlFor="trailSubtitle">Подзаголовок</Label>
                <Input
                  id="trailSubtitle"
                  value={trailForm.subtitle}
                  onChange={(e) =>
                    setTrailForm({ ...trailForm, subtitle: e.target.value })
                  }
                  placeholder="Краткое описание"
                />
              </div>
              <div>
                <Label htmlFor="trailDescription">Описание</Label>
                <Textarea
                  id="trailDescription"
                  value={trailForm.description}
                  onChange={(e) =>
                    setTrailForm({ ...trailForm, description: e.target.value })
                  }
                  placeholder="Подробное описание курса"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trailIcon">Иконка</Label>
                  <select
                    id="trailIcon"
                    value={trailForm.icon}
                    onChange={(e) =>
                      setTrailForm({ ...trailForm, icon: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="Code">Code</option>
                    <option value="Target">Target</option>
                    <option value="Palette">Palette</option>
                    <option value="Lightbulb">Lightbulb</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="trailColor">Цвет</Label>
                  <Input
                    id="trailColor"
                    type="color"
                    value={trailForm.color}
                    onChange={(e) =>
                      setTrailForm({ ...trailForm, color: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="trailDuration">Длительность</Label>
                <Input
                  id="trailDuration"
                  value={trailForm.duration}
                  onChange={(e) =>
                    setTrailForm({ ...trailForm, duration: e.target.value })
                  }
                  placeholder="2-4 недели"
                />
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Новый trail будет закрыт для учеников до подтверждения администратором.
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowTrailModal(false)}>
                  Отмена
                </Button>
                <Button onClick={createTrail}>
                  <Check className="h-4 w-4 mr-2" />
                  Создать
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Module Modal */}
      <CreateModuleModal
        open={showModuleModal}
        onClose={() => setShowModuleModal(false)}
        onSubmit={createModule}
        trailId={selectedTrailId}
      />
    </div>
  )
}
