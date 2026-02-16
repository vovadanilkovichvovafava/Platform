"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  XCircle,
  SkipForward,
  Undo2,
  RefreshCw,
} from "lucide-react"

interface Module {
  id: string
  title: string
  slug: string
  points: number
  order: number
}

interface ModuleProgress {
  moduleId: string
  status: string
  skippedByTeacher?: boolean
}

interface Enrollment {
  trailId: string
  trail: {
    title: string
    modules: Module[]
  }
}

interface StudentModuleListProps {
  studentId: string
  enrollments: Enrollment[]
  progressMap: Map<string, ModuleProgress>
  userRole?: string
}

export function StudentModuleList({
  studentId,
  enrollments,
  progressMap: initialProgressMap,
  userRole,
}: StudentModuleListProps) {
  const canSkipModules = userRole !== "HR"
  const [progressMap, setProgressMap] = useState(initialProgressMap)
  const [loading, setLoading] = useState<string | null>(null)
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const skipModule = async (moduleId: string, moduleTitle: string) => {
    const confirmed = await confirm({
      title: "Закрыть модуль?",
      message: `Пометить "${moduleTitle}" как пройденный для этого студента? Студент получит XP без прохождения.`,
      confirmText: "Закрыть",
      variant: "default",
    })

    if (!confirmed) return

    try {
      setLoading(moduleId)
      const res = await fetch("/api/teacher/skip-module", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, moduleId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to skip module")
      }

      // Update local state
      setProgressMap((prev) => {
        const next = new Map(prev)
        next.set(moduleId, { moduleId, status: "COMPLETED", skippedByTeacher: true })
        return next
      })
      showToast("Модуль закрыт", "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Ошибка", "error")
    } finally {
      setLoading(null)
    }
  }

  const revertSkip = async (moduleId: string, moduleTitle: string) => {
    const confirmed = await confirm({
      title: "Отменить закрытие?",
      message: `Отменить закрытие "${moduleTitle}"? XP будет снято со студента.`,
      confirmText: "Отменить",
      variant: "danger",
    })

    if (!confirmed) return

    try {
      setLoading(moduleId)
      const res = await fetch(
        `/api/teacher/skip-module?studentId=${studentId}&moduleId=${moduleId}`,
        { method: "DELETE" }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to revert skip")
      }

      // Update local state
      setProgressMap((prev) => {
        const next = new Map(prev)
        next.delete(moduleId)
        return next
      })
      showToast("Закрытие отменено", "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Ошибка", "error")
    } finally {
      setLoading(null)
    }
  }

  if (enrollments.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Студент не записан ни на один trail
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {enrollments.map((enrollment) => {
        const trailModules = enrollment.trail.modules
        const completedModules = trailModules.filter(
          (m) => progressMap.get(m.id)?.status === "COMPLETED"
        )
        const trailMaxXP = trailModules.reduce((s, m) => s + m.points, 0)
        const trailProgress =
          trailModules.length > 0
            ? Math.round((completedModules.length / trailModules.length) * 100)
            : 0

        return (
          <Card key={enrollment.trailId}>
            <Collapsible defaultOpen>
              <CardContent className="p-0">
                {/* Trail header with collapsible trigger */}
                <CollapsibleTrigger asChild>
                  <button className="w-full p-4 pb-2 hover:bg-gray-50 transition-colors rounded-t-lg text-left group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{enrollment.trail.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-sm">
                          {completedModules.length}/{trailModules.length}
                        </Badge>
                        <span className="text-sm text-gray-500">{trailProgress}%</span>
                        <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-200 group-aria-expanded:rotate-180" />
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
                          style={{ width: `${trailProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{completedModules.reduce((s, m) => s + m.points, 0)} XP заработано</span>
                        <span>{trailMaxXP} XP максимум</span>
                      </div>
                    </div>
                  </button>
                </CollapsibleTrigger>

                {/* Module list (collapsible content) */}
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-2">
                    {trailModules.map((module) => {
                      const progress = progressMap.get(module.id)
                      const isCompleted = progress?.status === "COMPLETED"
                      const isInProgress = progress?.status === "IN_PROGRESS"
                      const isSkipped = progress?.skippedByTeacher
                      const isLoading = loading === module.id

                      return (
                        <div
                          key={module.id}
                          className={`flex items-center justify-between p-3 rounded-lg group transition-colors ${
                            isCompleted
                              ? isSkipped
                                ? "bg-purple-50 hover:bg-purple-100"
                                : "bg-green-50 hover:bg-green-100"
                              : isInProgress
                              ? "bg-blue-50 hover:bg-blue-100"
                              : "bg-gray-50 hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {isCompleted ? (
                              isSkipped ? (
                                <SkipForward className="h-5 w-5 text-purple-500 flex-shrink-0" />
                              ) : (
                                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                              )
                            ) : isInProgress ? (
                              <Clock className="h-5 w-5 text-blue-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-sm font-medium truncate block ${
                                  isCompleted
                                    ? isSkipped
                                      ? "text-purple-700"
                                      : "text-green-700"
                                    : isInProgress
                                    ? "text-blue-700"
                                    : "text-gray-600"
                                }`}
                              >
                                {module.title}
                              </span>
                              {isSkipped && (
                                <Badge variant="outline" className="text-xs text-purple-600 border-purple-300 mt-1">
                                  пропущен учителем
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 font-medium">{module.points} XP</span>

                            {/* Skip/Revert button - hidden for HR */}
                            {canSkipModules && (
                              isLoading ? (
                                <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
                              ) : isSkipped ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-3 text-xs opacity-0 group-hover:opacity-100 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                                  onClick={() => revertSkip(module.id, module.title)}
                                >
                                  <Undo2 className="h-3 w-3 mr-1" />
                                  Отменить
                                </Button>
                              ) : !isCompleted ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-3 text-xs opacity-0 group-hover:opacity-100 text-gray-600 hover:text-purple-600 hover:bg-purple-100"
                                  onClick={() => skipModule(module.id, module.title)}
                                >
                                  <SkipForward className="h-3 w-3 mr-1" />
                                  Закрыть
                                </Button>
                              ) : null
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Collapsible>
          </Card>
        )
      })}
    </div>
  )
}
