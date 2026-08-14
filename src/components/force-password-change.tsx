"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { KeyRound, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"

/**
 * Блокирующая модалка форс-смены пароля.
 *
 * Показывается на любой странице, когда у авторизованного пользователя стоит флаг
 * mustChangePassword (пароль был сброшен админом на временный). Пользователь вошёл
 * по временному паролю — здесь он обязан заменить его на постоянный, прежде чем
 * продолжить. Модалку нельзя закрыть (нет крестика, клика по фону и ESC).
 *
 * Смонтирована в layout внутри провайдеров сессии/тостов, поэтому работает глобально.
 */
export function ForcePasswordChange() {
  const { data: session, status, update } = useSession()
  const { showToast } = useToast()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const mustChange =
    status === "authenticated" && session?.user?.mustChangePassword === true

  if (!mustChange) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    if (newPassword.length < 6) {
      showToast("Пароль должен быть минимум 6 символов", "error")
      return
    }
    if (newPassword !== confirmPassword) {
      showToast("Пароли не совпадают", "error")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || "Ошибка при смене пароля", "error")
        return
      }

      setNewPassword("")
      setConfirmPassword("")
      // Обновляем сессию → jwt-колбэк перечитает флаг из БД (уже false) → модалка скроется.
      await update()
      showToast("Пароль изменён", "success")
    } catch {
      showToast("Ошибка при смене пароля", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop — намеренно без onClick: закрыть нельзя */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
              <KeyRound className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Смените пароль
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                Вы вошли по временному паролю. Задайте постоянный пароль, чтобы
                продолжить работу.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="fpc-new" className="mb-1 block">
                Новый пароль
              </Label>
              <Input
                id="fpc-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                minLength={6}
                autoComplete="new-password"
                autoFocus
                required
              />
            </div>
            <div>
              <Label htmlFor="fpc-confirm" className="mb-1 block">
                Подтвердите пароль
              </Label>
              <Input
                id="fpc-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите новый пароль"
                minLength={6}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Сохранение…
                </>
              ) : (
                "Сохранить и продолжить"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
