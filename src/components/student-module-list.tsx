"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import {
  CheckCircle2,
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
}

export function StudentModuleList({
  studentId,
  enrollments,
  progressMap: initialProgressMap,
}: StudentModuleListProps) {
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
    <>
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
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{enrollment.trail.title}</span>
                <Badge variant="secondary">
                  {completedModules.length}/{trailModules.length} модулей
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{trailProgress}% завершено</span>
                  <span>{trailMaxXP} XP макс.</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                    style={{ width: `${trailProgress}%` }}
                  />
                </div>
              </div>

              {/* Module list */}
              <div className="space-y-2">
                {trailModules.map((module) => {
                  const progress = progressMap.get(module.id)
                  const isCompleted = progress?.status === "COMPLETED"
                  const isInProgress = progress?.status === "IN_PROGRESS"
                  const isSkipped = progress?.skippedByTeacher
                  const isLoading = loading === module.id

                  return (
                    <div
                      key={module.id}
                      className={`flex items-center justify-between p-2 rounded-lg group ${
                        isCompleted
                          ? isSkipped
                            ? "bg-purple-50"
                            : "bg-green-50"
                          : isInProgress
                          ? "bg-blue-50"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isCompleted ? (
                          isSkipped ? (
                            <SkipForward className="h-4 w-4 text-purple-500 flex-shrink-0" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )
                        ) : isInProgress ? (
                          <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm truncate ${
                            isCompleted
                              ? isSkipped
                                ? "text-purple-700"
                                : "text-green-700"
                              : isInProgress
                              ? "text-blue-700"
                              : "text-gray-500"
                          }`}
                        >
                          {module.title}
                        </span>
                        {isSkipped && (
                          <Badge variant="outline" className="text-xs text-purple-600 border-purple-300 ml-1 flex-shrink-0">
                            пропущен
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{module.points} XP</span>

                        {/* Skip/Revert button */}
                        {isLoading ? (
                          <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
                        ) : isSkipped ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                            onClick={() => revertSkip(module.id, module.title)}
                          >
                            <Undo2 className="h-3 w-3 mr-1" />
                            Отменить
                          </Button>
                        ) : !isCompleted ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 text-gray-600 hover:text-purple-600 hover:bg-purple-100"
                            onClick={() => skipModule(module.id, module.title)}
                          >
                            <SkipForward className="h-3 w-3 mr-1" />
                            Закрыть
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </>
  )
}
