"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, User, Settings, BookOpen, ClipboardCheck, Flame, Shield, Award, Trophy, BarChart3, Menu, X, FolderKanban } from "lucide-react"
import { useState, useEffect } from "react"
import { NotificationBell } from "@/components/notification-bell"

// Страховка: обрабатываем notificationId из URL и отмечаем уведомление как прочитанное
function useMarkNotificationFromUrl() {
  const { data: session } = useSession()

  useEffect(() => {
    if (!session?.user?.id) return

    const url = new URL(window.location.href)
    const notificationId = url.searchParams.get("notificationId")

    // Проверяем валидность notificationId (cuid формат - 25 символов, буквы и цифры)
    if (!notificationId || !/^[a-z0-9]{20,30}$/i.test(notificationId)) {
      return
    }

    // Fire-and-forget запрос - не блокируем рендер страницы
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds: [notificationId] }),
      keepalive: true,
    }).catch(() => {
      // Тихий fail - уведомление уже могло быть прочитано
    })

    // Убираем notificationId из URL без перезагрузки страницы (чистый URL)
    url.searchParams.delete("notificationId")
    window.history.replaceState({}, "", url.toString())
  }, [session?.user?.id])
}

// Helper to check if user has any admin role (ADMIN or CO_ADMIN)
function isAnyAdminRole(role: string | undefined): boolean {
  return role === "ADMIN" || role === "CO_ADMIN"
}

// Helper to check if user is privileged (TEACHER, CO_ADMIN, or ADMIN)
function isPrivilegedRole(role: string | undefined): boolean {
  return role === "TEACHER" || role === "CO_ADMIN" || role === "ADMIN"
}

export function Header() {
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Страховка: обрабатываем notificationId из URL при переходе по ссылке из уведомления
  useMarkNotificationFromUrl()

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4 md:gap-8">
          {/* Mobile menu button */}
          {session && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          )}

          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex-shrink-0">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div className="flex-col hidden sm:flex">
              <span className="text-xl font-bold text-slate-900 leading-tight">
                Prometheus
              </span>
              <span className="text-xs text-slate-500 leading-tight">
                R&D Academy
              </span>
            </div>
          </Link>

          {session && (
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-600 hover:text-orange-500 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/trails"
                className="text-sm font-medium text-slate-600 hover:text-orange-500 transition-colors"
              >
                Trails
              </Link>
              <Link
                href="/my-work"
                className="text-sm font-medium text-slate-600 hover:text-orange-500 transition-colors"
              >
                Мои работы
              </Link>
              <Link
                href="/leaderboard"
                className="text-sm font-medium text-slate-600 hover:text-orange-500 transition-colors"
              >
                Лидерборд
              </Link>
              {isPrivilegedRole(session.user.role) && (
                <>
                  <Link
                    href="/teacher"
                    className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
                  >
                    Панель эксперта
                  </Link>
                  <Link
                    href="/content"
                    className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
                  >
                    Контент
                  </Link>
                </>
              )}
              {isAnyAdminRole(session.user.role) && (
                <Link
                  href="/admin/invites"
                  className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
                >
                  Админ панель
                </Link>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <NotificationBell />
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-slate-100">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                      {getInitials(session.user.name || "U")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white border-slate-200" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-slate-900">{session.user.name}</p>
                    <p className="text-sm text-slate-500">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem asChild className="text-slate-700 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Мой профиль
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem asChild className="text-slate-700 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                  <Link href="/dashboard" className="cursor-pointer">
                    <Flame className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-slate-700 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                  <Link href="/trails" className="cursor-pointer">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Trails
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-slate-700 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                  <Link href="/my-work" className="cursor-pointer">
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Мои работы
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-slate-700 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                  <Link href="/certificates" className="cursor-pointer">
                    <Award className="mr-2 h-4 w-4" />
                    Сертификаты
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-slate-700 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                  <Link href="/leaderboard" className="cursor-pointer">
                    <Trophy className="mr-2 h-4 w-4" />
                    Лидерборд
                  </Link>
                </DropdownMenuItem>
                {isPrivilegedRole(session.user.role) && (
                  <>
                    <DropdownMenuSeparator className="bg-slate-100" />
                    <DropdownMenuItem asChild className="text-slate-700 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                      <Link href="/teacher" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Панель эксперта
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-slate-700 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                      <Link href="/content" className="cursor-pointer">
                        <FolderKanban className="mr-2 h-4 w-4" />
                        Контент
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {isAnyAdminRole(session.user.role) && (
                  <>
                    <DropdownMenuItem asChild className="text-slate-700 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                      <Link href="/admin/invites" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        Админ панель
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-slate-700 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                      <Link href="/admin/analytics" className="cursor-pointer">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Аналитика
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem
                  className="cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-50"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white border-0">
              <Link href="/login">Войти</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {session && mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <nav className="container mx-auto px-4 py-3 space-y-1">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <Flame className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/trails"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <BookOpen className="h-4 w-4" />
              Trails
            </Link>
            <Link
              href="/my-work"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <ClipboardCheck className="h-4 w-4" />
              Мои работы
            </Link>
            <Link
              href="/leaderboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <Trophy className="h-4 w-4" />
              Лидерборд
            </Link>
            {isPrivilegedRole(session.user.role) && (
              <>
                <Link
                  href="/teacher"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg"
                >
                  <Settings className="h-4 w-4" />
                  Панель эксперта
                </Link>
                <Link
                  href="/content"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg"
                >
                  <FolderKanban className="h-4 w-4" />
                  Контент
                </Link>
              </>
            )}
            {isAnyAdminRole(session.user.role) && (
              <>
                <Link
                  href="/admin/invites"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg"
                >
                  <Shield className="h-4 w-4" />
                  Админ панель
                </Link>
                <Link
                  href="/admin/analytics"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg"
                >
                  <BarChart3 className="h-4 w-4" />
                  Аналитика
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
