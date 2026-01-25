import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ACHIEVEMENTS } from "@/lib/achievements"

export const dynamic = "force-dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { TrailCard } from "@/components/trail-card"
import {
  Star,
  Trophy,
  BookOpen,
  Clock,
  Medal,
  Award,
  Lock,
  CheckCircle,
  XCircle,
  FileText,
  ArrowRight,
  ExternalLink,
} from "lucide-react"

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

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.id) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      enrollments: {
        include: {
          trail: {
            include: {
              modules: {
                select: { id: true },
              },
            },
          },
        },
      },
      moduleProgress: {
        where: { status: "COMPLETED" },
      },
      submissions: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          module: {
            select: { title: true },
          },
        },
      },
      certificates: {
        include: {
          trail: {
            select: {
              title: true,
              slug: true,
              color: true,
            },
          },
        },
        orderBy: { issuedAt: "desc" },
      },
    },
  })

  if (!user) {
    redirect("/login")
  }

  // Get leaderboard position
  const higherRanked = await prisma.user.count({
    where: {
      role: "STUDENT",
      totalXP: { gt: user.totalXP },
    },
  })
  const leaderboardRank = higherRanked + 1

  const totalStudents = await prisma.user.count({
    where: { role: "STUDENT" },
  })

  // Get submissions stats
  const submissionStats = await prisma.submission.groupBy({
    by: ["status"],
    where: { userId: session.user.id },
    _count: true,
  })

  const stats = {
    pending: 0,
    approved: 0,
    rejected: 0,
  }
  submissionStats.forEach((s: { status: string; _count: number }) => {
    if (s.status === "PENDING") stats.pending = s._count
    if (s.status === "APPROVED") stats.approved = s._count
    if (s.status === "REJECTED") stats.rejected = s._count
  })
  const totalSubmissions = stats.approved + stats.rejected + stats.pending
  const successRate = totalSubmissions > 0
    ? Math.round((stats.approved / totalSubmissions) * 100)
    : 0

  // Get achievements
  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId: session.user.id },
    orderBy: { earnedAt: "desc" },
  })

  const achievements = Object.values(ACHIEVEMENTS).map((def) => {
    const userAch = userAchievements.find((ua: { achievementId: string }) => ua.achievementId === def.id)
    return {
      ...def,
      earned: !!userAch,
      earnedAt: userAch?.earnedAt.toISOString() || null,
    }
  })

  const achievementCount = userAchievements.length
  const achievementTotal = Object.keys(ACHIEVEMENTS).length

  const rank = getRank(user.totalXP)

  // Get user's trail access
  const userAccess = await prisma.studentTrailAccess.findMany({
    where: { studentId: session.user.id },
    select: { trailId: true },
  })
  const accessibleTrailIds = userAccess.map((a: { trailId: string }) => a.trailId)

  // Get all published trails
  const allPublishedTrails = await prisma.trail.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      modules: {
        select: { id: true },
      },
    },
  })

  // Filter out restricted trails user doesn't have access to
  const isPrivileged = user.role === "ADMIN" || user.role === "TEACHER"
  const allTrails = allPublishedTrails.filter((trail: typeof allPublishedTrails[number]) => {
    if (!trail.isRestricted) return true
    if (isPrivileged) return true
    return accessibleTrailIds.includes(trail.id)
  })

  // Calculate progress for enrolled trails
  const enrolledTrailIds = user.enrollments.map((e: { trailId: string }) => e.trailId)
  const trailsWithProgress = allTrails.map((trail: typeof allTrails[number]) => {
    const enrolled = enrolledTrailIds.includes(trail.id)
    const moduleIds = trail.modules.map((m: { id: string }) => m.id)
    const completedCount = user.moduleProgress.filter((p: { moduleId: string }) =>
      moduleIds.includes(p.moduleId)
    ).length
    const progress =
      trail.modules.length > 0
        ? Math.round((completedCount / trail.modules.length) * 100)
        : 0

    return { ...trail, enrolled, progress }
  })

  const enrolledTrails = trailsWithProgress.filter((t: { enrolled: boolean }) => t.enrolled)
  const availableTrails = trailsWithProgress.filter((t: { enrolled: boolean }) => !t.enrolled)

  // Pending submissions for notification
  const pendingSubmissions = user.submissions.filter((s: { status: string }) => s.status === "PENDING")

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-orange-50 py-8 border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Profile Card */}
            <div className="lg:w-80 shrink-0">
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                      <AvatarFallback className="bg-gradient-to-br from-[#0176D3] to-[#014486] text-white text-xl">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold text-lg">{user.name}</h2>
                      <Badge className={`${rank.bg} ${rank.color} border-0`}>
                        {rank.name}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-yellow-50 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
                        <Star className="h-4 w-4" />
                        <span className="text-lg font-bold">{user.totalXP}</span>
                      </div>
                      <p className="text-xs text-yellow-700">XP</p>
                    </div>

                    <Link href="/leaderboard" className="p-3 bg-blue-50 rounded-xl text-center hover:bg-blue-100 transition-colors">
                      <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                        <Medal className="h-4 w-4" />
                        <span className="text-lg font-bold">#{leaderboardRank}</span>
                      </div>
                      <p className="text-xs text-blue-700">в рейтинге</p>
                    </Link>

                    <div className="p-3 bg-green-50 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                        <Trophy className="h-4 w-4" />
                        <span className="text-lg font-bold">{user.moduleProgress.length}</span>
                      </div>
                      <p className="text-xs text-green-700">модулей</p>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                        <Award className="h-4 w-4" />
                        <span className="text-lg font-bold">{user.certificates.length}</span>
                      </div>
                      <p className="text-xs text-purple-700">сертификатов</p>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/${user.id}`}
                    className="mt-4 flex items-center justify-center gap-2 p-2 text-sm text-[#0176D3] hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Публичный профиль
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Welcome + Stats */}
            <div className="flex-1 space-y-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Добро пожаловать, {user.name.split(" ")[0]}!
                </h1>
                <p className="text-gray-600">
                  Продолжайте обучение и развивайте свои навыки
                </p>
              </div>

              {/* Pending Submissions Notification */}
              {pendingSubmissions.length > 0 && (
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-orange-700 mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">На проверке</span>
                    </div>
                    <div className="space-y-1">
                      {pendingSubmissions.map((sub: { id: string; module: { title: string } }) => (
                        <div key={sub.id} className="text-sm text-orange-600">
                          {sub.module.title}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submissions Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#0176D3]" />
                    Статистика работ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-green-50 rounded-xl">
                      <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                      <p className="text-xl font-bold text-green-700">{stats.approved}</p>
                      <p className="text-[10px] text-green-600">Принято</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-xl">
                      <Clock className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                      <p className="text-xl font-bold text-orange-700">{stats.pending}</p>
                      <p className="text-[10px] text-orange-600">На проверке</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-xl">
                      <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                      <p className="text-xl font-bold text-red-700">{stats.rejected}</p>
                      <p className="text-[10px] text-red-600">На доработку</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Успешность</span>
                      <span className="font-medium">{successRate}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                        style={{ width: `${successRate}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Trails */}
          <div className="lg:col-span-2 space-y-8">
            {/* Enrolled Trails */}
            {enrolledTrails.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[#0176D3]" />
                    Мои trails
                  </h2>
                  <Link
                    href="/trails"
                    className="text-sm text-[#0176D3] hover:underline flex items-center gap-1"
                  >
                    Смотреть все
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enrolledTrails.map((trail: typeof enrolledTrails[number]) => (
                    <TrailCard
                      key={trail.id}
                      trail={trail}
                      progress={trail.progress}
                      enrolled
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Available Trails */}
            {availableTrails.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-orange-500" />
                    Доступные trails
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableTrails.map((trail: typeof availableTrails[number]) => (
                    <TrailCard key={trail.id} trail={trail} />
                  ))}
                </div>
              </section>
            )}

            {enrolledTrails.length === 0 && availableTrails.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Trails пока не добавлены
                </h3>
                <p className="text-gray-600">
                  Скоро здесь появятся курсы для обучения
                </p>
              </div>
            )}
          </div>

          {/* Right column - Achievements & Certificates */}
          <div className="space-y-6">
            {/* Certificates */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Сертификаты
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {user.certificates.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.certificates.length > 0 ? (
                  <div className="space-y-3">
                    {user.certificates.slice(0, 3).map((cert: { id: string; uniqueCode: string; trail: { color: string; title: string }; issuedAt: Date; level: string }) => (
                      <Link
                        key={cert.id}
                        href={`/certificates/${cert.uniqueCode}`}
                        className="group block"
                      >
                        <div
                          className="p-3 rounded-xl border transition-all hover:shadow-md"
                          style={{ borderColor: cert.trail.color + "40" }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                              style={{ background: cert.trail.color }}
                            >
                              <Award className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-gray-900 truncate group-hover:text-[#0176D3]">
                                {cert.trail.title}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {new Date(cert.issuedAt).toLocaleDateString("ru-RU")}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#0176D3]" />
                          </div>
                        </div>
                      </Link>
                    ))}
                    {user.certificates.length > 3 && (
                      <Link
                        href={`/dashboard/${user.id}`}
                        className="block text-center text-sm text-[#0176D3] hover:underline"
                      >
                        Показать все ({user.certificates.length})
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Award className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Завершите trail для получения сертификата</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-orange-500" />
                  Достижения
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {achievementCount} / {achievementTotal}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {achievements.slice(0, 9).map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`relative p-2 rounded-lg text-center transition-all ${
                        achievement.earned
                          ? `border ${getRarityBorder(achievement.rarity)} bg-white`
                          : "opacity-40 grayscale bg-gray-50 border border-gray-200"
                      }`}
                      title={`${achievement.name}: ${achievement.description}`}
                    >
                      <div className="text-xl mb-0.5">{achievement.icon}</div>
                      <p className="text-[9px] text-gray-600 truncate">{achievement.name}</p>
                      {!achievement.earned && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
                          <Lock className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Link
                  href={`/dashboard/${user.id}`}
                  className="mt-3 flex items-center justify-center gap-1 text-sm text-[#0176D3] hover:underline"
                >
                  Все достижения
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Ваш прогресс</span>
                  <span className="text-xs text-gray-500">из {totalStudents} студентов</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Позиция в рейтинге</span>
                    <span className="font-bold text-[#0176D3]">#{leaderboardRank}</span>
                  </div>
                  <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0176D3] rounded-full"
                      style={{ width: `${Math.max(5, 100 - (leaderboardRank / totalStudents) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 text-center">
                    Вы опережаете {Math.round((1 - leaderboardRank / totalStudents) * 100)}% студентов
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
