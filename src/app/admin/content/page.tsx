"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  ArrowLeft,
  RefreshCw,
  Plus,
  X,
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

export default function AdminContentPage() {
  const router = useRouter()
  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Create trail modal
  const [showTrailModal, setShowTrailModal] = useState(false)
  const [newTrailTitle, setNewTrailTitle] = useState("")
  const [newTrailSubtitle, setNewTrailSubtitle] = useState("")
  const [creatingTrail, setCreatingTrail] = useState(false)

  // Create module modal
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [selectedTrailId, setSelectedTrailId] = useState("")
  const [newModuleTitle, setNewModuleTitle] = useState("")
  const [newModuleType, setNewModuleType] = useState<"THEORY" | "PRACTICE" | "PROJECT">("THEORY")
  const [creatingModule, setCreatingModule] = useState(false)

  const fetchTrails = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/trails")
      if (!res.ok) throw new Error("Failed to fetch")
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
    if (!newTrailTitle.trim()) return

    try {
      setCreatingTrail(true)
      const res = await fetch("/api/admin/trails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTrailTitle,
          subtitle: newTrailSubtitle,
        }),
      })

      if (!res.ok) throw new Error("Failed to create")

      setNewTrailTitle("")
      setNewTrailSubtitle("")
      setShowTrailModal(false)
      fetchTrails()
    } catch {
      setError("Ошибка создания trail")
    } finally {
      setCreatingTrail(false)
    }
  }

  const createModule = async () => {
    if (!newModuleTitle.trim() || !selectedTrailId) return

    try {
      setCreatingModule(true)
      const res = await fetch("/api/admin/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trailId: selectedTrailId,
          title: newModuleTitle,
          type: newModuleType,
          level: newModuleType === "PROJECT" ? "Middle" : "Beginner",
        }),
      })

      if (!res.ok) throw new Error("Failed to create")

      const module = await res.json()
      setNewModuleTitle("")
      setNewModuleType("THEORY")
      setShowModuleModal(false)
      // Navigate to edit the new module
      router.push(`/admin/content/modules/${module.id}`)
    } catch {
      setError("Ошибка создания модуля")
    } finally {
      setCreatingModule(false)
    }
  }

  const openModuleModal = (trailId: string) => {
    setSelectedTrailId(trailId)
    setShowModuleModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Link
            href="/admin/invites"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            К инвайтам
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Управление контентом
              </h1>
              <p className="text-gray-600 mt-1">
                Редактирование теории, вопросов и проектов
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowTrailModal(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Новый Trail
              </Button>
              <Button onClick={fetchTrails} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Обновить
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
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
              const assessmentModules = trail.modules.filter(m => m.type !== "PROJECT")
              const projectModules = trail.modules.filter(m => m.type === "PROJECT")

              return (
                <Card key={trail.id}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${trail.color}20` }}
                      >
                        <Icon className="h-6 w-6" style={{ color: trail.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle>{trail.title}</CardTitle>
                          {!trail.isPublished && (
                            <Badge variant="secondary">Скрыт</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{trail.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">
                          {trail.modules.length} модулей
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModuleModal(trail.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Модуль
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {trail.modules.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p className="mb-3">Нет модулей</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModuleModal(trail.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Добавить модуль
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Assessment Modules */}
                        {assessmentModules.length > 0 && (
                          <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">
                              Оценка знаний
                            </h3>
                            <div className="space-y-2">
                              {assessmentModules.map((module) => {
                                const TypeIcon = typeIcons[module.type]
                                return (
                                  <Link
                                    key={module.id}
                                    href={`/admin/content/modules/${module.id}`}
                                    className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                                      <TypeIcon className="h-5 w-5 text-gray-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 truncate">
                                          {module.title}
                                        </span>
                                        <Badge variant="outline" className="text-xs shrink-0">
                                          {typeLabels[module.type]}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-gray-500 truncate">
                                        {module.description}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 shrink-0">
                                      <div className="flex items-center gap-1">
                                        <HelpCircle className="h-4 w-4" />
                                        {module._count.questions}
                                      </div>
                                      <span>{module.points} XP</span>
                                      <ChevronRight className="h-4 w-4" />
                                    </div>
                                  </Link>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Project Modules */}
                        {projectModules.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-3">
                              Проекты
                            </h3>
                            <div className="space-y-2">
                              {projectModules.map((module) => (
                                <Link
                                  key={module.id}
                                  href={`/admin/content/modules/${module.id}`}
                                  className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                                    <FolderGit2 className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-900 truncate">
                                        {module.title}
                                      </span>
                                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs shrink-0">
                                        {module.level}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">
                                      {module.description}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-500 shrink-0">
                                    <span>{module.duration}</span>
                                    <span>{module.points} XP</span>
                                    <ChevronRight className="h-4 w-4" />
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
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
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Создать Trail</h2>
              <button onClick={() => setShowTrailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Название *
                </label>
                <Input
                  value={newTrailTitle}
                  onChange={(e) => setNewTrailTitle(e.target.value)}
                  placeholder="Например: Vibe Coder"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Подзаголовок
                </label>
                <Input
                  value={newTrailSubtitle}
                  onChange={(e) => setNewTrailSubtitle(e.target.value)}
                  placeholder="Краткое описание направления"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowTrailModal(false)}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button
                  onClick={createTrail}
                  disabled={!newTrailTitle.trim() || creatingTrail}
                  className="flex-1"
                >
                  {creatingTrail ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    "Создать"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Module Modal */}
      {showModuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Добавить модуль</h2>
              <button onClick={() => setShowModuleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Название *
                </label>
                <Input
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="Например: Основы промптинга"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Тип модуля
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["THEORY", "PRACTICE", "PROJECT"] as const).map((type) => {
                    const TypeIcon = typeIcons[type]
                    return (
                      <button
                        key={type}
                        onClick={() => setNewModuleType(type)}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          newModuleType === type
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <TypeIcon className={`h-5 w-5 mx-auto mb-1 ${
                          newModuleType === type ? "text-blue-600" : "text-gray-500"
                        }`} />
                        <span className={`text-xs font-medium ${
                          newModuleType === type ? "text-blue-700" : "text-gray-600"
                        }`}>
                          {typeLabels[type]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowModuleModal(false)}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button
                  onClick={createModule}
                  disabled={!newModuleTitle.trim() || creatingModule}
                  className="flex-1"
                >
                  {creatingModule ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    "Создать"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
