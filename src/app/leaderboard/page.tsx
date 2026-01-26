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

export default function LeaderboardPage() {
  const { data: session } = useSession()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Breadcrumbs
          items={[{ label: "Лидерборд" }]}
          className="mb-6"
        />

        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Лидерборд</h1>
            <p className="text-gray-500 text-sm">
              Топ студентов по заработанным очкам
            </p>
          </div>
        </div>

        {/* Current user position */}
        {currentUserEntry && currentUserEntry.rank > 10 && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold">
                  #{currentUserEntry.rank}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Ваша позиция</p>
                  <p className="text-sm text-blue-600">{currentUserEntry.totalXP} XP</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-600">
                    {currentUserEntry.modulesCompleted} модулей
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 3 podium */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* 2nd place */}
            <Link href={`/dashboard/${leaderboard[1].id}`}>
              <Card className="text-center pt-8 bg-gradient-to-b from-gray-50 to-white order-1 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-700 mb-2">
                    {getInitials(leaderboard[1].name)}
                  </div>
                  <Medal className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                  <p className="font-medium text-gray-900 truncate">{leaderboard[1].name}</p>
                  <p className="text-lg font-bold text-gray-600">{leaderboard[1].totalXP} XP</p>
                </CardContent>
              </Card>
            </Link>

            {/* 1st place */}
            <Link href={`/dashboard/${leaderboard[0].id}`}>
              <Card className="text-center bg-gradient-to-b from-yellow-50 to-white border-yellow-200 order-0 lg:order-1 -mt-4 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4 pt-8">
                  <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <div className="w-20 h-20 mx-auto rounded-full bg-yellow-100 flex items-center justify-center text-2xl font-bold text-yellow-700 mb-2">
                    {getInitials(leaderboard[0].name)}
                  </div>
                  <p className="font-medium text-gray-900 truncate">{leaderboard[0].name}</p>
                  <p className="text-2xl font-bold text-yellow-600">{leaderboard[0].totalXP} XP</p>
                  {leaderboard[0].streak > 0 && (
                    <Badge className="mt-2 bg-orange-100 text-orange-700 border-0">
                      <Flame className="h-3 w-3 mr-1" />
                      {leaderboard[0].streak} дней
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>

            {/* 3rd place */}
            <Link href={`/dashboard/${leaderboard[2].id}`}>
              <Card className="text-center pt-12 bg-gradient-to-b from-amber-50 to-white order-2 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-lg font-bold text-amber-700 mb-2">
                    {getInitials(leaderboard[2].name)}
                  </div>
                  <Medal className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                  <p className="font-medium text-gray-900 truncate">{leaderboard[2].name}</p>
                  <p className="text-lg font-bold text-amber-600">{leaderboard[2].totalXP} XP</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Full list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Рейтинг
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {leaderboard.map((entry) => {
                const isCurrentUser = session?.user?.id === entry.id

                return (
                  <Link
                    key={entry.id}
                    href={`/dashboard/${entry.id}`}
                    className={`flex items-center gap-4 p-4 ${getRankStyle(entry.rank)} ${
                      isCurrentUser ? "ring-2 ring-blue-400 ring-inset" : ""
                    } hover:bg-gray-50 transition-colors cursor-pointer`}
                  >
                    <div className="w-8 flex justify-center">
                      {getRankIcon(entry.rank)}
                    </div>

                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-medium text-gray-600">
                      {getInitials(entry.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${isCurrentUser ? "text-blue-700" : "text-gray-900"}`}>
                          {entry.name}
                        </span>
                        {isCurrentUser && (
                          <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                            Вы
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{entry.modulesCompleted} модулей</span>
                        {entry.certificates > 0 && (
                          <span className="flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            {entry.certificates}
                          </span>
                        )}
                        {entry.streak > 0 && (
                          <span className="flex items-center gap-1 text-orange-500">
                            <Flame className="h-3 w-3" />
                            {entry.streak}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      <div>
                        <p className={`font-bold ${entry.rank <= 3 ? "text-lg" : ""} ${
                          entry.rank === 1 ? "text-yellow-600" :
                          entry.rank === 2 ? "text-gray-500" :
                          entry.rank === 3 ? "text-amber-600" :
                          "text-gray-700"
                        }`}>
                          {entry.totalXP}
                        </p>
                        <p className="text-xs text-gray-400">XP</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-300" />
                    </div>
                  </Link>
                )
              })}

              {leaderboard.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  Пока нет студентов в рейтинге
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
