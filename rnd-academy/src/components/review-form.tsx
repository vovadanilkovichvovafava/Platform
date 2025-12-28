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
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

interface ReviewFormProps {
  submissionId: string
  moduleId: string
  userId: string
  modulePoints: number
}

export function ReviewForm({
  submissionId,
  moduleId,
  userId,
  modulePoints,
}: ReviewFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<"APPROVED" | "REVISION">("APPROVED")

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
            onValueChange={(v) => setStatus(v as "APPROVED" | "REVISION")}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="APPROVED">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Принять
                </div>
              </SelectItem>
              <SelectItem value="REVISION">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  На доработку
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

      {status === "APPROVED" && (
        <div className="p-4 bg-green-50 rounded-lg text-sm text-green-700">
          При одобрении ученик получит {modulePoints} XP
        </div>
      )}

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
          className={
            status === "APPROVED"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-orange-600 hover:bg-orange-700"
          }
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Сохранение...
            </>
          ) : status === "APPROVED" ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Принять работу
            </>
          ) : (
            <>
              <AlertCircle className="mr-2 h-4 w-4" />
              Отправить на доработку
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
