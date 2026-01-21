"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react"

interface ReviewFormProps {
  submissionId: string
  moduleId: string
  userId: string
  modulePoints: number
}

type ReviewStatus = "APPROVED" | "REVISION" | "FAILED"

export function ReviewForm({
  submissionId,
  moduleId,
  userId,
  modulePoints,
}: ReviewFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<ReviewStatus>("APPROVED")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      submissionId,
      moduleId,
      userId,
      score: Number(formData.get("score")),
      status,
      strengths: formData.get("strengths") as string,
      improvements: formData.get("improvements") as string,
      comment: formData.get("comment") as string,
      modulePoints: status === "APPROVED" ? modulePoints : 0,
    }

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Ошибка при сохранении")
      }

      router.push("/teacher")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при сохранении")
    } finally {
      setIsLoading(false)
    }
  }

  const statusConfig = {
    APPROVED: {
      color: "bg-green-600 hover:bg-green-700",
      icon: CheckCircle2,
      label: "Принять работу",
      hint: `Ученик получит ${modulePoints} XP и перейдёт на следующий уровень`,
      hintColor: "bg-green-50 text-green-700",
    },
    REVISION: {
      color: "bg-orange-600 hover:bg-orange-700",
      icon: AlertCircle,
      label: "На доработку",
      hint: "Ученик исправит замечания и пересдаст. Уровень не меняется",
      hintColor: "bg-orange-50 text-orange-700",
    },
    FAILED: {
      color: "bg-red-600 hover:bg-red-700",
      icon: XCircle,
      label: "Провал",
      hint: "Ученик переходит на уровень ниже",
      hintColor: "bg-red-50 text-red-700",
    },
  }

  const currentConfig = statusConfig[status]
  const StatusIcon = currentConfig.icon

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="score">Общий балл (0-10)</Label>
          <Input
            id="score"
            name="score"
            type="number"
            min="0"
            max="10"
            defaultValue="7"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label>Решение</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as ReviewStatus)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="APPROVED">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Принять (↑ вверх)
                </div>
              </SelectItem>
              <SelectItem value="REVISION">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  На доработку (→ пересдача)
                </div>
              </SelectItem>
              <SelectItem value="FAILED">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Провал (↓ вниз)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="strengths">Сильные стороны</Label>
        <Textarea
          id="strengths"
          name="strengths"
          placeholder="Что сделано хорошо..."
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="improvements">Что улучшить</Label>
        <Textarea
          id="improvements"
          name="improvements"
          placeholder="Рекомендации по улучшению..."
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="comment">Общий комментарий</Label>
        <Textarea
          id="comment"
          name="comment"
          placeholder="Дополнительные замечания..."
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div className={`p-4 rounded-lg text-sm ${currentConfig.hintColor}`}>
        {currentConfig.hint}
      </div>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Отмена
        </Button>
        <Button
          type="submit"
          className={currentConfig.color}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <StatusIcon className="mr-2 h-4 w-4" />
              {currentConfig.label}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
