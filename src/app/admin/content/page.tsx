"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
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
  Upload,
  FileText,
  Download,
  CheckCircle,
  Trash2,
  Users,
  Lock,
  GripVertical,
  BarChart3,
  History,
  Sparkles,
  AlertTriangle,
  Zap,
  FileJson,
  FileCode,
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

interface ModuleAnalytics {
  id: string
  title: string
  completedCount: number
  avgScore: number | null
  completionRate: number
}

export default function AdminContentPage() {
  const router = useRouter()
  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  // Create trail modal
  const [showTrailModal, setShowTrailModal] = useState(false)
  const [newTrailTitle, setNewTrailTitle] = useState("")
  const [newTrailSubtitle, setNewTrailSubtitle] = useState("")
  const [creatingTrail, setCreatingTrail] = useState(false)

  // Create module modal
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [selectedTrailId, setSelectedTrailId] = useState("")

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    warnings?: string[]
    parseMethod?: string
    detectedFormat?: string
    structureConfidence?: number
  } | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<"txt" | "md" | "json" | "xml">("txt")
  const [useAI, setUseAI] = useState(false)
  const [hybridMode, setHybridMode] = useState(false)
  const [aiStatus, setAiStatus] = useState<{ available: boolean; error?: string; checking: boolean }>({
    available: false,
    checking: false,
  })

  // Drag and drop
  const [draggedModule, setDraggedModule] = useState<string | null>(null)
  const [dragOverModule, setDragOverModule] = useState<string | null>(null)

  // Bulk selection
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Analytics
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analytics, setAnalytics] = useState<ModuleAnalytics[]>([])
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  // History
  const [showHistory, setShowHistory] = useState(false)
  const [auditLogs, setAuditLogs] = useState<Array<{
    id: string
    userName: string
    action: string
    entityType: string
    entityName: string
    createdAt: string
  }>>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

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

  const createModule = async (data: {
    title: string
    description: string
    type: "THEORY" | "PRACTICE" | "PROJECT"
    level: string
    points: number
    duration: string
  }) => {
    if (!selectedTrailId) return

    const res = await fetch("/api/admin/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trailId: selectedTrailId,
        ...data,
      }),
    })

    if (!res.ok) throw new Error("Failed to create")

    const newModule = await res.json()
    setShowModuleModal(false)
    // Navigate to edit the new module
    router.push(`/admin/content/modules/${newModule.id}`)
  }

  const openModuleModal = (trailId: string) => {
    setSelectedTrailId(trailId)
    setShowModuleModal(true)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      setImportResult(null)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("useAI", String(useAI))
      formData.append("hybridMode", String(hybridMode))

      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setImportResult({
          success: false,
          message: data.error || "Ошибка импорта",
          warnings: data.warnings,
          parseMethod: data.parseMethod,
          detectedFormat: data.detectedFormat,
          structureConfidence: data.structureConfidence,
        })
      } else {
        setImportResult({
          success: true,
          message: data.message,
          warnings: data.warnings,
          parseMethod: data.parseMethod,
          detectedFormat: data.detectedFormat,
          structureConfidence: data.structureConfidence,
        })
        fetchTrails()
      }
    } catch {
      setImportResult({ success: false, message: "Ошибка при загрузке файла" })
    } finally {
      setImporting(false)
      // Reset file input
      e.target.value = ""
    }
  }

  const checkAIStatus = async () => {
    setAiStatus({ available: false, checking: true })
    try {
      const res = await fetch("/api/admin/import?action=check-ai")
      const data = await res.json()
      setAiStatus({
        available: data.available,
        error: data.error,
        checking: false,
      })
    } catch {
      setAiStatus({
        available: false,
        error: "Ошибка проверки AI",
        checking: false,
      })
    }
  }

  const sampleFormats: Record<string, string> = {
    txt: `=== TRAIL ===
название: Vibe Coding
slug: vibe-coding
подзаголовок: Научись кодить с AI
описание: Полный курс по Vibe Coding
иконка: 💻
цвет: #6366f1

=== MODULE ===
название: Введение в Vibe Coding
slug: intro-vibe-coding
тип: урок
очки: 50
описание: Основы работы с AI-ассистентами
---
# Добро пожаловать в Vibe Coding!

Vibe Coding — это современный подход к программированию...
---

=== ВОПРОСЫ ===
В: Что такое Vibe Coding?
- Программирование без компьютера
- Программирование с помощью AI *
- Визуальное программирование
- Игра`,

    md: `# Vibe Coding

Научись кодить с AI

## Введение в Vibe Coding

Основы работы с AI-ассистентами

### Добро пожаловать!

Vibe Coding — это современный подход к программированию с использованием AI.

### Вопросы

В: Что такое Vibe Coding?
- Программирование без компьютера
- Программирование с помощью AI *
- Визуальное программирование
- Игра`,

    json: JSON.stringify({
      trails: [{
        title: "Vibe Coding",
        slug: "vibe-coding",
        subtitle: "Научись кодить с AI",
        icon: "💻",
        color: "#6366f1",
        modules: [{
          title: "Введение в Vibe Coding",
          slug: "intro-vibe-coding",
          type: "THEORY",
          points: 50,
          content: "# Добро пожаловать!\\n\\nVibe Coding — это...",
          questions: [{
            question: "Что такое Vibe Coding?",
            options: ["Без компьютера", "С помощью AI", "Визуальное", "Игра"],
            correctAnswer: 1
          }]
        }]
      }]
    }, null, 2),

    xml: `<?xml version="1.0" encoding="UTF-8"?>
<trails>
  <trail slug="vibe-coding">
    <title>Vibe Coding</title>
    <subtitle>Научись кодить с AI</subtitle>
    <icon>💻</icon>
    <color>#6366f1</color>
    <modules>
      <module slug="intro-vibe-coding">
        <title>Введение в Vibe Coding</title>
        <type>THEORY</type>
        <points>50</points>
        <content>Контент модуля...</content>
        <questions>
          <question>
            <text>Что такое Vibe Coding?</text>
            <options>
              <option>Без компьютера</option>
              <option correct="true">С помощью AI</option>
            </options>
          </question>
        </questions>
      </module>
    </modules>
  </trail>
</trails>`,
  }

  const downloadSample = (format: string = selectedFormat) => {
    const content = sampleFormats[format] || sampleFormats.txt
    const mimeTypes: Record<string, string> = {
      txt: "text/plain",
      md: "text/markdown",
      json: "application/json",
      xml: "application/xml",
    }
    const blob = new Blob([content], { type: mimeTypes[format] || "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sample-import.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatIcons: Record<string, typeof FileText> = {
    txt: FileText,
    md: FileCode,
    json: FileJson,
    xml: FileCode,
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
      if (!res.ok) throw new Error("Failed to delete")
      fetchTrails()
      showToast("Trail удалён", "success")
    } catch {
      showToast("Ошибка при удалении trail", "error")
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
      if (!res.ok) throw new Error("Failed to delete")
      fetchTrails()
      showToast("Модуль удалён", "success")
    } catch {
      showToast("Ошибка при удалении модуля", "error")
    }
  }

  // Drag and drop handlers
  const handleDragStart = (moduleId: string) => {
    setDraggedModule(moduleId)
  }

  const handleDragOver = (e: React.DragEvent, moduleId: string) => {
    e.preventDefault()
    if (draggedModule !== moduleId) {
      setDragOverModule(moduleId)
    }
  }

  const handleDragLeave = () => {
    setDragOverModule(null)
  }

  const handleDrop = async (e: React.DragEvent, targetModuleId: string, trailId: string) => {
    e.preventDefault()
    if (!draggedModule || draggedModule === targetModuleId) {
      setDraggedModule(null)
      setDragOverModule(null)
      return
    }

    // Find the trail and reorder modules
    const trail = trails.find((t) => t.id === trailId)
    if (!trail) return

    const modules = [...trail.modules]
    const draggedIndex = modules.findIndex((m) => m.id === draggedModule)
    const targetIndex = modules.findIndex((m) => m.id === targetModuleId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Reorder
    const [removed] = modules.splice(draggedIndex, 1)
    modules.splice(targetIndex, 0, removed)

    // Update local state immediately for responsiveness
    setTrails((prev) =>
      prev.map((t) =>
        t.id === trailId ? { ...t, modules } : t
      )
    )

    // Save to server
    try {
      const res = await fetch("/api/admin/modules/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trailId,
          moduleIds: modules.map((m) => m.id),
        }),
      })
      if (!res.ok) throw new Error("Failed to reorder")
    } catch {
      setError("Ошибка при изменении порядка")
      fetchTrails() // Revert on error
    }

    setDraggedModule(null)
    setDragOverModule(null)
  }

  // Bulk selection
  const toggleModuleSelection = (moduleId: string) => {
    setSelectedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  const toggleSelectAllInTrail = (trailId: string) => {
    const trail = trails.find((t) => t.id === trailId)
    if (!trail) return

    // Check if all modules in trail are already selected
    const allSelected = trail.modules.every((m) => selectedModules.has(m.id))

    setSelectedModules((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        // Deselect all in this trail
        trail.modules.forEach((m) => next.delete(m.id))
      } else {
        // Select all in this trail
        trail.modules.forEach((m) => next.add(m.id))
      }
      return next
    })
  }

  // Check if all modules in a trail are selected
  const isAllSelectedInTrail = (trailId: string) => {
    const trail = trails.find((t) => t.id === trailId)
    if (!trail || trail.modules.length === 0) return false
    return trail.modules.every((m) => selectedModules.has(m.id))
  }

  const clearSelection = () => {
    setSelectedModules(new Set())
  }

  const bulkDeleteModules = async () => {
    if (selectedModules.size === 0) return

    const confirmed = await confirm({
      title: "Удалить модули?",
      message: `Вы уверены, что хотите удалить ${selectedModules.size} модулей?`,
      confirmText: "Удалить",
      variant: "danger",
    })

    if (!confirmed) return

    try {
      setBulkDeleting(true)
      const res = await fetch("/api/admin/modules/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleIds: Array.from(selectedModules) }),
      })

      if (!res.ok) throw new Error("Failed to delete")

      setSelectedModules(new Set())
      fetchTrails()
      showToast(`Удалено ${selectedModules.size} модулей`, "success")
    } catch {
      showToast("Ошибка при массовом удалении", "error")
    } finally {
      setBulkDeleting(false)
    }
  }

  // Export content
  const exportContent = async (trailId?: string) => {
    try {
      const url = trailId
        ? `/api/admin/export-content?trailId=${trailId}`
        : "/api/admin/export-content"
      const res = await fetch(url)
      if (!res.ok) throw new Error("Export failed")

      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = trailId
        ? `trail-export-${new Date().toISOString().split("T")[0]}.txt`
        : `all-content-${new Date().toISOString().split("T")[0]}.txt`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(blobUrl)
      document.body.removeChild(a)
    } catch {
      setError("Ошибка экспорта")
    }
  }

  // Analytics
  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true)
      const res = await fetch("/api/admin/analytics/modules")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setAnalytics(data.analytics)
      setShowAnalytics(true)
    } catch {
      setError("Ошибка загрузки аналитики")
    } finally {
      setLoadingAnalytics(false)
    }
  }

  // Audit history
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true)
      const res = await fetch("/api/admin/audit-logs?limit=50")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setAuditLogs(data)
      setShowHistory(true)
    } catch {
      setError("Ошибка загрузки истории")
    } finally {
      setLoadingHistory(false)
    }
  }

  // Get analytics for a specific module
  const getModuleAnalytics = useCallback((moduleId: string) => {
    return analytics.find((a) => a.id === moduleId)
  }, [analytics])

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
          <Breadcrumbs
            items={[
              { label: "Админ", href: "/admin/invites" },
              { label: "Контент" },
            ]}
            className="mb-4"
          />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Управление контентом
              </h1>
              <p className="text-gray-600 mt-1">
                Редактирование теории, вопросов и проектов
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/teachers">
                  <Users className="h-4 w-4 mr-2" />
                  Учителя
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/access">
                  <Lock className="h-4 w-4 mr-2" />
                  Доступ
                </Link>
              </Button>
              <Button onClick={() => fetchAnalytics()} variant="outline" size="sm" disabled={loadingAnalytics}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Аналитика
              </Button>
              <Button onClick={() => fetchHistory()} variant="outline" size="sm" disabled={loadingHistory}>
                <History className="h-4 w-4 mr-2" />
                История
              </Button>
              <Button onClick={() => exportContent()} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </Button>
              <Button onClick={() => setShowImportModal(true)} variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Импорт
              </Button>
              <Button onClick={() => setShowTrailModal(true)} className="bg-green-600 hover:bg-green-700" size="sm">
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
        {/* Bulk actions bar */}
        {selectedModules.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-blue-700 font-medium">
                Выбрано: {selectedModules.size} модулей
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
              >
                Снять выделение
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={bulkDeleteModules}
                disabled={bulkDeleting}
              >
                {bulkDeleting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Удалить выбранные
              </Button>
            </div>
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {trail.modules.length} модулей
                        </span>
                        <Button
                          size="sm"
                          variant={isAllSelectedInTrail(trail.id) ? "default" : "ghost"}
                          onClick={() => toggleSelectAllInTrail(trail.id)}
                          title={isAllSelectedInTrail(trail.id) ? "Снять выделение" : "Выбрать все модули"}
                          className={isAllSelectedInTrail(trail.id) ? "bg-blue-600 hover:bg-blue-700" : ""}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => exportContent(trail.id)}
                          title="Экспорт trail"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModuleModal(trail.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Модуль
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteTrail(trail.id, trail.title)}
                        >
                          <Trash2 className="h-4 w-4" />
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
                                const moduleAnalytics = getModuleAnalytics(module.id)
                                return (
                                  <div
                                    key={module.id}
                                    draggable
                                    onDragStart={() => handleDragStart(module.id)}
                                    onDragOver={(e) => handleDragOver(e, module.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, module.id, trail.id)}
                                    className={`flex items-center gap-3 p-3 rounded-lg border bg-white transition-colors ${
                                      draggedModule === module.id ? "opacity-50" : ""
                                    } ${
                                      dragOverModule === module.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                                    }`}
                                  >
                                    <div className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600">
                                      <GripVertical className="h-4 w-4" />
                                    </div>
                                    <Checkbox
                                      checked={selectedModules.has(module.id)}
                                      onCheckedChange={() => toggleModuleSelection(module.id)}
                                    />
                                    <Link href={`/admin/content/modules/${module.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 shrink-0">
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
                                          {moduleAnalytics && (
                                            <Badge className="text-xs shrink-0 bg-green-100 text-green-700 border-0">
                                              {moduleAnalytics.completedCount} прошли
                                            </Badge>
                                          )}
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
                                        {moduleAnalytics?.avgScore && (
                                          <span className="text-blue-600">{moduleAnalytics.avgScore}/10</span>
                                        )}
                                        <span>{module.points} XP</span>
                                        <ChevronRight className="h-4 w-4" />
                                      </div>
                                    </Link>
                                    <button
                                      onClick={() => deleteModule(module.id, module.title)}
                                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded shrink-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
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
                              {projectModules.map((module) => {
                                const moduleAnalytics = getModuleAnalytics(module.id)
                                return (
                                  <div
                                    key={module.id}
                                    draggable
                                    onDragStart={() => handleDragStart(module.id)}
                                    onDragOver={(e) => handleDragOver(e, module.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, module.id, trail.id)}
                                    className={`flex items-center gap-3 p-3 rounded-lg border bg-white transition-colors ${
                                      draggedModule === module.id ? "opacity-50" : ""
                                    } ${
                                      dragOverModule === module.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                                    }`}
                                  >
                                    <div className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600">
                                      <GripVertical className="h-4 w-4" />
                                    </div>
                                    <Checkbox
                                      checked={selectedModules.has(module.id)}
                                      onCheckedChange={() => toggleModuleSelection(module.id)}
                                    />
                                    <Link href={`/admin/content/modules/${module.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 shrink-0">
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
                                          {moduleAnalytics && (
                                            <Badge className="text-xs shrink-0 bg-green-100 text-green-700 border-0">
                                              {moduleAnalytics.completedCount} прошли
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-500 truncate">
                                          {module.description}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-gray-500 shrink-0">
                                        {moduleAnalytics?.avgScore && (
                                          <span className="text-blue-600">{moduleAnalytics.avgScore}/10</span>
                                        )}
                                        <span>{module.duration}</span>
                                        <span>{module.points} XP</span>
                                        <ChevronRight className="h-4 w-4" />
                                      </div>
                                    </Link>
                                    <button
                                      onClick={() => deleteModule(module.id, module.title)}
                                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded shrink-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                )
                              })}
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
      <CreateModuleModal
        open={showModuleModal}
        onClose={() => setShowModuleModal(false)}
        onSubmit={createModule}
        trailId={selectedTrailId}
      />

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Умный импорт контента
              </h2>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportResult(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Результат импорта */}
              {importResult && (
                <div className={`p-4 rounded-lg mb-4 ${
                  importResult.success
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}>
                  <div className="flex items-start gap-2">
                    {importResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <X className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span className={importResult.success ? "text-green-700" : "text-red-700"}>
                        {importResult.message}
                      </span>
                      {importResult.parseMethod && (
                        <div className="mt-1 text-xs text-gray-500">
                          Метод: {importResult.parseMethod === "ai" ? "AI" : importResult.parseMethod === "hybrid" ? "Гибридный" : "Кодовый"}
                          {importResult.detectedFormat && ` • Формат: ${importResult.detectedFormat}`}
                          {importResult.structureConfidence !== undefined && ` • Уверенность: ${importResult.structureConfidence}%`}
                        </div>
                      )}
                      {importResult.warnings && importResult.warnings.length > 0 && (
                        <div className="mt-2 text-sm text-yellow-700">
                          <div className="flex items-center gap-1 font-medium">
                            <AlertTriangle className="h-4 w-4" />
                            Предупреждения:
                          </div>
                          <ul className="list-disc list-inside mt-1">
                            {importResult.warnings.slice(0, 5).map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* AI парсер */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <h3 className="font-medium text-purple-900">AI-парсер</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={checkAIStatus}
                      disabled={aiStatus.checking}
                      className="border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      {aiStatus.checking ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Проверить статус
                    </Button>
                  </div>

                  {aiStatus.checking ? (
                    <p className="text-sm text-purple-600">Проверка...</p>
                  ) : aiStatus.available ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      AI доступен
                    </div>
                  ) : aiStatus.error ? (
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      {aiStatus.error}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Нажмите для проверки доступности AI</p>
                  )}

                  <div className="mt-3 flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useAI}
                        onChange={(e) => setUseAI(e.target.checked)}
                        className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-purple-700">Использовать AI</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hybridMode}
                        onChange={(e) => setHybridMode(e.target.checked)}
                        className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-purple-700">Гибридный режим</span>
                    </label>
                  </div>

                  <p className="text-xs text-purple-500 mt-2">
                    {hybridMode
                      ? "Гибридный режим: код + AI для улучшения результата"
                      : useAI
                      ? "AI определит структуру автоматически"
                      : "Кодовый парсер с умным определением структуры"}
                  </p>
                </div>

                {/* Выбор формата */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Поддерживаемые форматы</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {(["txt", "md", "json", "xml"] as const).map((format) => {
                      const Icon = formatIcons[format]
                      return (
                        <button
                          key={format}
                          onClick={() => setSelectedFormat(format)}
                          className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                            selectedFormat === format
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:border-gray-300 text-gray-600"
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                          <span className="text-sm font-medium uppercase">{format}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Загрузка файла */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Загрузить файл</h3>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {importing ? (
                        <>
                          <RefreshCw className="h-8 w-8 text-purple-500 animate-spin mb-2" />
                          <p className="text-sm text-purple-600 font-medium">
                            {useAI ? "AI анализирует..." : "Обработка..."}
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">
                            Нажмите для выбора файла (.txt, .md, .json, .xml)
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Умный парсер автоматически определит структуру
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".txt,.md,.markdown,.json,.xml"
                      onChange={handleImport}
                      disabled={importing}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Пример формата */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">Пример формата ({selectedFormat.toUpperCase()})</h3>
                    <Button variant="outline" size="sm" onClick={() => downloadSample(selectedFormat)}>
                      <Download className="h-4 w-4 mr-2" />
                      Скачать пример
                    </Button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono overflow-x-auto max-h-48 overflow-y-auto">
                    <pre className="text-gray-700 whitespace-pre-wrap">{sampleFormats[selectedFormat]}</pre>
                  </div>
                </div>

                {/* Подсказки */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Киллер-фичи:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Умное определение</strong> - система сама найдёт заголовки, модули и вопросы</li>
                    <li>• <strong>Любой формат</strong> - txt, md, json, xml поддерживаются из коробки</li>
                    <li>• <strong>AI-парсер</strong> - для сложных случаев используйте нейросеть</li>
                    <li>• <strong>Гибридный режим</strong> - комбинация кода и AI для лучших результатов</li>
                    <li>• <strong>Правильный ответ</strong> - отмечайте звёздочкой (*) или (correct)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportModal(false)
                  setImportResult(null)
                }}
                className="w-full"
              >
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Аналитика по модулям
              </h2>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {analytics.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Нет данных</p>
              ) : (
                <div className="space-y-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Модуль</th>
                        <th className="text-center py-2 font-medium">Прошли</th>
                        <th className="text-center py-2 font-medium">% завершения</th>
                        <th className="text-center py-2 font-medium">Ср. оценка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-2">{item.title}</td>
                          <td className="text-center py-2">{item.completedCount}</td>
                          <td className="text-center py-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              item.completionRate >= 70
                                ? "bg-green-100 text-green-700"
                                : item.completionRate >= 40
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {item.completionRate}%
                            </span>
                          </td>
                          <td className="text-center py-2">
                            {item.avgScore !== null ? (
                              <span className="text-blue-600 font-medium">{item.avgScore}/10</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setShowAnalytics(false)} className="w-full">
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                История изменений
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {auditLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Нет записей</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => {
                    const actionLabels: Record<string, { label: string; color: string }> = {
                      CREATE: { label: "Создание", color: "bg-green-100 text-green-700" },
                      UPDATE: { label: "Изменение", color: "bg-blue-100 text-blue-700" },
                      DELETE: { label: "Удаление", color: "bg-red-100 text-red-700" },
                      REORDER: { label: "Сортировка", color: "bg-purple-100 text-purple-700" },
                    }
                    const actionInfo = actionLabels[log.action] || { label: log.action, color: "bg-gray-100 text-gray-700" }

                    return (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs ${actionInfo.color}`}>
                              {actionInfo.label}
                            </span>
                            <span className="text-sm font-medium">{log.entityName}</span>
                            <span className="text-xs text-gray-400">{log.entityType}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{log.userName}</span>
                            <span>•</span>
                            <span>
                              {new Date(log.createdAt).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setShowHistory(false)} className="w-full">
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
