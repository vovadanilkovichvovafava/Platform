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
  Settings,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Webhook,
  Trash2,
  Play,
  Info,
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

interface WebhookStatus {
  isConfigured: boolean
  hasSecretToken: boolean
  pendingUpdates: number
  lastErrorDate: string | null
  lastErrorMessage: string | null
  maxConnections: number
  allowedUpdates: string[]
  expectedUrl: string | null
  urlMatches: boolean
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
  const [telegramShortCode, setTelegramShortCode] = useState<string | null>(null)

  // Webhook admin states (CO_ADMIN/ADMIN)
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null)
  const [webhookLoading, setWebhookLoading] = useState(false)
  const [webhookError, setWebhookError] = useState<string | null>(null)

  // Test notification state
  const [testLoading, setTestLoading] = useState(false)

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

  // Webhook admin functions (ADMIN only)
  const fetchWebhookStatus = useCallback(async () => {
    setWebhookLoading(true)
    setWebhookError(null)
    try {
      const res = await fetch("/api/telegram/admin")
      if (res.ok) {
        const data = await res.json()
        setWebhookStatus(data)
      } else {
        const errorData = await res.json()
        setWebhookError(errorData.error || "Ошибка получения статуса")
      }
    } catch {
      setWebhookError("Ошибка подключения к серверу")
    } finally {
      setWebhookLoading(false)
    }
  }, [])

  const handleSetupWebhook = async () => {
    setWebhookLoading(true)
    setWebhookError(null)
    try {
      const res = await fetch("/api/telegram/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dropPendingUpdates: true }),
      })
      if (res.ok) {
        setSuccess("Webhook успешно настроен")
        await fetchWebhookStatus()
      } else {
        const errorData = await res.json()
        setWebhookError(errorData.error || "Ошибка настройки webhook")
      }
    } catch {
      setWebhookError("Ошибка подключения к серверу")
    } finally {
      setWebhookLoading(false)
    }
  }

  const handleDeleteWebhook = async () => {
    setWebhookLoading(true)
    setWebhookError(null)
    try {
      const res = await fetch("/api/telegram/admin", { method: "DELETE" })
      if (res.ok) {
        setSuccess("Webhook удалён")
        await fetchWebhookStatus()
      } else {
        const errorData = await res.json()
        setWebhookError(errorData.error || "Ошибка удаления webhook")
      }
    } catch {
      setWebhookError("Ошибка подключения к серверу")
    } finally {
      setWebhookLoading(false)
    }
  }

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
      // Load Telegram status for teachers/co-admins/admins
      const telegramRoles = ["TEACHER", "CO_ADMIN", "ADMIN"]
      if (session.user?.role && telegramRoles.includes(session.user.role)) {
        fetchTelegramStatus()
      }
      // Load webhook status for co-admins/admins
      const webhookRoles = ["CO_ADMIN", "ADMIN"]
      if (session.user?.role && webhookRoles.includes(session.user.role)) {
        fetchWebhookStatus()
      }
    }
  }, [session, status, router, fetchTelegramStatus, fetchWebhookStatus])

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
      const { deepLink, shortCode } = await res.json()
      setTelegramDeepLink(deepLink)
      setTelegramShortCode(shortCode)
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

  const handleTestNotification = async () => {
    setTestLoading(true)
    setError("")
    try {
      const res = await fetch("/api/telegram/test", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Ошибка отправки")
      }
      setSuccess("Тестовое сообщение отправлено в Telegram")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки тестового сообщения")
    } finally {
      setTestLoading(false)
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
      case "CO_ADMIN": return "Со-администратор"
      case "TEACHER": return "Эксперт"
      case "STUDENT": return "Ученик"
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-purple-100 text-purple-700"
      case "CO_ADMIN": return "bg-indigo-100 text-indigo-700"
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

          {/* Telegram Notifications - only for teachers/co-admins/admins */}
          {["TEACHER", "CO_ADMIN", "ADMIN"].includes(profile.role) && telegramStatus?.isConfigured && (
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

                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={handleTestNotification}
                        disabled={testLoading || !telegramStatus.isEnabled}
                        className="flex-1"
                      >
                        {testLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Тест уведомления
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleTelegramDisconnect}
                        disabled={telegramLoading}
                        className="flex-1"
                      >
                        {telegramLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Unlink className="h-4 w-4 mr-2" />
                        )}
                        Отключить
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Подключите Telegram, чтобы получать уведомления о новых работах студентов.
                    </p>

                    {telegramDeepLink ? (
                      <div className="space-y-4">
                        <a
                          href={telegramDeepLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Открыть Telegram
                        </a>

                        {telegramShortCode && (
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-500 mb-2 text-center">
                              Или отправьте этот код боту в Telegram:
                            </p>
                            <p className="text-2xl font-mono font-bold text-center tracking-widest text-gray-900">
                              {telegramShortCode}
                            </p>
                          </div>
                        )}

                        <p className="text-xs text-gray-500 text-center">
                          Ссылка действительна 15 минут
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTelegramDeepLink(null)
                            setTelegramShortCode(null)
                          }}
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

          {/* Telegram Bot Administration - CO_ADMIN and ADMIN */}
          {["CO_ADMIN", "ADMIN"].includes(profile.role) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Управление Telegram-ботом
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {webhookError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {webhookError}
                  </div>
                )}

                {webhookLoading && !webhookStatus ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  </div>
                ) : webhookStatus ? (
                  <div className="space-y-4">
                    {/* Status overview */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Webhook className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">Webhook</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {webhookStatus.isConfigured && webhookStatus.urlMatches ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-600">Активен</span>
                            </>
                          ) : webhookStatus.isConfigured ? (
                            <>
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm text-yellow-600">Неверный URL</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-sm text-red-600">Не настроен</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Key className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">Secret Token</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {webhookStatus.hasSecretToken ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-600">Настроен</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-sm text-red-600">Отсутствует</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pending updates */}
                    {webhookStatus.pendingUpdates > 0 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-700">
                          <Info className="h-4 w-4" />
                          <span className="text-sm">
                            Ожидающих обновлений: {webhookStatus.pendingUpdates}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Last error */}
                    {webhookStatus.lastErrorMessage && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2 text-red-700">
                          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium">Последняя ошибка</p>
                            <p className="text-sm">{webhookStatus.lastErrorMessage}</p>
                            {webhookStatus.lastErrorDate && (
                              <p className="text-xs text-red-500 mt-1">
                                {new Date(webhookStatus.lastErrorDate).toLocaleString("ru-RU")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expected URL info */}
                    {webhookStatus.expectedUrl && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Ожидаемый URL webhook:</p>
                        <p className="text-xs font-mono text-gray-700 break-all">
                          {webhookStatus.expectedUrl}
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button
                        onClick={handleSetupWebhook}
                        disabled={webhookLoading}
                        className="flex-1"
                      >
                        {webhookLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        {webhookStatus.isConfigured ? "Переустановить webhook" : "Установить webhook"}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={fetchWebhookStatus}
                        disabled={webhookLoading}
                      >
                        {webhookLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>

                      {webhookStatus.isConfigured && (
                        <Button
                          variant="destructive"
                          onClick={handleDeleteWebhook}
                          disabled={webhookLoading}
                        >
                          {webhookLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          Удалить
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>Не удалось загрузить статус webhook</p>
                    <Button
                      variant="outline"
                      onClick={fetchWebhookStatus}
                      className="mt-2"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Повторить
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
