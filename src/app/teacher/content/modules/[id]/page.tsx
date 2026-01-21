"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { safeJsonParse } from "@/lib/utils"
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
  ChevronDown,
  Link2,
  ListOrdered,
  Search,
  CircleDot,
} from "lucide-react"

type QuestionType = "SINGLE_CHOICE" | "MATCHING" | "ORDERING" | "CASE_ANALYSIS"

interface MatchingData {
  leftLabel: string
  rightLabel: string
  leftItems: { id: string; text: string }[]
  rightItems: { id: string; text: string }[]
  correctPairs: Record<string, string>
}

interface OrderingData {
  items: { id: string; text: string }[]
  correctOrder: string[]
}

interface CaseAnalysisData {
  caseContent: string
  caseLabel: string
  options: { id: string; text: string; isCorrect: boolean; explanation: string }[]
  minCorrectRequired: number
}

interface Question {
  id: string
  question: string
  options: string
  correctAnswer: number
  order: number
  type?: string
  data?: string
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
  requiresSubmission: boolean
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

interface Props {
  params: Promise<{ id: string }>
}

export default function TeacherModuleEditorPage({ params }: Props) {
  const { id } = use(params)
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
  const [requiresSubmission, setRequiresSubmission] = useState(false)

  // Questions state
  const [questions, setQuestions] = useState<Array<{
    id?: string
    type: QuestionType
    question: string
    options: string[]
    correctAnswer: number
    data: MatchingData | OrderingData | CaseAnalysisData | null
    isNew?: boolean
  }>>([])

  // Dropdown state for adding questions
  const [showAddMenu, setShowAddMenu] = useState(false)

  const questionTypeLabels: Record<QuestionType, { label: string; icon: typeof CircleDot }> = {
    SINGLE_CHOICE: { label: "Один правильный ответ", icon: CircleDot },
    MATCHING: { label: "Сопоставление", icon: Link2 },
    ORDERING: { label: "Порядок действий", icon: ListOrdered },
    CASE_ANALYSIS: { label: "Анализ кейса", icon: Search },
  }

  const fetchModule = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/modules/${id}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to fetch")
      }
      const data: Module = await res.json()
      setModule(data)
      setTitle(data.title)
      setDescription(data.description || "")
      setContent(data.content || "")
      setRequirements(data.requirements || "")
      setPoints(data.points)
      setDuration(data.duration || "")
      setRequiresSubmission(data.requiresSubmission || false)
      setQuestions(
        data.questions.map((q) => {
          const questionType = (q.type as QuestionType) || "SINGLE_CHOICE"
          let questionData = q.data ? safeJsonParse(q.data, null) : null

          // Для MATCHING и ORDERING создаём дефолтные данные если их нет
          if (questionType === "MATCHING" && (!questionData || !("leftItems" in questionData))) {
            questionData = {
              leftLabel: "Термин",
              rightLabel: "Определение",
              leftItems: [
                { id: "l1", text: "" },
                { id: "l2", text: "" },
                { id: "l3", text: "" },
              ],
              rightItems: [
                { id: "r1", text: "" },
                { id: "r2", text: "" },
                { id: "r3", text: "" },
              ],
              correctPairs: { l1: "r1", l2: "r2", l3: "r3" },
            }
          } else if (questionType === "ORDERING" && (!questionData || !("correctOrder" in questionData))) {
            questionData = {
              items: [
                { id: "s1", text: "" },
                { id: "s2", text: "" },
                { id: "s3", text: "" },
              ],
              correctOrder: ["s1", "s2", "s3"],
            }
          } else if (questionType === "CASE_ANALYSIS" && (!questionData || !("caseContent" in questionData))) {
            questionData = {
              caseContent: "",
              caseLabel: "Кейс для анализа",
              options: [
                { id: "o1", text: "", isCorrect: false, explanation: "" },
                { id: "o2", text: "", isCorrect: false, explanation: "" },
                { id: "o3", text: "", isCorrect: false, explanation: "" },
              ],
              minCorrectRequired: 2,
            }
          }

          return {
            id: q.id,
            type: questionType,
            question: q.question,
            options: safeJsonParse<string[]>(q.options, []),
            correctAnswer: q.correctAnswer,
            data: questionData,
          }
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки модуля")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchModule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          requiresSubmission,
        }),
      })

      if (!moduleRes.ok) {
        const data = await moduleRes.json()
        throw new Error(data.error || "Failed to save module")
      }

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
              type: q.type,
              data: q.data,
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
              type: q.type,
              data: q.data,
            }),
          })
        }
      }

      setSuccess("Сохранено!")
      setTimeout(() => setSuccess(""), 3000)
      fetchModule() // Refresh to get updated IDs
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения")
    } finally {
      setSaving(false)
    }
  }

  const getDefaultDataForType = (type: QuestionType): MatchingData | OrderingData | CaseAnalysisData | null => {
    switch (type) {
      case "MATCHING":
        return {
          leftLabel: "Термин",
          rightLabel: "Определение",
          leftItems: [
            { id: "l1", text: "" },
            { id: "l2", text: "" },
            { id: "l3", text: "" },
          ],
          rightItems: [
            { id: "r1", text: "" },
            { id: "r2", text: "" },
            { id: "r3", text: "" },
          ],
          correctPairs: { l1: "r1", l2: "r2", l3: "r3" },
        }
      case "ORDERING":
        return {
          items: [
            { id: "s1", text: "" },
            { id: "s2", text: "" },
            { id: "s3", text: "" },
          ],
          correctOrder: ["s1", "s2", "s3"],
        }
      case "CASE_ANALYSIS":
        return {
          caseContent: "",
          caseLabel: "Кейс для анализа",
          options: [
            { id: "o1", text: "", isCorrect: false, explanation: "" },
            { id: "o2", text: "", isCorrect: false, explanation: "" },
            { id: "o3", text: "", isCorrect: false, explanation: "" },
          ],
          minCorrectRequired: 2,
        }
      default:
        return null
    }
  }

  const addQuestion = (type: QuestionType = "SINGLE_CHOICE") => {
    setShowAddMenu(false)
    const newQuestion = {
      type,
      question: "",
      options: type === "SINGLE_CHOICE" ? ["", "", "", ""] : [],
      correctAnswer: 0,
      data: getDefaultDataForType(type),
      isNew: true,
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (index: number, field: string, value: unknown) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const updateQuestionData = (index: number, newData: Partial<MatchingData | OrderingData | CaseAnalysisData>) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], data: { ...updated[index].data, ...newData } as MatchingData | OrderingData | CaseAnalysisData }
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
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "Модуль не найден"}</p>
          <Link href="/teacher/content">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к контенту
            </Button>
          </Link>
        </div>
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
                href="/teacher/content"
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

                {/* Требует отправки работы */}
                {!isProject && (
                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <input
                      type="checkbox"
                      id="requiresSubmission"
                      checked={requiresSubmission}
                      onChange={(e) => setRequiresSubmission(e.target.checked)}
                      className="h-5 w-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <label htmlFor="requiresSubmission" className="text-sm font-medium text-purple-900 cursor-pointer">
                        Требует отправки практической работы
                      </label>
                      <p className="text-xs text-purple-700">
                        Студенты смогут отправить ссылку на файл (Google Drive, Notion и т.д.)
                      </p>
                    </div>
                  </div>
                )}
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
                    <div className="relative">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAddMenu(!showAddMenu)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Добавить
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                      {showAddMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-20 py-1 min-w-[200px]">
                          {(Object.entries(questionTypeLabels) as [QuestionType, { label: string; icon: typeof CircleDot }][]).map(([type, { label, icon: Icon }]) => (
                            <button
                              key={type}
                              onClick={() => {
                                addQuestion(type)
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Icon className="h-4 w-4 text-gray-500" />
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Вопрос {qIndex + 1}
                                </span>
                                {(() => {
                                  const TypeIcon = questionTypeLabels[q.type].icon
                                  return (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <TypeIcon className="h-3 w-3" />
                                      {questionTypeLabels[q.type].label}
                                    </span>
                                  )
                                })()}
                              </div>
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

                        {/* SINGLE_CHOICE Editor */}
                        {q.type === "SINGLE_CHOICE" && (
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
                        )}

                        {/* MATCHING Editor */}
                        {q.type === "MATCHING" && q.data && "leftItems" in q.data && (
                          <div className="ml-7 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Input
                                  value={(q.data as MatchingData).leftLabel}
                                  onChange={(e) => {
                                    updateQuestionData(qIndex, { leftLabel: e.target.value })
                                  }}
                                  placeholder="Заголовок левой колонки"
                                  className="text-sm mb-2"
                                />
                                {(q.data as MatchingData).leftItems.map((item, idx) => (
                                  <Input
                                    key={item.id}
                                    value={item.text}
                                    onChange={(e) => {
                                      const newItems = [...(q.data as MatchingData).leftItems]
                                      newItems[idx] = { ...newItems[idx], text: e.target.value }
                                      updateQuestionData(qIndex, { leftItems: newItems })
                                    }}
                                    placeholder={`Элемент ${idx + 1}`}
                                    className="text-sm mb-1"
                                  />
                                ))}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs"
                                  onClick={() => {
                                    const data = q.data as MatchingData
                                    const newId = `l${data.leftItems.length + 1}`
                                    updateQuestionData(qIndex, {
                                      leftItems: [...data.leftItems, { id: newId, text: "" }],
                                    })
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Элемент
                                </Button>
                              </div>
                              <div>
                                <Input
                                  value={(q.data as MatchingData).rightLabel}
                                  onChange={(e) => {
                                    updateQuestionData(qIndex, { rightLabel: e.target.value })
                                  }}
                                  placeholder="Заголовок правой колонки"
                                  className="text-sm mb-2"
                                />
                                {(q.data as MatchingData).rightItems.map((item, idx) => (
                                  <Input
                                    key={item.id}
                                    value={item.text}
                                    onChange={(e) => {
                                      const newItems = [...(q.data as MatchingData).rightItems]
                                      newItems[idx] = { ...newItems[idx], text: e.target.value }
                                      updateQuestionData(qIndex, { rightItems: newItems })
                                    }}
                                    placeholder={`Элемент ${idx + 1}`}
                                    className="text-sm mb-1"
                                  />
                                ))}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs"
                                  onClick={() => {
                                    const data = q.data as MatchingData
                                    const newId = `r${data.rightItems.length + 1}`
                                    updateQuestionData(qIndex, {
                                      rightItems: [...data.rightItems, { id: newId, text: "" }],
                                    })
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Элемент
                                </Button>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                              <p className="font-medium mb-1">Связи (левый → правый):</p>
                              {(q.data as MatchingData).leftItems.map((leftItem, idx) => (
                                <div key={leftItem.id} className="flex items-center gap-2 mb-1">
                                  <span className="truncate max-w-[80px]">{leftItem.text || `Л${idx + 1}`}</span>
                                  <span>→</span>
                                  <select
                                    value={(q.data as MatchingData).correctPairs[leftItem.id] || ""}
                                    onChange={(e) => {
                                      const data = q.data as MatchingData
                                      updateQuestionData(qIndex, {
                                        correctPairs: { ...data.correctPairs, [leftItem.id]: e.target.value }
                                      })
                                    }}
                                    className="text-xs border rounded px-1 py-0.5"
                                  >
                                    <option value="">Выберите</option>
                                    {(q.data as MatchingData).rightItems.map((rightItem, rIdx) => (
                                      <option key={rightItem.id} value={rightItem.id}>
                                        {rightItem.text || `П${rIdx + 1}`}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ORDERING Editor */}
                        {q.type === "ORDERING" && q.data && "correctOrder" in q.data && (
                          <div className="ml-7 space-y-2">
                            <p className="text-xs text-gray-500 mb-2">
                              Введите элементы в правильном порядке (сверху вниз)
                            </p>
                            {(q.data as OrderingData).items.map((item, idx) => (
                              <div key={item.id} className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                                  {idx + 1}
                                </span>
                                <Input
                                  value={item.text}
                                  onChange={(e) => {
                                    const data = q.data as OrderingData
                                    const newItems = [...data.items]
                                    newItems[idx] = { ...newItems[idx], text: e.target.value }
                                    updateQuestionData(qIndex, { items: newItems })
                                  }}
                                  placeholder={`Шаг ${idx + 1}`}
                                  className="text-sm"
                                />
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                              onClick={() => {
                                const data = q.data as OrderingData
                                const newId = `s${data.items.length + 1}`
                                updateQuestionData(qIndex, {
                                  items: [...data.items, { id: newId, text: "" }],
                                  correctOrder: [...data.correctOrder, newId],
                                })
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Шаг
                            </Button>
                          </div>
                        )}

                        {/* CASE_ANALYSIS Editor */}
                        {q.type === "CASE_ANALYSIS" && q.data && "caseContent" in q.data && (
                          <div className="ml-7 space-y-3">
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1">
                                Название кейса
                              </label>
                              <Input
                                value={(q.data as CaseAnalysisData).caseLabel}
                                onChange={(e) => {
                                  updateQuestionData(qIndex, { caseLabel: e.target.value })
                                }}
                                placeholder="Например: Кейс для анализа"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1">
                                Описание кейса (Markdown)
                              </label>
                              <textarea
                                value={(q.data as CaseAnalysisData).caseContent}
                                onChange={(e) => {
                                  updateQuestionData(qIndex, { caseContent: e.target.value })
                                }}
                                className="w-full p-2 text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={4}
                                placeholder="Опишите ситуацию для анализа..."
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1">
                                Варианты ответов
                              </label>
                              {(q.data as CaseAnalysisData).options.map((opt, idx) => (
                                <div key={opt.id} className="border rounded p-2 mb-2 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const data = q.data as CaseAnalysisData
                                        const newOptions = [...data.options]
                                        newOptions[idx] = { ...newOptions[idx], isCorrect: !newOptions[idx].isCorrect }
                                        updateQuestionData(qIndex, { options: newOptions })
                                      }}
                                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                                        opt.isCorrect
                                          ? "border-green-500 bg-green-500 text-white"
                                          : "border-gray-300"
                                      }`}
                                    >
                                      {opt.isCorrect && <Check className="h-3 w-3" />}
                                    </button>
                                    <Input
                                      value={opt.text}
                                      onChange={(e) => {
                                        const data = q.data as CaseAnalysisData
                                        const newOptions = [...data.options]
                                        newOptions[idx] = { ...newOptions[idx], text: e.target.value }
                                        updateQuestionData(qIndex, { options: newOptions })
                                      }}
                                      placeholder={`Вариант ${idx + 1}`}
                                      className="text-sm"
                                    />
                                  </div>
                                  <Input
                                    value={opt.explanation}
                                    onChange={(e) => {
                                      const data = q.data as CaseAnalysisData
                                      const newOptions = [...data.options]
                                      newOptions[idx] = { ...newOptions[idx], explanation: e.target.value }
                                      updateQuestionData(qIndex, { options: newOptions })
                                    }}
                                    placeholder="Объяснение (показывается после ответа)"
                                    className="text-xs"
                                  />
                                </div>
                              ))}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs"
                                onClick={() => {
                                  const data = q.data as CaseAnalysisData
                                  const newId = `o${data.options.length + 1}`
                                  updateQuestionData(qIndex, {
                                    options: [...data.options, { id: newId, text: "", isCorrect: false, explanation: "" }],
                                  })
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" /> Вариант
                              </Button>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1">
                                Минимум правильных для успеха
                              </label>
                              <Input
                                type="number"
                                min={1}
                                value={(q.data as CaseAnalysisData).minCorrectRequired}
                                onChange={(e) => {
                                  updateQuestionData(qIndex, { minCorrectRequired: parseInt(e.target.value) || 1 })
                                }}
                                className="text-sm w-20"
                              />
                            </div>
                          </div>
                        )}
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
