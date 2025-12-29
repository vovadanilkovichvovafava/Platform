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
import { LogOut, User, Settings, BookOpen, ClipboardCheck, Flame } from "lucide-react"

export function Header() {
  const { data: session } = useSession()

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
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
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
              {session.user.role === "TEACHER" && (
                <Link
                  href="/teacher"
                  className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
                >
                  Панель эксперта
                </Link>
              )}
              {session.user.role === "ADMIN" && (
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

        <div className="flex items-center gap-4">
          {session ? (
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
                  <Link href="/dashboard" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
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
                {session.user.role === "TEACHER" && (
                  <>
                    <DropdownMenuSeparator className="bg-slate-100" />
                    <DropdownMenuItem asChild className="text-slate-700 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                      <Link href="/teacher" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Панель эксперта
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
          ) : (
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white border-0">
              <Link href="/login">Войти</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
