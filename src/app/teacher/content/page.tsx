"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  BookOpen,
  Wrench,
  FolderGit2,
  ChevronRight,
  HelpCircle,
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
} from "lucide-react"

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

const typeLabels: Record<string, string> = {
  THEORY: "Теория",
  PRACTICE: "Практика",
  PROJECT: "Проект",
}

export default function TeacherContentPage() {
  const router = useRouter()
  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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

  // Module form state
  const [moduleForm, setModuleForm] = useState({
    title: "",
    description: "",
    type: "THEORY",
    level: "Middle",
    points: 50,
    duration: "15 мин",
  })

  const fetchTrails = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/trails")
      const data = await res.json()
      setTrails(data)
    } catch {
      setError("Ошибка загрузки данных")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrails()
  }, [])

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

      if (!res.ok) throw new Error("Failed to create trail")

      setShowTrailModal(false)
      setTrailForm({
        title: "",
        subtitle: "",
        description: "",
        icon: "Code",
        color: "#0176D3",
        duration: "2-4 недели",
      })
      fetchTrails()
    } catch {
      setError("Ошибка создания trail")
    }
  }

  const createModule = async () => {
    if (!selectedTrailId) return

    try {
      const slug = moduleForm.title
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]+/gi, "-")
        .replace(/(^-|-$)/g, "")

      const trail = trails.find((t) => t.id === selectedTrailId)
      const order = trail ? trail.modules.length : 0

      const res = await fetch("/api/admin/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...moduleForm,
          slug,
          trailId: selectedTrailId,
          order,
        }),
      })

      if (!res.ok) throw new Error("Failed to create module")

      setShowModuleModal(false)
      setSelectedTrailId("")
      setModuleForm({
        title: "",
        description: "",
        type: "THEORY",
        level: "Middle",
        points: 50,
        duration: "15 мин",
      })
      fetchTrails()
    } catch {
      setError("Ошибка создания модуля")
    }
  }

  const deleteTrail = async (trailId: string, title: string) => {
    if (!confirm(`Удалить trail "${title}" и все его модули?`)) return

    try {
      const res = await fetch(`/api/admin/trails/${trailId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete trail")
      fetchTrails()
    } catch {
      setError("Ошибка удаления trail")
    }
  }

  const deleteModule = async (moduleId: string, title: string) => {
    if (!confirm(`Удалить модуль "${title}"?`)) return

    try {
      const res = await fetch(`/api/admin/modules/${moduleId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete module")
      fetchTrails()
    } catch {
      setError("Ошибка удаления модуля")
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Управление контентом
              </h1>
              <p className="text-gray-600 mt-1">
                Создание и редактирование trails и модулей
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowTrailModal(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Новый Trail
              </Button>
              <Button onClick={fetchTrails} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-700">
            <span>{error}</span>
            <button onClick={() => setError("")}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="space-y-8">
          {trails.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500 mb-4">Нет trails</p>
                <Button onClick={() => setShowTrailModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать первый Trail
                </Button>
              </CardContent>
            </Card>
          ) : (
            trails.map((trail) => {
              const Icon = iconMap[trail.icon] || Code

              return (
                <Card key={trail.id} className="overflow-hidden">
                  <CardHeader
                    className="pb-4"
                    style={{
                      background: `linear-gradient(135deg, ${trail.color}10 0%, ${trail.color}05 100%)`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-xl"
                          style={{
                            background: `linear-gradient(135deg, ${trail.color} 0%, ${trail.color}99 100%)`,
                          }}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {trail.title}
                          </CardTitle>
                          <p className="text-sm text-gray-500">
                            {trail.subtitle}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={trail.isPublished ? "default" : "secondary"}>
                          {trail.isPublished ? "Опубликован" : "Черновик"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTrailId(trail.id)
                            setShowModuleModal(true)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Модуль
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteTrail(trail.id, trail.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {trail.modules.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">
                        Нет модулей
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {trail.modules.map((module, index) => {
                          const TypeIcon = typeIcons[module.type]

                          return (
                            <div
                              key={module.id}
                              className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 group"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-gray-400 text-sm w-6">
                                  {index + 1}.
                                </span>
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                                  <TypeIcon className="h-4 w-4 text-gray-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 truncate">
                                      {module.title}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {typeLabels[module.type]}
                                    </Badge>
                                    {module.type === "THEORY" && (
                                      <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <HelpCircle className="h-3 w-3" />
                                        {module._count?.questions || 0} вопросов
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500 truncate">
                                    {module.description}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link href={`/admin/content/modules/${module.id}`}>
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => deleteModule(module.id, module.title)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span>{module.duration}</span>
                                <span>{module.points} XP</span>
                                <ChevronRight className="h-4 w-4" />
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
                <CardTitle>Создать Trail</CardTitle>
                <button onClick={() => setShowTrailModal(false)}>
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Название</Label>
                <Input
                  id="title"
                  value={trailForm.title}
                  onChange={(e) =>
                    setTrailForm({ ...trailForm, title: e.target.value })
                  }
                  placeholder="Например: Frontend Development"
                />
              </div>
              <div>
                <Label htmlFor="subtitle">Подзаголовок</Label>
                <Input
                  id="subtitle"
                  value={trailForm.subtitle}
                  onChange={(e) =>
                    setTrailForm({ ...trailForm, subtitle: e.target.value })
                  }
                  placeholder="Краткое описание"
                />
              </div>
              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={trailForm.description}
                  onChange={(e) =>
                    setTrailForm({ ...trailForm, description: e.target.value })
                  }
                  placeholder="Полное описание trail"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="icon">Иконка</Label>
                  <select
                    id="icon"
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
                  <Label htmlFor="color">Цвет</Label>
                  <Input
                    id="color"
                    type="color"
                    value={trailForm.color}
                    onChange={(e) =>
                      setTrailForm({ ...trailForm, color: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="duration">Длительность</Label>
                <Input
                  id="duration"
                  value={trailForm.duration}
                  onChange={(e) =>
                    setTrailForm({ ...trailForm, duration: e.target.value })
                  }
                  placeholder="2-4 недели"
                />
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
      {showModuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Добавить модуль</CardTitle>
                <button onClick={() => setShowModuleModal(false)}>
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="moduleTitle">Название</Label>
                <Input
                  id="moduleTitle"
                  value={moduleForm.title}
                  onChange={(e) =>
                    setModuleForm({ ...moduleForm, title: e.target.value })
                  }
                  placeholder="Например: Основы JavaScript"
                />
              </div>
              <div>
                <Label htmlFor="moduleDescription">Описание</Label>
                <Textarea
                  id="moduleDescription"
                  value={moduleForm.description}
                  onChange={(e) =>
                    setModuleForm({ ...moduleForm, description: e.target.value })
                  }
                  placeholder="Описание модуля"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="moduleType">Тип</Label>
                  <select
                    id="moduleType"
                    value={moduleForm.type}
                    onChange={(e) =>
                      setModuleForm({ ...moduleForm, type: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="THEORY">Теория</option>
                    <option value="PRACTICE">Практика</option>
                    <option value="PROJECT">Проект</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="moduleLevel">Уровень</Label>
                  <select
                    id="moduleLevel"
                    value={moduleForm.level}
                    onChange={(e) =>
                      setModuleForm({ ...moduleForm, level: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="Junior">Junior</option>
                    <option value="Middle">Middle</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="modulePoints">Очки XP</Label>
                  <Input
                    id="modulePoints"
                    type="number"
                    value={moduleForm.points}
                    onChange={(e) =>
                      setModuleForm({ ...moduleForm, points: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="moduleDuration">Длительность</Label>
                  <Input
                    id="moduleDuration"
                    value={moduleForm.duration}
                    onChange={(e) =>
                      setModuleForm({ ...moduleForm, duration: e.target.value })
                    }
                    placeholder="15 мин"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowModuleModal(false)}>
                  Отмена
                </Button>
                <Button onClick={createModule}>
                  <Check className="h-4 w-4 mr-2" />
                  Создать
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
