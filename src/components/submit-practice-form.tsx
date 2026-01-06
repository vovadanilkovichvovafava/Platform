"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Upload, FileText, Link as LinkIcon } from "lucide-react"

interface SubmitPracticeFormProps {
  moduleId: string
  moduleSlug: string
}

export function SubmitPracticeForm({ moduleId, moduleSlug }: SubmitPracticeFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const fileUrl = formData.get("fileUrl") as string
    const comment = formData.get("comment") as string

    if (!fileUrl) {
      setError("Пожалуйста, укажите ссылку на файл с работой")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          fileUrl,
          comment,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Ошибка при отправке")
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при отправке")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-purple-600 mt-0.5" />
          <div className="text-sm text-purple-800">
            <p className="font-medium mb-1">Как сдать практику:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Загрузи файл на Google Drive или Dropbox</li>
              <li>Открой доступ по ссылке (для всех)</li>
              <li>Вставь ссылку ниже</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fileUrl" className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4" />
          Ссылка на файл с работой *
        </Label>
        <Input
          id="fileUrl"
          name="fileUrl"
          type="url"
          placeholder="https://drive.google.com/file/d/..."
          disabled={isLoading}
          required
        />
        <p className="text-xs text-gray-500">
          Google Drive, Dropbox, или другой файловый сервис
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="comment">Комментарий к работе</Label>
        <Textarea
          id="comment"
          name="comment"
          placeholder="Опишите что сделано, какие были сложности, что узнали нового..."
          rows={4}
          disabled={isLoading}
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-purple-600 hover:bg-purple-700"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Отправка...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Отправить на проверку
          </>
        )}
      </Button>
    </form>
  )
}
