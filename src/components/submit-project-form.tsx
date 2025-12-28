"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Upload, Github, Globe } from "lucide-react"

interface SubmitProjectFormProps {
  moduleId: string
  moduleSlug: string
}

export function SubmitProjectForm({ moduleId, moduleSlug }: SubmitProjectFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      moduleId,
      githubUrl: formData.get("githubUrl") as string,
      deployUrl: formData.get("deployUrl") as string,
      comment: formData.get("comment") as string,
    }

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

      <div className="space-y-2">
        <Label htmlFor="githubUrl" className="flex items-center gap-2">
          <Github className="h-4 w-4" />
          GitHub репозиторий
        </Label>
        <Input
          id="githubUrl"
          name="githubUrl"
          type="url"
          placeholder="https://github.com/username/repo"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="deployUrl" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Ссылка на деплой
        </Label>
        <Input
          id="deployUrl"
          name="deployUrl"
          type="url"
          placeholder="https://your-app.vercel.app"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="comment">Комментарий</Label>
        <Textarea
          id="comment"
          name="comment"
          placeholder="Опишите что сделано, какие были сложности..."
          rows={4}
          disabled={isLoading}
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-[#0176D3] hover:bg-[#014486]"
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
