"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Flame, Loader2, KeyRound, CheckCircle2, XCircle } from "lucide-react"

const inputClass =
  "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20"

function ResetCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
                <Flame className="h-6 w-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Сброс пароля
            </h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

function ResetPasswordInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [checking, setChecking] = useState(true)
  const [valid, setValid] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true
    if (!token) {
      setChecking(false)
      setValid(false)
      return
    }
    fetch(`/api/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return
        setValid(!!d.valid)
        setEmail(d.email ?? null)
      })
      .catch(() => active && setValid(false))
      .finally(() => active && setChecking(false))
    return () => {
      active = false
    }
  }, [token])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (newPassword.length < 6) {
      setError("Пароль должен быть минимум 6 символов")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Ошибка при сбросе пароля")
        return
      }
      setDone(true)
    } catch {
      setError("Ошибка при сбросе пароля")
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) {
    return (
      <ResetCard>
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      </ResetCard>
    )
  }

  if (done) {
    return (
      <ResetCard>
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
          <p className="text-slate-600 dark:text-slate-300">
            Пароль изменён. Теперь можно войти.
          </p>
          <Link
            href="/login"
            className="inline-block w-full h-11 leading-[44px] rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium"
          >
            Войти
          </Link>
        </div>
      </ResetCard>
    )
  }

  if (!valid) {
    return (
      <ResetCard>
        <div className="text-center space-y-4">
          <XCircle className="h-10 w-10 text-red-500 mx-auto" />
          <p className="text-slate-600 dark:text-slate-300">
            Ссылка недействительна или устарела. Попросите администратора прислать
            новую.
          </p>
          <Link
            href="/login"
            className="text-sm font-medium text-orange-500 hover:text-orange-600"
          >
            На страницу входа
          </Link>
        </div>
      </ResetCard>
    )
  }

  return (
    <ResetCard>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center -mt-4 mb-2">
          {email ? (
            <>
              Задайте новый пароль для <span className="font-medium">{email}</span>
            </>
          ) : (
            "Задайте новый пароль"
          )}
        </p>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-slate-700 dark:text-slate-300">
            Новый пароль
          </Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="Минимум 6 символов"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            autoComplete="new-password"
            autoFocus
            disabled={submitting}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">
            Подтвердите пароль
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Повторите пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            autoComplete="new-password"
            disabled={submitting}
            className={inputClass}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0 h-11"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <KeyRound className="mr-2 h-4 w-4" />
              Сохранить пароль
            </>
          )}
        </Button>
      </form>
    </ResetCard>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <ResetCard>
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        </ResetCard>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  )
}
