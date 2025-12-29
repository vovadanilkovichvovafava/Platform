"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  BookOpen,
  Wrench,
  FolderGit2,
  GripVertical,
} from "lucide-react"

interface Question {
  id: string
  question: string
  options: string
  correctAnswer: number
  order: number
}

interface Module {
  id: string
  slug: string
  title: string
  description: string
  content: string | null
  requirements: string | null
  type: "THEORY" | "PRACTICE" | "PROJECT"
  level: string
  points: number
  duration: string
  order: number
  trail: {
    id: string
    title: string
    slug: string
  }
  questions: Question[]
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

interface Props {
  params: Promise<{ id: string }>
}

export default function ModuleEditorPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const [module, setModule] = useState<Module | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [requirements, setRequirements] = useState("")
  const [points, setPoints] = useState(0)
  const [duration, setDuration] = useState("")

  // Questions state
  const [questions, setQuestions] = useState<Array<{
    id?: string
    question: string
    options: string[]
    correctAnswer: number
    isNew?: boolean
  }>>([])

  const fetchModule = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/modules/${id}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data: Module = await res.json()
      setModule(data)
      setTitle(data.title)
      setDescription(data.description || "")
      setContent(data.content || "")
      setRequirements(data.requirements || "")
      setPoints(data.points)
      setDuration(data.duration || "")
      setQuestions(
        data.questions.map((q) => ({
          id: q.id,
          question: q.question,
          options: JSON.parse(q.options),
          correctAnswer: q.correctAnswer,
        }))
      )
    } catch {
      setError("Ошибка загрузки модуля")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchModule()
  }, [id])

  const saveModule = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")

      // Save module
      const moduleRes = await fetch(`/api/admin/modules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          content,
          requirements,
          points,
          duration,
        }),
      })

      if (!moduleRes.ok) throw new Error("Failed to save module")

      // Save questions
      for (const q of questions) {
        if (q.isNew) {
          // Create new question
          await fetch("/api/admin/questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              moduleId: id,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
            }),
          })
        } else if (q.id) {
          // Update existing question
          await fetch(`/api/admin/questions/${q.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
            }),
          })
        }
      }

      setSuccess("Сохранено!")
      setTimeout(() => setSuccess(""), 3000)
      fetchModule() // Refresh to get updated IDs
    } catch {
      setError("Ошибка сохранения")
    } finally {
      setSaving(false)
    }
  }

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        isNew: true,
      },
    ])
  }

  const updateQuestion = (index: number, field: string, value: string | number | string[]) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions]
    const options = [...updated[qIndex].options]
    options[oIndex] = value
    updated[qIndex] = { ...updated[qIndex], options }
    setQuestions(updated)
  }

  const deleteQuestion = async (index: number) => {
    const q = questions[index]
    if (q.id) {
      try {
        await fetch(`/api/admin/questions/${q.id}`, { method: "DELETE" })
      } catch {
        setError("Ошибка удаления вопроса")
        return
      }
    }
    setQuestions(questions.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">Модуль не найден</p>
      </div>
    )
  }

  const TypeIcon = typeIcons[module.type]
  const isProject = module.type === "PROJECT"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/content"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Назад
              </Link>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                  <TypeIcon className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <h1 className="font-semibold text-gray-900">{module.title}</h1>
                  <p className="text-xs text-gray-500">{module.trail.title}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {error && <span className="text-sm text-red-500">{error}</span>}
              {success && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  {success}
                </span>
              )}
              <Button onClick={saveModule} disabled={saving}>
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Основная информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Название
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Название модуля"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Описание
                  </label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Краткое описание"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Баллы (XP)
                    </label>
                    <Input
                      type="number"
                      value={points}
                      onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Длительность
                    </label>
                    <Input
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="30 мин"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {isProject ? "Описание проекта" : "Теоретический материал"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-96 p-4 font-mono text-sm border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Markdown контент..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Поддерживается Markdown: # заголовки, **жирный**, - списки
                </p>
              </CardContent>
            </Card>

            {/* Requirements (for projects) */}
            {isProject && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Требования к проекту</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    className="w-full h-64 p-4 font-mono text-sm border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Требования в формате Markdown..."
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Questions */}
          <div className="space-y-6">
            {!isProject && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Вопросы ({questions.length})
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={addQuestion}>
                      <Plus className="h-4 w-4 mr-1" />
                      Добавить
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {questions.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Нет вопросов
                    </p>
                  ) : (
                    questions.map((q, qIndex) => (
                      <div
                        key={q.id || `new-${qIndex}`}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-5 w-5 text-gray-400 mt-2 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                Вопрос {qIndex + 1}
                              </span>
                              {q.isNew && (
                                <Badge variant="secondary" className="text-xs">
                                  Новый
                                </Badge>
                              )}
                            </div>
                            <textarea
                              value={q.question}
                              onChange={(e) =>
                                updateQuestion(qIndex, "question", e.target.value)
                              }
                              className="w-full p-2 text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={2}
                              placeholder="Текст вопроса..."
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 shrink-0"
                            onClick={() => deleteQuestion(qIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="ml-7 space-y-2">
                          {q.options.map((opt, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuestion(qIndex, "correctAnswer", oIndex)
                                }
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  q.correctAnswer === oIndex
                                    ? "border-green-500 bg-green-500 text-white"
                                    : "border-gray-300"
                                }`}
                              >
                                {q.correctAnswer === oIndex && (
                                  <Check className="h-3 w-3" />
                                )}
                              </button>
                              <Input
                                value={opt}
                                onChange={(e) =>
                                  updateOption(qIndex, oIndex, e.target.value)
                                }
                                placeholder={`Вариант ${String.fromCharCode(65 + oIndex)}`}
                                className="text-sm"
                              />
                            </div>
                          ))}
                          <p className="text-xs text-gray-500">
                            Нажмите на кружок чтобы отметить правильный ответ
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {/* Preview Link */}
            <Card>
              <CardContent className="p-4">
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/module/${module.slug}`} target="_blank">
                    Просмотреть на сайте
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
