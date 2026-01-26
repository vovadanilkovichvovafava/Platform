"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import {
  Trophy,
  Medal,
  Star,
  Flame,
  Award,
  RefreshCw,
  Crown,
  ChevronRight,
  Zap,
  Target,
  TrendingUp,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

interface LeaderboardEntry {
  rank: number
  id: string
  name: string
  totalXP: number
  streak: number
  avatarUrl: string | null
  modulesCompleted: number
  certificates: number
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />
  return <span className="text-gray-400 font-medium w-6 text-center">{rank}</span>
}

function getRankStyle(rank: number) {
  if (rank === 1) return "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"
  if (rank === 2) return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200"
  if (rank === 3) return "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
  return "bg-white border-gray-100"
}

function formatXPDifference(current: number, next: number) {
  const diff = current - next
  if (diff <= 0) return null
  return `+${diff}`
}

export default function LeaderboardPage() {
  const { data: session } = useSession()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  useEffect(() => {
    if (!loading && leaderboard.length > 0) {
      // Trigger animation after data loads
      setTimeout(() => setAnimateIn(true), 100)
    }
  }, [loading, leaderboard.length])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/leaderboard")
      if (res.ok) {
        const data = await res.json()
        setLeaderboard(data)
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  // Find current user's position
  const currentUserEntry = session?.user
    ? leaderboard.find((e) => e.id === session.user.id)
    : null

  // Calculate total XP in leaderboard
  const totalXP = leaderboard.reduce((sum, e) => sum + e.totalXP, 0)
  const totalModules = leaderboard.reduce((sum, e) => sum + e.modulesCompleted, 0)
  const totalCertificates = leaderboard.reduce((sum, e) => sum + e.certificates, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Загрузка рейтинга...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Breadcrumbs
          items={[{ label: "Лидерборд" }]}
          className="mb-6"
        />

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 mb-8 shadow-xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                <Trophy className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                  Лидерборд
                  <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
                </h1>
                <p className="text-white/80">
                  Топ студентов по заработанным очкам опыта
                </p>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-colors">
                <div className="flex items-center gap-2 text-white/70 mb-1">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm">Общий XP</span>
                </div>
                <p className="text-2xl font-bold text-white">{totalXP.toLocaleString()}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-colors">
                <div className="flex items-center gap-2 text-white/70 mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-sm">Модулей</span>
                </div>
                <p className="text-2xl font-bold text-white">{totalModules}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-colors">
                <div className="flex items-center gap-2 text-white/70 mb-1">
                  <Award className="h-4 w-4" />
                  <span className="text-sm">Сертификатов</span>
                </div>
                <p className="text-2xl font-bold text-white">{totalCertificates}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current user position */}
        {currentUserEntry && currentUserEntry.rank > 10 && (
          <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg shadow-lg">
                  #{currentUserEntry.rank}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-blue-900">Ваша позиция в рейтинге</p>
                  <p className="text-sm text-blue-600">{currentUserEntry.totalXP.toLocaleString()} XP</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <p className="text-sm text-blue-600 font-medium">
                      {currentUserEntry.modulesCompleted} модулей
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 3 podium */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8 items-end">
            {/* 2nd place */}
            <Link href={`/dashboard/${leaderboard[1].id}`} className="group">
              <Card
                className={`text-center bg-gradient-to-b from-slate-100 to-white border-2 border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 ${
                  animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: "200ms" }}
              >
                <CardContent className="p-5 pt-8">
                  <div className="relative">
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm shadow-sm">
                      2
                    </div>
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xl font-bold text-slate-700 mb-3 shadow-inner ring-4 ring-slate-100 group-hover:ring-slate-200 transition-all">
                      {getInitials(leaderboard[1].name)}
                    </div>
                  </div>
                  <Medal className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold text-gray-900 truncate group-hover:text-slate-700">
                    {leaderboard[1].name}
                  </p>
                  <p className="text-xl font-bold text-slate-600 mt-1">
                    {leaderboard[1].totalXP.toLocaleString()}
                    <span className="text-sm font-normal text-slate-400 ml-1">XP</span>
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {leaderboard[1].modulesCompleted}
                    </span>
                    {leaderboard[1].streak > 0 && (
                      <span className="flex items-center gap-1 text-orange-500">
                        <Flame className="h-3 w-3" />
                        {leaderboard[1].streak}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* 1st place */}
            <Link href={`/dashboard/${leaderboard[0].id}`} className="group">
              <Card
                className={`text-center bg-gradient-to-b from-yellow-50 via-amber-50 to-white border-2 border-yellow-300 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-yellow-400 relative ${
                  animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: "100ms" }}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-yellow-100/50 to-transparent pointer-events-none" />
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-yellow-300/30 rounded-full blur-3xl" />

                <CardContent className="p-5 pt-6 relative z-10">
                  <div className="relative">
                    <Crown className="h-10 w-10 text-yellow-500 mx-auto mb-2 drop-shadow-lg animate-bounce" style={{ animationDuration: "2s" }} />
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 flex items-center justify-center text-2xl font-bold text-yellow-900 mb-3 shadow-lg ring-4 ring-yellow-200 group-hover:ring-yellow-300 group-hover:scale-105 transition-all">
                      {getInitials(leaderboard[0].name)}
                    </div>
                  </div>
                  <p className="font-bold text-gray-900 truncate text-lg group-hover:text-yellow-800">
                    {leaderboard[0].name}
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">
                    {leaderboard[0].totalXP.toLocaleString()}
                    <span className="text-sm font-normal text-yellow-500 ml-1">XP</span>
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100">
                      <Target className="h-3 w-3 mr-1" />
                      {leaderboard[0].modulesCompleted} модулей
                    </Badge>
                    {leaderboard[0].streak > 0 && (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
                        <Flame className="h-3 w-3 mr-1" />
                        {leaderboard[0].streak} дней
                      </Badge>
                    )}
                  </div>
                  {leaderboard[0].certificates > 0 && (
                    <div className="mt-3 flex items-center justify-center gap-1 text-xs text-yellow-600">
                      <Award className="h-4 w-4" />
                      <span>{leaderboard[0].certificates} сертификатов</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>

            {/* 3rd place */}
            <Link href={`/dashboard/${leaderboard[2].id}`} className="group">
              <Card
                className={`text-center bg-gradient-to-b from-amber-100 to-white border-2 border-amber-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-amber-300 ${
                  animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: "300ms" }}
              >
                <CardContent className="p-5 pt-10">
                  <div className="relative">
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center text-amber-700 font-bold text-sm shadow-sm">
                      3
                    </div>
                    <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-amber-200 to-amber-300 flex items-center justify-center text-lg font-bold text-amber-800 mb-3 shadow-inner ring-4 ring-amber-100 group-hover:ring-amber-200 transition-all">
                      {getInitials(leaderboard[2].name)}
                    </div>
                  </div>
                  <Medal className="h-5 w-5 text-amber-600 mx-auto mb-2" />
                  <p className="font-semibold text-gray-900 truncate group-hover:text-amber-800">
                    {leaderboard[2].name}
                  </p>
                  <p className="text-lg font-bold text-amber-600 mt-1">
                    {leaderboard[2].totalXP.toLocaleString()}
                    <span className="text-sm font-normal text-amber-400 ml-1">XP</span>
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-3 text-xs text-amber-600">
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {leaderboard[2].modulesCompleted}
                    </span>
                    {leaderboard[2].streak > 0 && (
                      <span className="flex items-center gap-1 text-orange-500">
                        <Flame className="h-3 w-3" />
                        {leaderboard[2].streak}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Full list */}
        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Полный рейтинг
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {leaderboard.map((entry, index) => {
                const isCurrentUser = session?.user?.id === entry.id
                const prevEntry = index > 0 ? leaderboard[index - 1] : null
                const xpDiff = prevEntry ? formatXPDifference(prevEntry.totalXP, entry.totalXP) : null

                return (
                  <Link
                    key={entry.id}
                    href={`/dashboard/${entry.id}`}
                    className={`flex items-center gap-4 p-4 ${getRankStyle(entry.rank)} ${
                      isCurrentUser ? "ring-2 ring-blue-400 ring-inset bg-blue-50/50" : ""
                    } hover:bg-gray-50/80 transition-all duration-200 cursor-pointer group ${
                      animateIn ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                    }`}
                    style={{ transitionDelay: `${400 + index * 50}ms` }}
                  >
                    <div className="w-10 flex justify-center">
                      {getRankIcon(entry.rank)}
                    </div>

                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold shadow-sm transition-transform duration-200 group-hover:scale-110 ${
                      entry.rank === 1 ? "bg-gradient-to-br from-yellow-200 to-amber-300 text-yellow-800" :
                      entry.rank === 2 ? "bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700" :
                      entry.rank === 3 ? "bg-gradient-to-br from-amber-200 to-amber-300 text-amber-800" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {getInitials(entry.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold truncate ${isCurrentUser ? "text-blue-700" : "text-gray-900"} group-hover:text-blue-600 transition-colors`}>
                          {entry.name}
                        </span>
                        {isCurrentUser && (
                          <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                            Вы
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {entry.modulesCompleted} модулей
                        </span>
                        {entry.certificates > 0 && (
                          <span className="flex items-center gap-1 text-purple-500">
                            <Award className="h-3 w-3" />
                            {entry.certificates}
                          </span>
                        )}
                        {entry.streak > 0 && (
                          <span className="flex items-center gap-1 text-orange-500">
                            <Flame className="h-3 w-3" />
                            {entry.streak} дней
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      {xpDiff && entry.rank > 1 && (
                        <span className="text-xs text-gray-400 hidden sm:block">
                          -{xpDiff} от #{entry.rank - 1}
                        </span>
                      )}
                      <div className="min-w-[60px]">
                        <p className={`font-bold ${entry.rank <= 3 ? "text-lg" : ""} ${
                          entry.rank === 1 ? "text-yellow-600" :
                          entry.rank === 2 ? "text-slate-500" :
                          entry.rank === 3 ? "text-amber-600" :
                          "text-gray-700"
                        }`}>
                          {entry.totalXP.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">XP</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                )
              })}

              {leaderboard.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Пока нет студентов в рейтинге</p>
                  <p className="text-sm mt-1">Будьте первым!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Motivational footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p className="flex items-center justify-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            Зарабатывайте XP, выполняя модули и получая достижения
            <Star className="h-4 w-4 text-yellow-500" />
          </p>
        </div>
      </div>
    </div>
  )
}
