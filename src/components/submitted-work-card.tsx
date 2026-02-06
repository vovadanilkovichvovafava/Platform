"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  Pencil,
  X,
  Check,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Bell,
} from "lucide-react"

interface Review {
  id: string
  score: number
  comment: string | null
  createdAt: string
}

interface Submission {
  id: string
  githubUrl: string | null
  deployUrl: string | null
  fileUrl: string | null
  comment: string | null
  status: string
  createdAt: string
  lastRenotifiedAt?: string | null
  review?: Review | null
}

interface SubmittedWorkCardProps {
  submission: Submission
  moduleId: string
  moduleType: "PRACTICE" | "PROJECT"
  onResubmit?: () => void
}

const statusConfig = {
  PENDING: {
    label: "На проверке",
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  APPROVED: {
    label: "Принято",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  REVISION: {
    label: "На доработку",
    color: "bg-orange-100 text-orange-700",
    icon: AlertCircle,
  },
  FAILED: {
    label: "Провал",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
}

export function SubmittedWorkCard({
  submission,
  moduleId,
  moduleType,
  onResubmit,
}: SubmittedWorkCardProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRenotifying, setIsRenotifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    githubUrl: submission.githubUrl || "",
    deployUrl: submission.deployUrl || "",
    fileUrl: submission.fileUrl || "",
    comment: submission.comment || "",
  })

  const canEdit = submission.status === "PENDING"
  const canRenotify = submission.status === "PENDING"
  const status = statusConfig[submission.status as keyof typeof statusConfig] || statusConfig.PENDING
  const StatusIcon = status.icon

  // Calculate renotify cooldown
  const getRenotifyCooldown = () => {
    if (!submission.lastRenotifiedAt) return null
    const lastNotify = new Date(submission.lastRenotifiedAt).getTime()
    const cooldownMs = 24 * 60 * 60 * 1000 // 24 hours
    const remaining = cooldownMs - (Date.now() - lastNotify)
    if (remaining <= 0) return null
    return Math.ceil(remaining / (60 * 60 * 1000)) // hours remaining
  }

  const renotifyCooldownHours = getRenotifyCooldown()

  const handleRenotify = async () => {
    setIsRenotifying(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/submissions/${submission.id}/renotify`, {
        method: "POST",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Ошибка отправки уведомления")
      }

      setSuccess("Уведомление отправлено проверяющим")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки")
    } finally {
      setIsRenotifying(false)
    }
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form on cancel
      setFormData({
        githubUrl: submission.githubUrl || "",
        deployUrl: submission.deployUrl || "",
        fileUrl: submission.fileUrl || "",
        comment: submission.comment || "",
      })
      setError(null)
    }
    setIsEditing(!isEditing)
  }

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    // Validate at least one URL is provided
    if (!formData.githubUrl && !formData.deployUrl && !formData.fileUrl) {
      setError("Укажите хотя бы одну ссылку")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Ошибка сохранения")
      }

      setSuccess("Работа успешно обновлена")
      setIsEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-600 mb-2">
              Статус работы
            </div>
            <Badge className={`${status.color} border-0`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            {canRenotify && !isEditing && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleRenotify}
                disabled={isRenotifying || renotifyCooldownHours !== null}
                title={
                  renotifyCooldownHours !== null
                    ? `Можно отправить через ${renotifyCooldownHours} ч.`
                    : "Напомнить проверяющим о работе"
                }
                aria-label={
                  renotifyCooldownHours !== null
                    ? `Напомнить (через ${renotifyCooldownHours} ч.)`
                    : "Напомнить"
                }
              >
                {isRenotifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
              </Button>
            )}

            {canEdit && !isEditing && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleEditToggle}
                title="Редактировать работу"
                aria-label="Редактировать"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditToggle}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error/Success messages */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg">
          {success}
        </div>
      )}

      {/* Edit mode */}
      {isEditing ? (
        <div className="space-y-4">
          {moduleType === "PROJECT" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="githubUrl">GitHub репозиторий</Label>
                <Input
                  id="githubUrl"
                  type="url"
                  placeholder="https://github.com/username/repo"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, githubUrl: e.target.value }))}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deployUrl">URL деплоя</Label>
                <Input
                  id="deployUrl"
                  type="url"
                  placeholder="https://your-app.vercel.app"
                  value={formData.deployUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, deployUrl: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="fileUrl">Ссылка на файл</Label>
              <Input
                id="fileUrl"
                type="url"
                placeholder="https://drive.google.com/file/d/..."
                value={formData.fileUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, fileUrl: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                Google Drive, Dropbox или другой файловый сервис
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              placeholder="Описание работы, что сделано..."
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleEditToggle}
              disabled={isLoading}
            >
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        /* View mode - show submitted links */
        <div className="space-y-2">
          {submission.githubUrl && (
            <a
              href={submission.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              GitHub репозиторий
            </a>
          )}
          {submission.deployUrl && (
            <a
              href={submission.deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Демо / Деплой
            </a>
          )}
          {submission.fileUrl && (
            <a
              href={submission.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-purple-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Файл с работой
            </a>
          )}
          {submission.comment && (
            <p className="text-sm text-gray-600 mt-2">
              {submission.comment}
            </p>
          )}
        </div>
      )}

      {/* Review if exists */}
      {submission.review && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Оценка</span>
            <span className="text-2xl font-bold text-[#0176D3]">
              {submission.review.score}/10
            </span>
          </div>
          {submission.review.comment && (
            <div>
              <div className="text-sm font-medium mb-1">Комментарий</div>
              <p className="text-sm text-gray-600">{submission.review.comment}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
