"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import {
  User,
  Mail,
  Trophy,
  Calendar,
  BookOpen,
  FileText,
  Save,
  Key,
  Loader2,
  MessageCircle,
  Link2,
  Unlink,
  ExternalLink,
  CheckCircle2,
} from "lucide-react"

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  totalXP: number
  createdAt: string
  _count: {
    submissions: number
    moduleProgress: number
    activityDays: number
  }
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Form states
  const [name, setName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Telegram states
  const [telegramStatus, setTelegramStatus] = useState<{
    isConnected: boolean
    isEnabled: boolean
    connectedAt: string | null
    isConfigured: boolean
  } | null>(null)
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [telegramDeepLink, setTelegramDeepLink] = useState<string | null>(null)

  // Telegram functions (defined before useEffect to avoid hoisting issues)
  const fetchTelegramStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/telegram/connect")
      if (res.ok) {
        const data = await res.json()
        setTelegramStatus(data)
      }
    } catch {
      // Ignore errors silently - Telegram is optional
    }
  }, [])

  useEffect(() => {
    // Ждём пока сессия загрузится
    if (status === "loading") {
      return
    }
    // Редирект только если точно не авторизован
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    // Сессия есть - загружаем профиль
    if (session) {
      fetchProfile()
      // Load Telegram status for teachers/admins
      if (session.user?.role === "TEACHER" || session.user?.role === "ADMIN") {
        fetchTelegramStatus()
      }
    }
  }, [session, status, router, fetchTelegramStatus])

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile")
      if (!res.ok) throw new Error("Ошибка загрузки профиля")
      const data = await res.json()
      setProfile(data)
      setName(data.name)
    } catch {
      setError("Не удалось загрузить профиля")
    } finally {
      setLoading(false)
    }
  }

  const handleTelegramConnect = async () => {
    setTelegramLoading(true)
    setError("")
    try {
      const res = await fetch("/api/telegram/connect", { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Ошибка подключения")
      }
      const { deepLink } = await res.json()
      setTelegramDeepLink(deepLink)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка подключения Telegram")
    } finally {
      setTelegramLoading(false)
    }
  }

  const handleTelegramDisconnect = async () => {
    setTelegramLoading(true)
    setError("")
    try {
      const res = await fetch("/api/telegram/connect", { method: "DELETE" })
      if (!res.ok) throw new Error("Ошибка отключения")
      setTelegramStatus((prev) => prev ? { ...prev, isConnected: false, connectedAt: null } : null)
      setTelegramDeepLink(null)
      setSuccess("Telegram отключён")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отключения")
    } finally {
      setTelegramLoading(false)
    }
  }

  const handleTelegramToggle = async (enabled: boolean) => {
    try {
      const res = await fetch("/api/telegram/connect", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) throw new Error("Ошибка изменения настроек")
      setTelegramStatus((prev) => prev ? { ...prev, isEnabled: enabled } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка")
    }
  }

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Ошибка обновления")
      }

      setSuccess("Имя успешно обновлено")
      await updateSession({ name })
      fetchProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обновления")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают")
      return
    }

    if (newPassword.length < 6) {
      setError("Пароль должен быть минимум 6 символов")
      return
    }

    setSaving(true)

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Ошибка обновления пароля")
      }

      setSuccess("Пароль успешно изменён")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обновления пароля")
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case "ADMIN": return "Администратор"
      case "TEACHER": return "Эксперт"
      case "STUDENT": return "Ученик"
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-purple-100 text-purple-700"
      case "TEACHER": return "bg-blue-100 text-blue-700"
      case "STUDENT": return "bg-green-100 text-green-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  // Показываем загрузку пока сессия определяется или профиль загружается
  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-gray-500">
        Не удалось загрузить профиль
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Мой профиль</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Info Card */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-4">
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-500 text-white text-2xl">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold text-gray-900">{profile.name}</h2>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Mail className="h-3 w-3" />
                {profile.email}
              </p>
              <Badge className={`mt-3 ${getRoleColor(profile.role)}`}>
                {getRoleName(profile.role)}
              </Badge>

              <div className="w-full mt-6 pt-6 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-yellow-500">
                    <Trophy className="h-5 w-5" />
                    <span className="text-lg font-bold">{profile.totalXP}</span>
                  </div>
                  <p className="text-xs text-gray-500">XP</p>
                </div>
              </div>

              <div className="w-full mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    Модулей пройдено
                  </span>
                  <span className="font-medium">{profile._count.moduleProgress}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Работ отправлено
                  </span>
                  <span className="font-medium">{profile._count.submissions}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Дней активности
                  </span>
                  <span className="font-medium">{profile._count.activityDays}</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-6">
                Зарегистрирован{" "}
                {new Date(profile.createdAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Edit Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Change Name */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Изменить имя
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateName} className="space-y-4">
                <div>
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Введите имя"
                    minLength={2}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving || name === profile.name}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Сохранить
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5" />
                Изменить пароль
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Текущий пароль</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Введите текущий пароль"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">Новый пароль</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторите новый пароль"
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Изменить пароль
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Telegram Notifications - only for teachers/admins */}
          {(profile.role === "TEACHER" || profile.role === "ADMIN") && telegramStatus?.isConfigured && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Telegram-уведомления
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {telegramStatus.isConnected ? (
                  <>
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Telegram подключён</span>
                    </div>
                    {telegramStatus.connectedAt && (
                      <p className="text-sm text-gray-500">
                        Подключено:{" "}
                        {new Date(telegramStatus.connectedAt).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <Label htmlFor="telegram-enabled" className="font-medium">
                          Получать уведомления
                        </Label>
                        <p className="text-sm text-gray-500">
                          О новых работах на проверку
                        </p>
                      </div>
                      <Switch
                        id="telegram-enabled"
                        checked={telegramStatus.isEnabled}
                        onCheckedChange={handleTelegramToggle}
                      />
                    </div>

                    <Button
                      variant="outline"
                      onClick={handleTelegramDisconnect}
                      disabled={telegramLoading}
                      className="w-full mt-4"
                    >
                      {telegramLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Unlink className="h-4 w-4 mr-2" />
                      )}
                      Отключить Telegram
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Подключите Telegram, чтобы получать уведомления о новых работах студентов.
                    </p>

                    {telegramDeepLink ? (
                      <div className="space-y-3">
                        <a
                          href={telegramDeepLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Открыть Telegram
                        </a>
                        <p className="text-xs text-gray-500 text-center">
                          Ссылка действительна 15 минут
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTelegramDeepLink(null)}
                          className="w-full"
                        >
                          Отмена
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={handleTelegramConnect}
                        disabled={telegramLoading}
                        className="w-full"
                      >
                        {telegramLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Link2 className="h-4 w-4 mr-2" />
                        )}
                        Подключить Telegram
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
