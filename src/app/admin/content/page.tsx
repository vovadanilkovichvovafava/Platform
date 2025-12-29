"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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
            <Button onClick={fetchTrails} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {trails.map((trail) => {
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
                    <div className="text-sm text-gray-500">
                      {trail.modules.length} модулей
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
