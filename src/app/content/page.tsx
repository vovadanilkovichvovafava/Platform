"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import {
  BookOpen,
  Wrench,
  FolderGit2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Code,
  Target,
  Palette,
  Lightbulb,
  RefreshCw,
  Plus,
  X,
  Upload,
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
  Info,
  Pencil,
  FileCheck,
} from "lucide-react"
import { CreateModuleModal } from "@/components/create-module-modal"
import { EditTrailModal, TrailFormData } from "@/components/edit-trail-modal"
import { AdminTrailPasswordModal } from "@/components/admin-trail-password-modal"
import { pluralizeRu } from "@/lib/utils"

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

interface TrailTeacherAssignment {
  teacher: {
    id: string
    name: string
    email: string
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
  isRestricted: boolean
  teacherVisibility: string
  teachers: TrailTeacherAssignment[]
  modules: Module[]
  // Password protection fields
  isPasswordProtected?: boolean
  passwordHint?: string | null
  createdById?: string | null
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

interface Assignment {
  trailId: string
}

export default function UnifiedContentPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [trails, setTrails] = useState<Trail[]>([])
  const [assignedTrailIds, setAssignedTrailIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const isFullAdmin = session?.user?.role === "ADMIN"
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "CO_ADMIN"
  const isTeacher = session?.user?.role === "TEACHER"
  const isPrivileged = isAdmin || isTeacher


  // Edit trail modal
  const [showEditTrailModal, setShowEditTrailModal] = useState(false)
  const [editingTrail, setEditingTrail] = useState<TrailFormData | null>(null)
  const [trailModalMode, setTrailModalMode] = useState<"edit" | "create">("edit")

  // Password verification modal (for password-protected trails)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordTrail, setPasswordTrail] = useState<Trail | null>(null)
  const [passwordIsExpired, setPasswordIsExpired] = useState(false)

  // Tracks which password-protected trails have been verified this session
  const [verifiedTrails, setVerifiedTrails] = useState<Set<string>>(new Set())
  // Stores the action to execute after successful password verification
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  // Create module modal
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [selectedTrailId, setSelectedTrailId] = useState("")

  // Import modal (admin only)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [parsedData, setParsedData] = useState<{
    trails: Array<{
      title: string
      slug: string
      subtitle?: string
      description?: string
      icon?: string
      color?: string
      modules: Array<{
        title: string
        slug: string
        type: "THEORY" | "PRACTICE" | "PROJECT"
        points: number
        description?: string
        content?: string
        questions: Array<{
          question: string
          options: string[]
          correctAnswer: number
        }>
      }>
    }>
    warnings?: string[]
    parseMethod?: string
    detectedFormat?: string
    structureConfidence?: number
    confidenceDetails?: {
      totalScore: number
      maxPossibleScore: number
      percentage: number
      criteria: Array<{
        name: string
        description: string
        score: number
        maxScore: number
        met: boolean
      }>
    }
  } | null>(null)
  const [showConfidenceDetails, setShowConfidenceDetails] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [aiStatus, setAiStatus] = useState<{ available: boolean; error?: string; checking: boolean }>({
    available: false,
    checking: false,
  })
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [useNeuralParser, setUseNeuralParser] = useState(true)

  // Progress tracking для импорта
  const [importProgress, setImportProgress] = useState<{
    current: number
    total: number
    status: string
    phase: string
  } | null>(null)

  // Drag and drop
  const [draggedModule, setDraggedModule] = useState<string | null>(null)
  const [dragOverModule, setDragOverModule] = useState<string | null>(null)

  // Bulk selection
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // History (admin only)
  const [showHistory, setShowHistory] = useState(false)

  // Track which trails are expanded (default: all collapsed)
  const [expandedTrails, setExpandedTrails] = useState<Set<string>>(new Set())
  const [auditLogs, setAuditLogs] = useState<Array<{
    id: string
    userName: string
    action: string
    entityType: string
    entityName: string
    createdAt: string
  }>>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      // Fetch trails
      const trailsRes = await fetch("/api/admin/trails")
      if (!trailsRes.ok) throw new Error("Failed to fetch trails")
      const trailsData = await trailsRes.json()
      setTrails(trailsData)

      // For teachers, also fetch assignments to filter visible trails
      if (isTeacher && !isAdmin) {
        const assignmentsRes = await fetch("/api/teacher/assignments")
        if (assignmentsRes.ok) {
          const assignmentsData = await assignmentsRes.json()
          setAssignedTrailIds(assignmentsData.map((a: Assignment) => a.trailId))
        }
      }
    } catch {
      setError("Ошибка загрузки данных")
    } finally {
      setLoading(false)
    }
  }, [isTeacher, isAdmin])

  useEffect(() => {
    if (status === "loading") return
    if (!isPrivileged) {
      router.push("/dashboard")
      return
    }
    fetchData()
  }, [status, isPrivileged, router, fetchData])

  // Check if a trail is locked for the current user (requires password)
  const isTrailLocked = useCallback((trail: Trail): boolean => {
    if (!trail.isPasswordProtected) return false
    if (trail.createdById === session?.user?.id) return false
    if (verifiedTrails.has(trail.id)) return false
    return true
  }, [session?.user?.id, verifiedTrails])

  // Guard any trail action behind password verification
  const guardTrailAction = useCallback(async (trail: Trail, action: () => void) => {
    if (!isTrailLocked(trail)) {
      action()
      return
    }

    // Check server-side if password is already unlocked (from a previous session)
    try {
      const res = await fetch(`/api/admin/trails/${trail.id}/password-status`)
      if (res.ok) {
        const data = await res.json()
        if (!data.needsPassword) {
          // Already unlocked on server, update local state and proceed
          setVerifiedTrails(prev => new Set(prev).add(trail.id))
          action()
          return
        }
        setPasswordIsExpired(data.isExpired)
      }
    } catch {
      // On error, fall through to show password modal
    }

    // Password required — show modal with pending action
    setPasswordTrail(trail)
    setPendingAction(() => action)
    setShowPasswordModal(true)
  }, [isTrailLocked])

  // Filter trails for teachers
  const visibleTrails = isAdmin
    ? trails
    : trails.filter((t) => assignedTrailIds.includes(t.id))

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
    router.push(`/content/modules/${newModule.id}`)
  }

  const openModuleModal = (trailId: string) => {
    setSelectedTrailId(trailId)
    setShowModuleModal(true)
  }

  const openCreateTrailModal = () => {
    setEditingTrail(null)
    setTrailModalMode("create")
    setShowEditTrailModal(true)
  }

  // Proceed to open edit modal (called directly or after password verification)
  const proceedToEditModal = (trail: Trail) => {
    const assignedTeacherId = trail.teacherVisibility === "SPECIFIC" && trail.teachers.length > 0
      ? trail.teachers[0].teacher.id
      : null

    setEditingTrail({
      id: trail.id,
      title: trail.title,
      subtitle: trail.subtitle,
      description: trail.description,
      icon: trail.icon,
      color: trail.color,
      duration: trail.duration,
      isPublished: trail.isPublished,
      isRestricted: trail.isRestricted,
      teacherVisibility: trail.teacherVisibility || "ADMIN_ONLY",
      assignedTeacherId,
      isPasswordProtected: trail.isPasswordProtected,
      passwordHint: trail.passwordHint,
      createdById: trail.createdById,
    })
    setTrailModalMode("edit")
    setShowEditTrailModal(true)
  }

  const openEditTrailModal = async (trail: Trail) => {
    guardTrailAction(trail, () => proceedToEditModal(trail))
  }

  // Called when password is successfully entered
  const handlePasswordSuccess = () => {
    setShowPasswordModal(false)
    if (passwordTrail) {
      setVerifiedTrails(prev => new Set(prev).add(passwordTrail.id))
    }
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
    setPasswordTrail(null)
  }

  const handleTrailSave = () => {
    fetchData()
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      setParsedData(null)
      setParseError(null)
      setUploadedFile(file)
      setImportProgress({ current: 0, total: 100, status: "Подготовка...", phase: "analyzing" })

      const formData = new FormData()
      formData.append("file", file)
      formData.append("useAI", useNeuralParser ? "true" : "false")
      formData.append("forceAI", useNeuralParser ? "true" : "false")

      const res = await fetch("/api/admin/import/stream", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json()
        setParseError(errorData.error || "Ошибка при загрузке файла")
        setParsedData(null)
        setImportProgress(null)
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        setParseError("Не удалось создать поток для чтения")
        setParsedData(null)
        setImportProgress(null)
        return
      }

      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6))

              if (event.type === "progress") {
                setImportProgress({
                  current: event.current || 0,
                  total: event.total || 100,
                  status: event.status || "Обработка...",
                  phase: event.phase || "parsing"
                })
              } else if (event.type === "complete") {
                const data = event.result
                if (!data.success || !data.trails || data.trails.length === 0) {
                  const errorDetails = data.details?.length > 0
                    ? `\n${data.details.join("; ")}`
                    : ""
                  setParseError((data.error || "Не удалось распознать структуру файла") + errorDetails)
                  setParsedData(null)
                } else {
                  setParsedData({
                    trails: data.trails,
                    warnings: data.warnings,
                    parseMethod: data.parseMethod,
                    detectedFormat: data.detectedFormat,
                    structureConfidence: data.structureConfidence,
                    confidenceDetails: data.confidenceDetails,
                  })
                  setParseError(null)
                }
                setImportProgress(null)
              } else if (event.type === "error") {
                setParseError(event.error || "Неизвестная ошибка")
                setParsedData(null)
                setImportProgress(null)
              }
            } catch {
              console.error("Failed to parse SSE event:", line)
            }
          }
        }
      }
    } catch {
      setParseError("Ошибка при загрузке файла")
      setParsedData(null)
      setImportProgress(null)
    } finally {
      setImporting(false)
      e.target.value = ""
    }
  }

  const handleSaveImport = async () => {
    if (!parsedData?.trails) return

    try {
      setSaving(true)
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          trails: parsedData.trails,
        }),
      })

      const data = await res.json()

      if (data.success) {
        showToast(data.message || "Контент успешно добавлен", "success")
        setShowImportModal(false)
        setParsedData(null)
        setUploadedFile(null)
        fetchData()
      } else {
        showToast(data.error || "Ошибка сохранения", "error")
      }
    } catch {
      showToast("Ошибка при сохранении", "error")
    } finally {
      setSaving(false)
    }
  }

  const resetImportModal = () => {
    setShowImportModal(false)
    setParsedData(null)
    setParseError(null)
    setUploadedFile(null)
    setShowConfidenceDetails(false)
    setImportProgress(null)
  }

  const handleRegenerate = async () => {
    if (!uploadedFile) return

    try {
      setRegenerating(true)
      setParsedData(null)
      setParseError(null)
      setImportProgress({ current: 0, total: 100, status: "Подготовка к перегенерации...", phase: "analyzing" })

      const formData = new FormData()
      formData.append("file", uploadedFile)
      formData.append("useAI", useNeuralParser ? "true" : "false")
      formData.append("forceAI", useNeuralParser ? "true" : "false")

      const res = await fetch("/api/admin/import/stream", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json()
        setParseError(errorData.error || "Ошибка при перегенерации")
        setParsedData(null)
        setImportProgress(null)
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        setParseError("Не удалось создать поток для чтения")
        setParsedData(null)
        setImportProgress(null)
        return
      }

      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6))

              if (event.type === "progress") {
                setImportProgress({
                  current: event.current || 0,
                  total: event.total || 100,
                  status: event.status || "Обработка...",
                  phase: event.phase || "parsing"
                })
              } else if (event.type === "complete") {
                const data = event.result
                if (!data.success || !data.trails || data.trails.length === 0) {
                  const errorDetails = data.details?.length > 0
                    ? `\n${data.details.join("; ")}`
                    : ""
                  setParseError((data.error || "AI не смог распознать структуру") + errorDetails)
                  setParsedData(null)
                } else {
                  setParsedData({
                    trails: data.trails,
                    warnings: data.warnings,
                    parseMethod: data.parseMethod,
                    detectedFormat: data.detectedFormat,
                    structureConfidence: data.structureConfidence,
                    confidenceDetails: data.confidenceDetails,
                  })
                  setParseError(null)
                }
                setImportProgress(null)
              } else if (event.type === "error") {
                setParseError(event.error || "Неизвестная ошибка")
                setParsedData(null)
                setImportProgress(null)
              }
            } catch {
              console.error("Failed to parse SSE event:", line)
            }
          }
        }
      }
    } catch {
      setParseError("Ошибка при перегенерации")
      setParsedData(null)
      setImportProgress(null)
    } finally {
      setRegenerating(false)
    }
  }

  const checkAIStatus = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    if (showImportModal && isAdmin) {
      checkAIStatus()
    }
  }, [showImportModal, checkAIStatus, isAdmin])

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
      fetchData()
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
      fetchData()
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

    const trail = visibleTrails.find((t) => t.id === trailId)
    if (!trail) return

    const modules = [...trail.modules]
    const draggedIndex = modules.findIndex((m) => m.id === draggedModule)
    const targetIndex = modules.findIndex((m) => m.id === targetModuleId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const [removed] = modules.splice(draggedIndex, 1)
    modules.splice(targetIndex, 0, removed)

    setTrails((prev) =>
      prev.map((t) =>
        t.id === trailId ? { ...t, modules } : t
      )
    )

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
      fetchData()
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
    const trail = visibleTrails.find((t) => t.id === trailId)
    if (!trail) return

    const allSelected = trail.modules.every((m) => selectedModules.has(m.id))

    setSelectedModules((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        trail.modules.forEach((m) => next.delete(m.id))
      } else {
        trail.modules.forEach((m) => next.add(m.id))
      }
      return next
    })
  }

  const isAllSelectedInTrail = (trailId: string) => {
    const trail = visibleTrails.find((t) => t.id === trailId)
    if (!trail || trail.modules.length === 0) return false
    return trail.modules.every((m) => selectedModules.has(m.id))
  }

  // Toggle trail expansion (unguarded - used after password verification)
  const doToggleTrailExpanded = (trailId: string) => {
    setExpandedTrails((prev) => {
      const next = new Set(prev)
      if (next.has(trailId)) {
        next.delete(trailId)
      } else {
        next.add(trailId)
      }
      return next
    })
  }

  // Toggle trail expansion with password guard
  const toggleTrailExpanded = (trail: Trail) => {
    // Collapsing is always allowed
    if (expandedTrails.has(trail.id)) {
      doToggleTrailExpanded(trail.id)
      return
    }
    // Expanding requires password for locked trails
    guardTrailAction(trail, () => doToggleTrailExpanded(trail.id))
  }

  const isTrailExpanded = (trailId: string) => expandedTrails.has(trailId)

  const clearSelection = () => {
    setSelectedModules(new Set())
  }

  const bulkDeleteModules = async () => {
    if (selectedModules.size === 0) return

    const confirmed = await confirm({
      title: "Удалить модули?",
      message: `Вы уверены, что хотите удалить ${selectedModules.size} ${pluralizeRu(selectedModules.size, ["модуль", "модуля", "модулей"])}?`,
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
      fetchData()
      showToast(`Удалено ${selectedModules.size} ${pluralizeRu(selectedModules.size, ["модуль", "модуля", "модулей"])}`, "success")
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

  // Audit history (admin only)
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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!isPrivileged) {
    return null
  }

  if (error && !trails.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  // Determine analytics link based on role
  const analyticsHref = isAdmin ? "/admin/analytics" : "/teacher/analytics"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Breadcrumbs
            items={[
              { label: isAdmin ? "Админ" : "Учитель", href: isAdmin ? "/admin/invites" : "/teacher" },
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
                {isAdmin
                  ? "Редактирование теории, вопросов и проектов"
                  : "Просмотр назначенных trails (только чтение)"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Teacher-specific buttons */}
              {isTeacher && (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/teacher/students">
                      <Users className="h-4 w-4 mr-2" />
                      Ученики
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/teacher">
                      <FileCheck className="h-4 w-4 mr-2" />
                      Работы на проверку
                    </Link>
                  </Button>
                </>
              )}

              {/* Admin-specific buttons */}
              {isAdmin && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/access">
                    <Lock className="h-4 w-4 mr-2" />
                    Доступы
                  </Link>
                </Button>
              )}

              {/* Analytics - both roles */}
              <Button asChild variant="outline" size="sm">
                <Link href={analyticsHref}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Аналитика
                </Link>
              </Button>

              {/* History - admin only */}
              {isAdmin && (
                <Button onClick={() => fetchHistory()} variant="outline" size="sm" disabled={loadingHistory}>
                  <History className="h-4 w-4 mr-2" />
                  История
                </Button>
              )}

              {/* Export - both roles */}
              <Button onClick={() => exportContent()} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </Button>

              {/* Import - admin only */}
              {isAdmin && (
                <Button onClick={() => setShowImportModal(true)} variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Импорт
                </Button>
              )}

              {/* New Trail - admin only (TEACHER cannot create) */}
              {isAdmin && (
                <Button onClick={() => openCreateTrailModal()} className="bg-green-600 hover:bg-green-700" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Новый Trail
                </Button>
              )}

              <Button onClick={fetchData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Role indicator */}
          <div className="mt-4 flex items-center gap-2">
            <Badge
              variant={isFullAdmin ? "default" : "secondary"}
              className={isFullAdmin ? "bg-purple-600" : session?.user?.role === "CO_ADMIN" ? "bg-indigo-600" : "bg-blue-600"}
            >
              {isFullAdmin ? "Администратор" : session?.user?.role === "CO_ADMIN" ? "Со-администратор" : "Учитель"}
            </Badge>
            {!isAdmin && (
              <span className="text-sm text-gray-500">
                Показаны только назначенные trails ({visibleTrails.length})
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            {error}
            <button onClick={() => setError("")} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Bulk actions bar */}
        {selectedModules.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-blue-700 font-medium">
                Выбрано: {selectedModules.size} {pluralizeRu(selectedModules.size, ["модуль", "модуля", "модулей"])}
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
          {visibleTrails.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500 mb-4">
                  {isAdmin ? "Нет trails" : "Нет назначенных trails"}
                </p>
                {isAdmin && (
                  <Button onClick={() => openCreateTrailModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Создать первый Trail
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            visibleTrails.map((trail) => {
              const Icon = iconMap[trail.icon] || Code
              const assessmentModules = trail.modules.filter(m => m.type !== "PROJECT")
              const projectModules = trail.modules.filter(m => m.type === "PROJECT")

              return (
                <Card key={trail.id}>
                  <CardHeader
                    className="cursor-pointer select-none"
                    onClick={() => toggleTrailExpanded(trail)}
                    role="button"
                    aria-expanded={isTrailExpanded(trail.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        toggleTrailExpanded(trail)
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Expand/Collapse indicator */}
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleTrailExpanded(trail)
                        }}
                        aria-label={isTrailExpanded(trail.id) ? "Свернуть" : "Развернуть"}
                      >
                        {isTrailExpanded(trail.id) ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
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
                          {isAdmin && trail.teacherVisibility === "ALL_TEACHERS" && (
                            <Badge className="bg-blue-100 text-blue-700 border-0">
                              <Users className="h-3 w-3 mr-1" />
                              Все учителя
                            </Badge>
                          )}
                          {isAdmin && trail.teacherVisibility === "SPECIFIC" && trail.teachers.length > 0 && (
                            <Badge className="bg-purple-100 text-purple-700 border-0">
                              <Users className="h-3 w-3 mr-1" />
                              {trail.teachers[0].teacher.name}
                            </Badge>
                          )}
                          {trail.isPasswordProtected && (
                            <Badge className="bg-amber-100 text-amber-700 border-0">
                              <Lock className="h-3 w-3 mr-1" />
                              Пароль
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{trail.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm text-gray-500">
                          {trail.modules.length} {pluralizeRu(trail.modules.length, ["модуль", "модуля", "модулей"])}
                        </span>
                        {isTrailLocked(trail) && (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-300 border">
                            <Lock className="h-3 w-3 mr-1" />
                            Заблокирован
                          </Badge>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant={isAllSelectedInTrail(trail.id) ? "default" : "ghost"}
                            onClick={() => guardTrailAction(trail, () => toggleSelectAllInTrail(trail.id))}
                            title={isAllSelectedInTrail(trail.id) ? "Снять выделение" : "Выбрать все модули"}
                            className={isAllSelectedInTrail(trail.id) ? "bg-blue-600 hover:bg-blue-700" : ""}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditTrailModal(trail)}
                            title="Редактировать trail"
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {(!trail.isPasswordProtected || trail.createdById === session?.user?.id) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => guardTrailAction(trail, () => exportContent(trail.id))}
                            title="Экспорт trail"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => guardTrailAction(trail, () => openModuleModal(trail.id))}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Модуль
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost-destructive"
                            onClick={() => guardTrailAction(trail, () => deleteTrail(trail.id, trail.title))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {isTrailExpanded(trail.id) && <CardContent>
                    {isTrailLocked(trail) ? (
                      /* Locked trail — show password gate instead of modules */
                      <div
                        className="flex flex-col items-center justify-center py-8 cursor-pointer rounded-lg hover:bg-amber-50/50 transition-colors"
                        onClick={() => guardTrailAction(trail, () => {})}
                      >
                        <div
                          className="flex h-14 w-14 items-center justify-center rounded-full mb-3"
                          style={{ backgroundColor: `${trail.color}15` }}
                        >
                          <Lock className="h-7 w-7 text-amber-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Требуется пароль
                        </p>
                        <p className="text-xs text-gray-500">
                          Нажмите для ввода пароля и просмотра содержимого
                        </p>
                      </div>
                    ) : trail.modules.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p className="mb-3">Нет модулей</p>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openModuleModal(trail.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Добавить модуль
                          </Button>
                        )}
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
                                  <div
                                    key={module.id}
                                    draggable={isAdmin}
                                    onDragStart={isAdmin ? () => handleDragStart(module.id) : undefined}
                                    onDragOver={isAdmin ? (e) => handleDragOver(e, module.id) : undefined}
                                    onDragLeave={isAdmin ? handleDragLeave : undefined}
                                    onDrop={isAdmin ? (e) => handleDrop(e, module.id, trail.id) : undefined}
                                    className={`group flex items-center gap-3 p-3 rounded-lg border bg-white transition-colors ${
                                      draggedModule === module.id ? "opacity-50" : ""
                                    } ${
                                      dragOverModule === module.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                                    }`}
                                  >
                                    {isAdmin && (
                                      <div className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600">
                                        <GripVertical className="h-4 w-4" />
                                      </div>
                                    )}
                                    {isAdmin && (
                                      <Checkbox
                                        checked={selectedModules.has(module.id)}
                                        onCheckedChange={() => toggleModuleSelection(module.id)}
                                      />
                                    )}
                                    <Link href={`/content/modules/${module.id}`} className="flex items-center gap-3 flex-1 min-w-0">
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
                                    {isAdmin && (
                                      <div className="shrink-0 border-l pl-2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => deleteModule(module.id, module.title)}
                                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                          title="Удалить модуль"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    )}
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
                              {projectModules.map((module) => (
                                <div
                                  key={module.id}
                                  draggable={isAdmin}
                                  onDragStart={isAdmin ? () => handleDragStart(module.id) : undefined}
                                  onDragOver={isAdmin ? (e) => handleDragOver(e, module.id) : undefined}
                                  onDragLeave={isAdmin ? handleDragLeave : undefined}
                                  onDrop={isAdmin ? (e) => handleDrop(e, module.id, trail.id) : undefined}
                                  className={`group flex items-center gap-3 p-3 rounded-lg border bg-white transition-colors ${
                                    draggedModule === module.id ? "opacity-50" : ""
                                  } ${
                                    dragOverModule === module.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                                  }`}
                                >
                                  {isAdmin && (
                                    <div className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600">
                                      <GripVertical className="h-4 w-4" />
                                    </div>
                                  )}
                                  {isAdmin && (
                                    <Checkbox
                                      checked={selectedModules.has(module.id)}
                                      onCheckedChange={() => toggleModuleSelection(module.id)}
                                    />
                                  )}
                                  <Link href={`/content/modules/${module.id}`} className="flex items-center gap-3 flex-1 min-w-0">
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
                                  {isAdmin && (
                                    <div className="shrink-0 border-l pl-2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => deleteModule(module.id, module.title)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                        title="Удалить модуль"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>}
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Create Module Modal */}
      <CreateModuleModal
        open={showModuleModal}
        onClose={() => setShowModuleModal(false)}
        onSubmit={createModule}
        trailId={selectedTrailId}
      />

      {/* Import Modal - Admin Only */}
      {showImportModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Импорт контента
              </h2>
              <button
                onClick={resetImportModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Import content - simplified for brevity */}
              {!parsedData && !parseError && !regenerating && (
                <div className="space-y-6">
                  {importing && importProgress ? (
                    // Показываем прогресс-бар во время парсинга
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative">
                          <RefreshCw className="h-8 w-8 text-purple-600 animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-purple-700">
                              {importProgress.current}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-lg font-medium text-purple-700">
                            {importProgress.phase === "analyzing" && "Анализ структуры"}
                            {importProgress.phase === "metadata" && "Извлечение метаданных"}
                            {importProgress.phase === "parsing" && "Обработка контента"}
                            {importProgress.phase === "merging" && "Объединение результатов"}
                          </p>
                          <p className="text-sm text-purple-600">{importProgress.status}</p>
                        </div>
                      </div>

                      <Progress value={importProgress.current} className="h-3 mb-3" />

                      {/* Этапы парсинга */}
                      <div className="flex justify-between text-xs text-gray-500 mt-4">
                        <div className={`flex items-center gap-1 ${importProgress.current >= 5 ? "text-purple-600" : ""}`}>
                          <div className={`w-2 h-2 rounded-full ${importProgress.current >= 5 ? "bg-purple-600" : "bg-gray-300"}`} />
                          Анализ
                        </div>
                        <div className={`flex items-center gap-1 ${importProgress.current >= 10 ? "text-purple-600" : ""}`}>
                          <div className={`w-2 h-2 rounded-full ${importProgress.current >= 10 ? "bg-purple-600" : "bg-gray-300"}`} />
                          Метаданные
                        </div>
                        <div className={`flex items-center gap-1 ${importProgress.current >= 50 ? "text-purple-600" : ""}`}>
                          <div className={`w-2 h-2 rounded-full ${importProgress.current >= 50 ? "bg-purple-600" : "bg-gray-300"}`} />
                          Парсинг
                        </div>
                        <div className={`flex items-center gap-1 ${importProgress.current >= 95 ? "text-purple-600" : ""}`}>
                          <div className={`w-2 h-2 rounded-full ${importProgress.current >= 95 ? "bg-purple-600" : "bg-gray-300"}`} />
                          Финализация
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 mt-4 text-center">
                        Большие файлы могут обрабатываться несколько минут
                      </p>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col items-center justify-center">
                        <Upload className="h-12 w-12 text-gray-400 mb-3" />
                        <p className="text-lg text-gray-600 font-medium">Выберите файл для импорта</p>
                        <p className="text-sm text-gray-400 mt-1">.txt, .md, .json, .xml, .pdf, .doc, .docx</p>
                        <p className="text-xs text-gray-400 mt-2">PDF/DOC/DOCX лучше с AI-парсером</p>
                      </div>
                      <input
                        type="file"
                        accept=".txt,.md,.markdown,.json,.xml,.pdf,.doc,.docx"
                        onChange={handleImport}
                        disabled={importing}
                        className="hidden"
                      />
                    </label>
                  )}

                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className={`h-4 w-4 ${useNeuralParser ? "text-purple-500" : "text-gray-400"}`} />
                        <span className="text-sm font-medium text-gray-700">Использовать нейросеть</span>
                      </div>
                      <Switch
                        checked={useNeuralParser}
                        onCheckedChange={setUseNeuralParser}
                        disabled={importing}
                      />
                    </div>
                    {useNeuralParser && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {aiStatus.checking ? (
                          <span className="flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Проверка AI...
                          </span>
                        ) : aiStatus.available ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            AI доступен
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500">
                            <AlertTriangle className="h-3 w-3" />
                            {aiStatus.error || "AI недоступен"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ошибка парсинга или состояние регенерации */}
              {(parseError || regenerating) && (
                <div className={`p-4 rounded-lg mb-4 ${regenerating ? "bg-purple-50 border border-purple-200" : "bg-red-50 border border-red-200"}`}>
                  <div className="flex items-start gap-2">
                    {regenerating ? (
                      <RefreshCw className="h-5 w-5 text-purple-600 mt-0.5 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      {regenerating ? (
                        <div className="space-y-3">
                          <span className="text-purple-700 font-medium">Повторная обработка с AI...</span>
                          {importProgress ? (
                            <>
                              <Progress value={importProgress.current} className="h-2" />
                              <p className="text-purple-600 text-sm">{importProgress.status}</p>
                            </>
                          ) : (
                            <p className="text-purple-600 text-sm">Подготовка...</p>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="text-red-700 whitespace-pre-line">{parseError}</span>
                          {uploadedFile && (
                            <div className="mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRegenerate}
                                disabled={regenerating}
                                className={useNeuralParser
                                  ? "text-purple-700 border-purple-300 hover:bg-purple-50"
                                  : "text-gray-600 border-gray-300 hover:bg-gray-50"}
                              >
                                {useNeuralParser ? (
                                  <Sparkles className="h-4 w-4 mr-2" />
                                ) : (
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                {useNeuralParser ? "Попробовать с AI ещё раз" : "Попробовать ещё раз"}
                              </Button>
                            </div>
                          )}
                          {uploadedFile && (
                            <div className="mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setParseError(null)
                                  setUploadedFile(null)
                                }}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                Загрузить другой файл
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Превью распарсенных данных */}
              {parsedData && parsedData.trails.length > 0 && (
                <div className="space-y-6">
                  {/* Информация о парсинге с выпадающим списком критериев */}
                  <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-green-100/50 transition-colors"
                      onClick={() => parsedData.confidenceDetails && setShowConfidenceDetails(!showConfidenceDetails)}
                    >
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <span className="text-green-700 font-medium">Контент успешно распознан</span>
                        <span className="text-green-600 text-sm ml-2">
                          ({parsedData.parseMethod === "ai" ? "AI" : parsedData.parseMethod === "hybrid" ? "Гибридный" : "Авто"})
                        </span>
                      </div>
                      {parsedData.structureConfidence !== undefined && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-green-600 font-medium">
                            Уверенность: {parsedData.structureConfidence}%
                          </span>
                          {parsedData.confidenceDetails && (
                            <button
                              type="button"
                              className="text-green-600 hover:text-green-700 p-1 rounded-full hover:bg-green-100"
                              title="Показать критерии оценки"
                            >
                              {showConfidenceDetails ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Выпадающий список критериев уверенности */}
                    {showConfidenceDetails && parsedData.confidenceDetails && (
                      <div className="border-t border-green-200 p-3 bg-green-50/50">
                        <div className="flex items-center gap-2 mb-3 text-sm text-green-700">
                          <Info className="h-4 w-4" />
                          <span className="font-medium">Критерии оценки структуры</span>
                        </div>
                        <div className="space-y-2">
                          {parsedData.confidenceDetails.criteria.map((criterion, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded-lg border ${
                                criterion.met
                                  ? 'bg-green-100/50 border-green-300'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-sm font-medium ${
                                  criterion.met ? 'text-green-700' : 'text-gray-600'
                                }`}>
                                  {criterion.name}
                                </span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  criterion.met
                                    ? 'bg-green-200 text-green-700'
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                  +{criterion.score}/{criterion.maxScore}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600">
                                {criterion.description}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-green-200 flex items-center justify-between text-sm">
                          <span className="text-green-700">Итоговая оценка</span>
                          <span className="font-bold text-green-700">
                            {parsedData.confidenceDetails.totalScore} из {parsedData.confidenceDetails.maxPossibleScore} баллов
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Предупреждения */}
                  {parsedData.warnings && parsedData.warnings.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-700 font-medium mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        Предупреждения
                      </div>
                      <ul className="text-sm text-yellow-600 space-y-1">
                        {parsedData.warnings.slice(0, 5).map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Превью trails */}
                  <div className="space-y-4">
                    {parsedData.trails.map((trail, trailIndex) => (
                      <div key={trailIndex} className="border rounded-lg overflow-hidden">
                        <div
                          className="p-4 flex items-center gap-3"
                          style={{ backgroundColor: `${trail.color || "#6366f1"}15` }}
                        >
                          <span className="text-2xl">{trail.icon || "📚"}</span>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{trail.title}</h3>
                            {trail.subtitle && (
                              <p className="text-sm text-gray-600">{trail.subtitle}</p>
                            )}
                          </div>
                          <Badge variant="outline">
                            {trail.modules.length} {pluralizeRu(trail.modules.length, ["модуль", "модуля", "модулей"])}
                          </Badge>
                        </div>

                        <div className="divide-y">
                          {trail.modules.map((module, moduleIndex) => {
                            const TypeIcon = typeIcons[module.type] || BookOpen
                            return (
                              <div key={moduleIndex} className="p-3 flex items-center gap-3 bg-white">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                                  <TypeIcon className="h-4 w-4 text-gray-600" />
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
                                  {module.description && (
                                    <p className="text-xs text-gray-500 truncate">{module.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
                                  {module.questions.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <HelpCircle className="h-3 w-3" />
                                      {module.questions.length}
                                    </span>
                                  )}
                                  <span>{module.points} XP</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50">
              {parsedData ? (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={resetImportModal}
                    className="flex-1"
                  >
                    Отмена
                  </Button>
                  {useNeuralParser && aiStatus.available && (
                    <Button
                      variant="outline"
                      onClick={handleRegenerate}
                      disabled={regenerating || saving}
                      className="text-purple-700 border-purple-300 hover:bg-purple-50"
                    >
                      {regenerating ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Перегенерировать
                    </Button>
                  )}
                  {!useNeuralParser && (
                    <Button
                      variant="outline"
                      onClick={handleRegenerate}
                      disabled={regenerating || saving}
                      className="text-gray-600 border-gray-300 hover:bg-gray-50"
                    >
                      {regenerating ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Перепарсить
                    </Button>
                  )}
                  <Button
                    onClick={handleSaveImport}
                    disabled={saving || regenerating}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {saving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Добавить
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={resetImportModal} className="w-full">
                  Закрыть
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Modal - Admin Only */}
      {showHistory && isAdmin && (
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

      {/* Admin Password Verification Modal */}
      {passwordTrail && (
        <AdminTrailPasswordModal
          open={showPasswordModal}
          trailId={passwordTrail.id}
          trailTitle={passwordTrail.title}
          trailColor={passwordTrail.color}
          isExpired={passwordIsExpired}
          onClose={() => {
            setShowPasswordModal(false)
            setPasswordTrail(null)
          }}
          onSuccess={handlePasswordSuccess}
        />
      )}

      {/* Edit/Create Trail Modal */}
      <EditTrailModal
        open={showEditTrailModal}
        trail={editingTrail}
        mode={trailModalMode}
        onClose={() => {
          setShowEditTrailModal(false)
          setEditingTrail(null)
        }}
        onSave={handleTrailSave}
      />
    </div>
  )
}
