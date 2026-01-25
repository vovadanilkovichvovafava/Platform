"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import {
  Star,
  Trophy,
  BookOpen,
  Award,
  Loader2,
  Lock,
  Medal,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  ExternalLink,
} from "lucide-react"

interface StudentProfile {
  id: string
  name: string
  avatarUrl: string | null
  totalXP: number
  createdAt: string
  leaderboardRank: number
  totalStudents: number
  stats: {
    modulesCompleted: number
    submissions: number
    certificatesCount: number
    enrolledTrails: number
  }
  submissionStats: {
    pending: number
    approved: number
    rejected: number
  }
  certificates: Array<{
    id: string
    uniqueCode: string
    issuedAt: string
    trail: {
      title: string
      slug: string
      color: string
      icon: string
    }
  }>
  achievements: {
    all: Array<{
      id: string
      name: string
      description: string
      icon: string
      color: string
      rarity: string
      earned: boolean
      earnedAt: string | null
    }>
    count: number
    total: number
  }
  trails: Array<{
    id: string
    slug: string
    title: string
    color: string
    icon: string
    totalModules: number
    completedModules: number
    progress: number
  }>
}

function getRank(xp: number) {
  if (xp >= 1000) return { name: "Master", color: "text-purple-600", bg: "bg-purple-100" }
  if (xp >= 500) return { name: "Expert", color: "text-blue-600", bg: "bg-blue-100" }
  if (xp >= 200) return { name: "Intermediate", color: "text-green-600", bg: "bg-green-100" }
  return { name: "Beginner", color: "text-gray-600", bg: "bg-gray-100" }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getRarityLabel(rarity: string) {
  switch (rarity) {
    case "common": return "Обычное"
    case "uncommon": return "Необычное"
    case "rare": return "Редкое"
    case "epic": return "Эпическое"
    case "legendary": return "Легендарное"
    default: return rarity
  }
}

function getRarityBorder(rarity: string) {
  switch (rarity) {
    case "common": return "border-gray-200"
    case "uncommon": return "border-green-300"
    case "rare": return "border-blue-400"
    case "epic": return "border-purple-500"
    case "legendary": return "border-yellow-500"
    default: return "border-gray-200"
  }
}

interface Props {
  params: Promise<{ userId: string }>
}

export default function PublicDashboardPage({ params }: Props) {
  const { data: session } = useSession()
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    params.then((p) => setUserId(p.userId))
  }, [params])

  useEffect(() => {
    if (!userId) return

    const fetchProfile = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/students/${userId}/public`)
        if (!res.ok) {
          if (res.status === 404) {
            setError("Студент не найден")
          } else {
            throw new Error("Failed to fetch profile")
          }
          return
        }
        const data = await res.json()
        setProfile(data)
      } catch {
        setError("Не удалось загрузить профиль")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  const isOwnProfile = session?.user?.id === userId

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0176D3]" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <Trophy className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {error || "Профиль не найден"}
            </h2>
            <p className="text-gray-500 mb-4">
              Возможно, студент не существует или профиль недоступен
            </p>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 text-[#0176D3] hover:underline"
            >
              Перейти к лидерборду
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const rank = getRank(profile.totalXP)
  const totalSubmissions = profile.submissionStats.approved + profile.submissionStats.rejected + profile.submissionStats.pending
  const successRate = totalSubmissions > 0
    ? Math.round((profile.submissionStats.approved / totalSubmissions) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Breadcrumbs
          items={[
            { label: "Лидерборд", href: "/leaderboard" },
            { label: profile.name },
          ]}
          className="mb-6"
        />

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-orange-50 rounded-2xl p-8 mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar and Basic Info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-[#0176D3] to-[#014486] text-white text-2xl">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${rank.bg} ${rank.color} border-0`}>
                    {rank.name}
                  </Badge>
                  {isOwnProfile && (
                    <Badge className="bg-blue-100 text-blue-700 border-0">
                      Это вы
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  На платформе с {new Date(profile.createdAt).toLocaleDateString("ru-RU", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 md:ml-auto">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-yellow-500 mb-1">
                  <Star className="h-5 w-5" />
                  <span className="text-2xl font-bold">{profile.totalXP}</span>
                </div>
                <p className="text-xs text-gray-500">Всего XP</p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-[#0176D3] mb-1">
                  <Medal className="h-5 w-5" />
                  <span className="text-2xl font-bold">#{profile.leaderboardRank}</span>
                </div>
                <p className="text-xs text-gray-500">в рейтинге из {profile.totalStudents}</p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-green-500 mb-1">
                  <Trophy className="h-5 w-5" />
                  <span className="text-2xl font-bold">{profile.stats.modulesCompleted}</span>
                </div>
                <p className="text-xs text-gray-500">модулей пройдено</p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-purple-500 mb-1">
                  <Award className="h-5 w-5" />
                  <span className="text-2xl font-bold">{profile.stats.certificatesCount}</span>
                </div>
                <p className="text-xs text-gray-500">сертификатов</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Submissions Graph */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#0176D3]" />
                  Статистика работ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-700">{profile.submissionStats.approved}</p>
                    <p className="text-xs text-green-600">Принято</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-xl">
                    <Clock className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-orange-700">{profile.submissionStats.pending}</p>
                    <p className="text-xs text-orange-600">На проверке</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <XCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-700">{profile.submissionStats.rejected}</p>
                    <p className="text-xs text-red-600">На доработку</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Успешность сдачи</span>
                    <span className="font-medium text-gray-900">{successRate}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all"
                      style={{ width: `${successRate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certificates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Сертификаты
                  <Badge variant="secondary" className="ml-auto">
                    {profile.certificates.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.certificates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.certificates.map((cert) => (
                      <Link
                        key={cert.id}
                        href={`/certificates/${cert.uniqueCode}`}
                        className="group"
                      >
                        <div
                          className="relative p-4 rounded-xl border-2 transition-all hover:shadow-lg"
                          style={{ borderColor: cert.trail.color + "40" }}
                        >
                          <div
                            className="absolute inset-0 opacity-5 rounded-xl"
                            style={{ background: cert.trail.color }}
                          />
                          <div className="relative flex items-start gap-3">
                            <div
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                              style={{ background: cert.trail.color }}
                            >
                              <Award className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate group-hover:text-[#0176D3]">
                                {cert.trail.title}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                Выдан {new Date(cert.issuedAt).toLocaleDateString("ru-RU")}
                              </p>
                              <p className="text-xs text-gray-400 font-mono mt-1">
                                #{cert.uniqueCode}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#0176D3] transition-colors" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Award className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Сертификаты пока не получены</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-orange-500" />
                  Достижения
                  <Badge variant="secondary" className="ml-auto">
                    {profile.achievements.count} / {profile.achievements.total}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {profile.achievements.all.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`relative p-3 rounded-xl text-center transition-all ${
                        achievement.earned
                          ? `border-2 ${getRarityBorder(achievement.rarity)} bg-white hover:shadow-md`
                          : "opacity-40 grayscale bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div className="text-2xl mb-1">{achievement.icon}</div>
                      <h4 className="font-medium text-xs text-gray-900 mb-0.5 truncate">
                        {achievement.name}
                      </h4>
                      <Badge
                        className={`text-[9px] ${
                          achievement.earned ? achievement.color : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {getRarityLabel(achievement.rarity)}
                      </Badge>
                      {!achievement.earned && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl">
                          <Lock className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Trails */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#0176D3]" />
                  Trails
                  <Badge variant="secondary" className="ml-auto">
                    {profile.trails.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.trails.length > 0 ? (
                  <div className="space-y-4">
                    {profile.trails.map((trail) => (
                      <Link
                        key={trail.id}
                        href={`/trails/${trail.slug}`}
                        className="block group"
                      >
                        <div className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                              style={{ background: trail.color }}
                            >
                              <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate group-hover:text-[#0176D3]">
                                {trail.title}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {trail.completedModules} из {trail.totalModules} модулей
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Прогресс</span>
                              <span className="font-medium" style={{ color: trail.color }}>
                                {trail.progress}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${trail.progress}%`,
                                  background: trail.color,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <BookOpen className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Нет записей на trails</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links for own profile */}
            {isOwnProfile && (
              <Card className="bg-blue-50 border-blue-100">
                <CardContent className="p-4">
                  <p className="text-sm text-blue-700 mb-3">
                    Это ваш публичный профиль
                  </p>
                  <div className="space-y-2">
                    <Link
                      href="/profile"
                      className="flex items-center justify-between p-2 bg-white rounded-lg text-sm hover:bg-blue-100 transition-colors"
                    >
                      <span>Редактировать профиль</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/dashboard"
                      className="flex items-center justify-between p-2 bg-white rounded-lg text-sm hover:bg-blue-100 transition-colors"
                    >
                      <span>Мой дашборд</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
