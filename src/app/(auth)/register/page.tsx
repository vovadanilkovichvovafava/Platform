"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signIn, useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Flame, Loader2, Ticket, Send } from "lucide-react"

const registerSchema = z.object({
  inviteCode: z.string().min(1, "Введите код приглашения"),
  firstName: z.string().min(2, "Имя должно быть минимум 2 символа"),
  lastName: z.string().min(2, "Фамилия должна быть минимум 2 символа"),
  telegramUsername: z
    .string()
    .min(1, "Введите Telegram-ник")
    .regex(/^@[a-zA-Z0-9_]{5,32}$/, "Формат: @username (от 5 символов, латиница, цифры, _)"),
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Пароль должен быть минимум 6 символов"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
})

type RegisterForm = z.infer<typeof registerSchema>

function RegisterFormComponent() {
  const router = useRouter()
  const { status } = useSession()
  const searchParams = useSearchParams()
  const inviteFromUrl = searchParams.get("invite") || ""

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      inviteCode: inviteFromUrl,
    },
  })

  // Redirect authenticated users to dashboard (client-side)
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard")
    }
  }, [status, router])

  // Show spinner while session is being checked
  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: data.inviteCode,
          firstName: data.firstName,
          lastName: data.lastName,
          telegramUsername: data.telegramUsername,
          email: data.email,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Ошибка при регистрации")
        return
      }

      // Auto-login after registration
      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (signInResult?.error) {
        router.push("/login")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("Произошла ошибка при регистрации")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
                <Flame className="h-6 w-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Регистрация</h1>
            <p className="text-slate-500 mt-2">
              Создайте аккаунт по приглашению
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="inviteCode" className="text-slate-700 flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Код приглашения
              </Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="PROMETHEUS2024"
                {...register("inviteCode")}
                disabled={isLoading}
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500/20 uppercase"
              />
              {errors.inviteCode && (
                <p className="text-sm text-red-500">{errors.inviteCode.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-slate-700">Имя</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Иван"
                  {...register("firstName")}
                  disabled={isLoading}
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500/20"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-slate-700">Фамилия</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Иванов"
                  {...register("lastName")}
                  disabled={isLoading}
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500/20"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegramUsername" className="text-slate-700 flex items-center gap-2">
                <Send className="h-4 w-4" />
                Telegram
              </Label>
              <Input
                id="telegramUsername"
                type="text"
                placeholder="@username"
                {...register("telegramUsername")}
                disabled={isLoading}
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500/20"
              />
              {errors.telegramUsername && (
                <p className="text-sm text-red-500">{errors.telegramUsername.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                disabled={isLoading}
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500/20"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Минимум 6 символов"
                {...register("password")}
                disabled={isLoading}
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500/20"
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700">Подтвердите пароль</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Повторите пароль"
                {...register("confirmPassword")}
                disabled={isLoading}
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500/20"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0 h-11"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Регистрация...
                </>
              ) : (
                "Зарегистрироваться"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Уже есть аккаунт?{" "}
            <Link
              href="/login"
              className="font-medium text-orange-500 hover:text-orange-600"
            >
              Войти
            </Link>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
            <p className="font-medium mb-1 text-slate-600">Нет кода приглашения?</p>
            <p>Регистрация доступна только по приглашению. Обратитесь к администратору.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    }>
      <RegisterFormComponent />
    </Suspense>
  )
}
