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
import {
  LogOut, User, Settings, BookOpen, ClipboardCheck, Flame, Shield, Award,
  Trophy, BarChart3, Menu, X, FolderKanban, Home, Star, Heart, Bell,
  Search, Plus, Check, ArrowRight, ExternalLink, FileText, Users,
  Calendar, Clock, Target, Zap, Code, Database, Globe, Lock, Unlock, Edit, Trash2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { NotificationBell } from "@/components/notification-bell"

// Icon map for dynamic rendering
const ICON_MAP: Record<string, LucideIcon> = {
  Flame, BookOpen, ClipboardCheck, Trophy, Settings,
  FolderKanban, Shield, BarChart3, User, Award,
  Home, Star, Heart, Bell, Search, Menu, Plus,
  Check, X, ArrowRight, ExternalLink, FileText,
  Users, Calendar, Clock, Target, Zap, Code,
  Database, Globe, Lock, Unlock, Edit, Trash2,
}

// Type for navbar item from API
interface NavbarItemDTO {
  id: string
  label: string
  href: string
  icon: string
  order: number
  visibleTo: string[]
}

// Default navbar items (fallback when no preset is active or API fails)
const DEFAULT_NAVBAR_ITEMS: NavbarItemDTO[] = [
  { id: "default-1", label: "Dashboard", href: "/dashboard", icon: "Flame", order: 0, visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { id: "default-2", label: "Trails", href: "/trails", icon: "BookOpen", order: 1, visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { id: "default-3", label: "Мои работы", href: "/my-work", icon: "ClipboardCheck", order: 2, visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { id: "default-4", label: "Лидерборд", href: "/leaderboard", icon: "Trophy", order: 3, visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { id: "default-5", label: "Панель эксперта", href: "/teacher", icon: "Settings", order: 4, visibleTo: ["TEACHER", "CO_ADMIN", "ADMIN"] },
  { id: "default-6", label: "Контент", href: "/content", icon: "FolderKanban", order: 5, visibleTo: ["TEACHER", "CO_ADMIN", "ADMIN"] },
  { id: "default-7", label: "Админ панель", href: "/admin/invites", icon: "Shield", order: 6, visibleTo: ["CO_ADMIN", "ADMIN"] },
  { id: "default-8", label: "Аналитика", href: "/admin/analytics", icon: "BarChart3", order: 7, visibleTo: ["CO_ADMIN", "ADMIN"] },
]

// Dropdown menu items (always shown, not from preset)
const DROPDOWN_STATIC_ITEMS = [
  { label: "Мой профиль", href: "/profile", icon: "User", visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
  { label: "Сертификаты", href: "/certificates", icon: "Award", visibleTo: ["STUDENT", "TEACHER", "CO_ADMIN", "ADMIN"] },
]

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

// Hook to fetch active navbar preset
function useNavbarPreset(isAuthenticated: boolean) {
  const [items, setItems] = useState<NavbarItemDTO[]>(DEFAULT_NAVBAR_ITEMS)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setItems(DEFAULT_NAVBAR_ITEMS)
      setIsLoaded(true)
      return
    }

    const fetchPreset = async () => {
      try {
        const res = await fetch("/api/navbar-preset")
        if (res.ok) {
          const data = await res.json()
          if (data.items && Array.isArray(data.items) && data.items.length > 0) {
            setItems(data.items)
          }
        }
      } catch {
        // Silently fail - use default items
      } finally {
        setIsLoaded(true)
      }
    }

    fetchPreset()
  }, [isAuthenticated])

  return { items, isLoaded }
}

// Helper to check if item is visible for role
function isVisibleForRole(item: NavbarItemDTO, role: string | undefined): boolean {
  if (!role) return false
  return item.visibleTo.includes(role)
}

// Helper to check if item is privileged (for styling)
function isPrivilegedItem(item: NavbarItemDTO): boolean {
  // If visible to admin/co_admin/teacher but not to student, it's a privileged item
  return !item.visibleTo.includes("STUDENT") && (
    item.visibleTo.includes("TEACHER") ||
    item.visibleTo.includes("CO_ADMIN") ||
    item.visibleTo.includes("ADMIN")
  )
}

// Render icon component by name
function NavIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name]
  if (!Icon) return <Flame className={className} /> // Fallback icon
  return <Icon className={className} />
}

export function Header() {
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Fetch navbar preset items
  const { items: navbarItems } = useNavbarPreset(!!session?.user?.id)

  // Страховка: обрабатываем notificationId из URL при переходе по ссылке из уведомления
  useMarkNotificationFromUrl()

  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }, [])

  // Filter items visible for current user role
  const visibleItems = navbarItems.filter((item) =>
    isVisibleForRole(item, session?.user?.role)
  )

  // Separate items for desktop nav (first 4-6 items) and rest for dropdown
  const desktopNavItems = visibleItems.slice(0, 6)
  const dropdownNavItems = visibleItems

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

          {/* Desktop Navigation */}
          {session && (
            <nav className="hidden md:flex items-center gap-6">
              {desktopNavItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    isPrivilegedItem(item)
                      ? "text-orange-500 hover:text-orange-600"
                      : "text-slate-600 hover:text-orange-500"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
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

                {/* Static items (Profile, Certificates) */}
                {DROPDOWN_STATIC_ITEMS.filter((item) =>
                  item.visibleTo.includes(session.user.role || "STUDENT")
                ).map((item) => (
                  <DropdownMenuItem
                    key={item.href}
                    asChild
                    className="text-slate-700 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100"
                  >
                    <Link href={item.href} className="cursor-pointer">
                      <NavIcon name={item.icon} className="mr-2 h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="bg-slate-100" />

                {/* Dynamic items from preset */}
                {dropdownNavItems.map((item, index) => {
                  const isPrivileged = isPrivilegedItem(item)
                  // Add separator before privileged items
                  const showSeparator = isPrivileged &&
                    index > 0 &&
                    !isPrivilegedItem(dropdownNavItems[index - 1])

                  return (
                    <div key={item.id}>
                      {showSeparator && <DropdownMenuSeparator className="bg-slate-100" />}
                      <DropdownMenuItem
                        asChild
                        className="text-slate-700 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100"
                      >
                        <Link href={item.href} className="cursor-pointer">
                          <NavIcon name={item.icon} className="mr-2 h-4 w-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    </div>
                  )
                })}

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
            {visibleItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg ${
                  isPrivilegedItem(item)
                    ? "text-orange-600 hover:bg-orange-50"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
