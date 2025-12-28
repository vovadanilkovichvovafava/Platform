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
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#070714]/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              Prometheus
            </span>
          </Link>

          {session && (
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-white/60 hover:text-orange-400 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/trails"
                className="text-sm font-medium text-white/60 hover:text-orange-400 transition-colors"
              >
                Trails
              </Link>
              <Link
                href="/my-work"
                className="text-sm font-medium text-white/60 hover:text-orange-400 transition-colors"
              >
                Мои работы
              </Link>
              {session.user.role === "TEACHER" && (
                <Link
                  href="/teacher"
                  className="text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Панель эксперта
                </Link>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-white/10">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                      {getInitials(session.user.name || "U")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-[#0c0c1d] border-white/10" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-white">{session.user.name}</p>
                    <p className="text-sm text-white/50">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem asChild className="text-white/70 hover:text-white focus:text-white focus:bg-white/10">
                  <Link href="/dashboard" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-white/70 hover:text-white focus:text-white focus:bg-white/10">
                  <Link href="/trails" className="cursor-pointer">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Trails
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-white/70 hover:text-white focus:text-white focus:bg-white/10">
                  <Link href="/my-work" className="cursor-pointer">
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Мои работы
                  </Link>
                </DropdownMenuItem>
                {session.user.role === "TEACHER" && (
                  <>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem asChild className="text-white/70 hover:text-white focus:text-white focus:bg-white/10">
                      <Link href="/teacher" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Панель эксперта
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild className="text-white/70 hover:text-white hover:bg-white/10">
                <Link href="/login">Войти</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0">
                <Link href="/register">Начать</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
