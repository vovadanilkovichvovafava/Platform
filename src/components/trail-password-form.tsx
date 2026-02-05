"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { Lock, Eye, EyeOff, KeyRound, AlertCircle, RefreshCw } from "lucide-react"

interface TrailPasswordFormProps {
  trailId: string
  trailTitle: string
  trailColor: string
  hint?: string | null
}

export function TrailPasswordForm({
  trailId,
  trailTitle,
  trailColor,
  hint,
}: TrailPasswordFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentHint, setCurrentHint] = useState<string | null>(hint ?? null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password.trim()) {
      setError("Введите пароль")
      return
    }

    if (retryAfter && retryAfter > 0) {
      setError(`Подождите ${retryAfter} сек. перед следующей попыткой`)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/trails/${trailId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        showToast("Доступ получен!", "success")
        // Refresh page to show content
        router.refresh()
      } else {
        // Handle error response
        setError(data.error || "Неверный пароль")

        // Update hint if returned
        if (data.hint) {
          setCurrentHint(data.hint)
        }

        // Handle rate limiting
        if (data.rateLimited && data.retryAfter) {
          setRetryAfter(data.retryAfter)
          // Start countdown
          const interval = setInterval(() => {
            setRetryAfter((prev) => {
              if (prev && prev > 1) return prev - 1
              clearInterval(interval)
              return null
            })
          }, 1000)
        }
      }
    } catch {
      setError("Ошибка соединения")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-4"
            style={{ backgroundColor: `${trailColor}20` }}
          >
            <Lock className="h-8 w-8" style={{ color: trailColor }} />
          </div>
          <CardTitle className="text-xl">Защищённый Trail</CardTitle>
          <p className="text-gray-500 mt-2">{trailTitle}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Этот трейл защищён паролем. Введите пароль для получения доступа.
            </p>

            {/* Hint */}
            {currentHint && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <KeyRound className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-medium text-amber-900">Подсказка:</span>
                  <p className="text-sm text-amber-700">{currentHint}</p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Password input */}
            <div>
              <Label htmlFor="trailPassword">Пароль</Label>
              <div className="relative">
                <Input
                  id="trailPassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль..."
                  className="pr-10"
                  disabled={loading || (retryAfter !== null && retryAfter > 0)}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !password.trim() || (retryAfter !== null && retryAfter > 0)}
              style={{
                backgroundColor: loading ? undefined : trailColor,
              }}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Проверка...
                </>
              ) : retryAfter ? (
                `Подождите ${retryAfter} сек.`
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Разблокировать
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Если у вас нет пароля, обратитесь к создателю трейла или администратору.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
