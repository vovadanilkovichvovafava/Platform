"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { Lock, Eye, EyeOff, KeyRound, AlertCircle, RefreshCw, ShieldCheck } from "lucide-react"

interface AdminTrailPasswordModalProps {
  open: boolean
  trailId: string
  trailTitle: string
  trailColor?: string
  isExpired?: boolean
  onClose: () => void
  onSuccess: () => void
}

/**
 * Modal for admin/co-admin password verification before accessing
 * a password-protected trail they did not create.
 *
 * On success, calls onSuccess() which should proceed with the intended action.
 * Uses the existing /api/trails/[id]/unlock endpoint.
 */
export function AdminTrailPasswordModal({
  open,
  trailId,
  trailTitle,
  trailColor = "#6366f1",
  isExpired = false,
  onClose,
  onSuccess,
}: AdminTrailPasswordModalProps) {
  const { showToast } = useToast()
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    isExpired ? "Срок верификации истёк, введите пароль снова" : null
  )
  const [hint, setHint] = useState<string | null>(null)
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
        showToast("Доступ подтверждён", "success")
        setPassword("")
        onSuccess()
      } else {
        setError(data.error || "Неверный пароль")

        if (data.hint) {
          setHint(data.hint)
        }

        if (data.rateLimited && data.retryAfter) {
          setRetryAfter(data.retryAfter)
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

  const handleClose = () => {
    setPassword("")
    setError(isExpired ? "Срок верификации истёк, введите пароль снова" : null)
    setHint(null)
    setRetryAfter(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-3"
            style={{ backgroundColor: `${trailColor}20` }}
          >
            <ShieldCheck className="h-7 w-7" style={{ color: trailColor }} />
          </div>
          <CardTitle className="text-lg">Верификация доступа</CardTitle>
          <p className="text-sm text-gray-500 mt-1">{trailTitle}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Этот trail защищён паролем. Для просмотра и редактирования введите пароль.
            </p>

            {/* Hint */}
            {hint && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <KeyRound className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-medium text-amber-900">Подсказка:</span>
                  <p className="text-sm text-amber-700">{hint}</p>
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
              <Label htmlFor="adminTrailPassword">Пароль</Label>
              <div className="relative">
                <Input
                  id="adminTrailPassword"
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

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                className="flex-1"
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
                    Подтвердить
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Доступ действителен в течение сессии (4 часа).
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
