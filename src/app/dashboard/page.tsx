import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { TrailCard } from "@/components/trail-card"
import {
  Flame,
  Star,
  Trophy,
  BookOpen,
  Clock,
  Rocket,
  Zap,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

function getRank(xp: number) {
  if (xp >= 1000) return { name: "Titan", icon: "🪐", color: "text-purple-400", bg: "bg-purple-500/20" }
  if (xp >= 500) return { name: "Космонавт", icon: "🚀", color: "text-blue-400", bg: "bg-blue-500/20" }
  if (xp >= 200) return { name: "Исследователь", icon: "🌟", color: "text-amber-400", bg: "bg-amber-500/20" }
  return { name: "Новичок", icon: "✨", color: "text-slate-400", bg: "bg-slate-500/20" }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
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
        where: { status: "PENDING" },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          module: {
            select: { title: true },
          },
        },
      },
    },
  })

  if (!user) {
    redirect("/login")
  }

  const rank = getRank(user.totalXP)

  // Get all trails for enrollment
  const allTrails = await prisma.trail.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      modules: {
        select: { id: true },
      },
    },
  })

  // Calculate progress for enrolled trails
  const enrolledTrailIds = user.enrollments.map((e) => e.trailId)
  const trailsWithProgress = allTrails.map((trail) => {
    const enrolled = enrolledTrailIds.includes(trail.id)
    const moduleIds = trail.modules.map((m) => m.id)
    const completedCount = user.moduleProgress.filter((p) =>
      moduleIds.includes(p.moduleId)
    ).length
    const progress =
      trail.modules.length > 0
        ? Math.round((completedCount / trail.modules.length) * 100)
        : 0

    return { ...trail, enrolled, progress }
  })

  const enrolledTrails = trailsWithProgress.filter((t) => t.enrolled)
  const availableTrails = trailsWithProgress.filter((t) => !t.enrolled)

  // Calculate next rank progress
  const nextRankXP = user.totalXP < 200 ? 200 : user.totalXP < 500 ? 500 : user.totalXP < 1000 ? 1000 : 2000
  const prevRankXP = user.totalXP < 200 ? 0 : user.totalXP < 500 ? 200 : user.totalXP < 1000 ? 500 : 1000
  const rankProgress = Math.round(((user.totalXP - prevRankXP) / (nextRankXP - prevRankXP)) * 100)

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Space Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated stars background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950" />
          {/* Stars */}
          <div className="absolute top-10 left-[10%] w-1 h-1 bg-white rounded-full animate-pulse" />
          <div className="absolute top-20 left-[25%] w-1.5 h-1.5 bg-yellow-200 rounded-full animate-pulse delay-100" />
          <div className="absolute top-16 left-[45%] w-1 h-1 bg-white rounded-full animate-pulse delay-200" />
          <div className="absolute top-8 left-[60%] w-2 h-2 bg-orange-300 rounded-full animate-pulse delay-300" />
          <div className="absolute top-24 left-[75%] w-1 h-1 bg-white rounded-full animate-pulse" />
          <div className="absolute top-12 left-[85%] w-1.5 h-1.5 bg-amber-200 rounded-full animate-pulse delay-150" />
          <div className="absolute top-28 left-[15%] w-1 h-1 bg-white rounded-full animate-pulse delay-75" />
          <div className="absolute top-6 left-[35%] w-1 h-1 bg-orange-200 rounded-full animate-pulse delay-250" />
          <div className="absolute top-32 left-[55%] w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <div className="absolute top-4 left-[90%] w-1 h-1 bg-yellow-100 rounded-full animate-pulse delay-200" />
          {/* Nebula glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-10 relative z-10">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Profile Card - Saturn inspired */}
            <Card className="w-full lg:w-96 shrink-0 bg-slate-900/80 backdrop-blur-sm border-slate-800">
              <CardContent className="p-6">
                {/* Profile header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <Avatar className="h-20 w-20 ring-4 ring-orange-500/30">
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-600 text-white text-2xl font-bold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    {/* Orbital ring */}
                    <div className="absolute -inset-2 border border-orange-500/20 rounded-full" />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl text-white">{user.name}</h2>
                    <Badge className={`${rank.bg} ${rank.color} border-0 mt-1`}>
                      <span className="mr-1">{rank.icon}</span>
                      {rank.name}
                    </Badge>
                  </div>
                </div>

                {/* XP Progress to next rank */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">До следующего ранга</span>
                    <span className="text-orange-400 font-medium">{user.totalXP} / {nextRankXP} XP</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all"
                      style={{ width: `${Math.min(rankProgress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gradient-to-br from-orange-500/20 to-amber-500/10 rounded-xl border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-orange-400" />
                      <span className="text-xs text-slate-400">Энергия XP</span>
                    </div>
                    <span className="text-2xl font-bold text-white">{user.totalXP}</span>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-red-500/20 to-orange-500/10 rounded-xl border border-red-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Flame className="h-4 w-4 text-red-400" />
                      <span className="text-xs text-slate-400">Streak</span>
                    </div>
                    <span className="text-2xl font-bold text-white">{user.currentStreak}</span>
                    <span className="text-sm text-slate-500 ml-1">дн.</span>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-emerald-500/20 to-green-500/10 rounded-xl border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs text-slate-400">Модули</span>
                    </div>
                    <span className="text-2xl font-bold text-white">{user.moduleProgress.length}</span>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-purple-500/20 to-violet-500/10 rounded-xl border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Rocket className="h-4 w-4 text-purple-400" />
                      <span className="text-xs text-slate-400">Trails</span>
                    </div>
                    <span className="text-2xl font-bold text-white">{enrolledTrails.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Welcome Section */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-6 w-6 text-orange-400" />
                <span className="text-orange-400 font-medium">Космическая Академия</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Привет, {user.name.split(" ")[0]}!
              </h1>
              <p className="text-slate-400 text-lg mb-6 max-w-xl">
                Продолжай своё путешествие к звёздам. Каждый пройденный модуль приближает тебя к мастерству.
              </p>

              {/* Mission status */}
              {user.submissions.length > 0 && (
                <Card className="bg-orange-500/10 border-orange-500/30 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-orange-400 mb-3">
                      <Clock className="h-5 w-5" />
                      <span className="font-semibold">Миссии на проверке</span>
                    </div>
                    <div className="space-y-2">
                      {user.submissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-2 text-slate-300"
                        >
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                          <span>{sub.module.title}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick actions */}
              {enrolledTrails.length === 0 && (
                <Card className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500/30 backdrop-blur-sm mt-4">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-500/20 rounded-xl">
                        <Rocket className="h-8 w-8 text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">Начни своё путешествие!</h3>
                        <p className="text-slate-400 text-sm">Выбери направление и отправляйся к звёздам</p>
                      </div>
                      <Link
                        href="/trails"
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                      >
                        Выбрать Trail
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Enrolled Trails */}
        {enrolledTrails.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Star className="h-5 w-5 text-orange-400" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  Мои миссии
                </h2>
              </div>
              <Link
                href="/trails"
                className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
              >
                Все направления →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {enrolledTrails.map((trail) => (
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
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Rocket className="h-5 w-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-white">
                Доступные направления
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {availableTrails.map((trail) => (
                <TrailCard key={trail.id} trail={trail} />
              ))}
            </div>
          </section>
        )}

        {enrolledTrails.length === 0 && availableTrails.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex p-4 bg-slate-800 rounded-full mb-4">
              <BookOpen className="h-12 w-12 text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Trails пока не добавлены
            </h3>
            <p className="text-slate-400">
              Скоро здесь появятся космические миссии для обучения
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
