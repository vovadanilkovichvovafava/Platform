import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ACHIEVEMENTS } from "@/lib/achievements"
import { getLevelInfo, getRankInfo, formatXP } from "@/lib/levels"
import { pluralizeRu } from "@/lib/utils"

export const dynamic = "force-dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrailCard } from "@/components/trail-card"
import { AchievementsGrid } from "@/components/achievements-grid"
import { SubmissionsChart } from "@/components/submissions-chart"
import { CertificatesShowcase } from "@/components/certificates-showcase"
import {
  Star,
  Trophy,
  BookOpen,
  Clock,
  Medal,
  GraduationCap,
  Compass,
  TrendingUp,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

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
        orderBy: { createdAt: "desc" },
        include: {
          module: {
            select: { title: true },
          },
        },
      },
      certificates: {
        select: {
          id: true,
          code: true,
          issuedAt: true,
          totalXP: true,
          level: true,
          trail: {
            select: {
              title: true,
              slug: true,
              color: true,
              icon: true,
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

  // Используем единый модуль уровней/рангов
  const levelInfo = getLevelInfo(user.totalXP)
  const rankInfo = getRankInfo(user.totalXP)

  // Get leaderboard position
  const higherRanked = await prisma.user.count({
    where: {
      role: "STUDENT",
      totalXP: { gt: user.totalXP },
    },
  })
  const leaderboardRank = higherRanked + 1

  // Get user achievements
  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId: session.user.id },
    orderBy: { earnedAt: "desc" },
  })

  const allAchievements = Object.values(ACHIEVEMENTS).map((def) => {
    const userAch = userAchievements.find((ua: { achievementId: string }) => ua.achievementId === def.id)
    return {
      ...def,
      earned: !!userAch,
      earnedAt: userAch?.earnedAt.toISOString() || null,
    }
  })

  const achievementStats = {
    count: userAchievements.length,
    total: Object.keys(ACHIEVEMENTS).length,
  }

  // Calculate submissions stats
  const pendingSubmissions = user.submissions.filter((s: { status: string }) => s.status === "PENDING")

  // Get moduleIds that have approved submissions
  const approvedModuleIds = new Set(
    user.submissions
      .filter((s: { status: string; moduleId: string }) => s.status === "APPROVED")
      .map((s: { moduleId: string }) => s.moduleId)
  )

  // Count revision only for modules that don't have an approved submission
  const actualRevisionCount = user.submissions.filter(
    (s: { status: string; moduleId: string }) =>
      s.status === "REVISION" && !approvedModuleIds.has(s.moduleId)
  ).length

  const approvedCount = user.submissions.filter((s: { status: string }) => s.status === "APPROVED").length
  const pendingCount = pendingSubmissions.length
  const failedCount = user.submissions.filter((s: { status: string }) => s.status === "FAILED").length

  const submissionStats = {
    approved: approvedCount,
    pending: pendingCount,
    revision: actualRevisionCount,
    failed: failedCount,
    total: approvedCount + pendingCount + actualRevisionCount + failedCount,
  }

  // Get user's trail access
  const userAccess = await prisma.studentTrailAccess.findMany({
    where: { studentId: session.user.id },
    select: { trailId: true },
  })
  const accessibleTrailIds = userAccess.map((a) => a.trailId)

  const isPrivileged = user.role === "ADMIN" || user.role === "TEACHER" || user.role === "CO_ADMIN"

  // Build query to include:
  // 1. All published trails
  // 2. Unpublished trails that user has explicit access to
  const whereClause = accessibleTrailIds.length > 0
    ? {
        OR: [
          { isPublished: true },
          { id: { in: accessibleTrailIds } },
        ],
      }
    : { isPublished: true }

  const allPublishedTrails = await prisma.trail.findMany({
    where: whereClause,
    orderBy: { order: "asc" },
    include: {
      modules: {
        select: { id: true },
      },
    },
  })

  // Filter out restricted trails user doesn't have access to
  const allTrails = allPublishedTrails.filter((trail) => {
    // If user has explicit access, always show (even if unpublished or restricted)
    if (accessibleTrailIds.includes(trail.id)) return true
    // For unpublished trails without explicit access - hide
    if (!trail.isPublished) return false
    // Public trail (not restricted)
    if (!trail.isRestricted) return true
    // Admin/Teacher/CO_ADMIN can see all published trails
    if (isPrivileged) return true
    return false
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Mountains */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <svg
            className="absolute bottom-0 left-0 w-full"
            viewBox="0 0 1440 200"
            fill="none"
            preserveAspectRatio="xMidYMax slice"
          >
            <path
              d="M0 200L200 140L400 180L600 120L800 160L1000 100L1200 150L1440 80V200H0Z"
              fill="#E0ECFF"
              fillOpacity="0.5"
            />
            <path
              d="M0 200L150 160L350 190L550 150L750 180L950 130L1150 170L1350 140L1440 160V200H0Z"
              fill="#C5D9E8"
              fillOpacity="0.6"
            />
          </svg>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Profile Card */}
            <Card className="w-full md:w-80 shrink-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-[#0176D3] text-white text-xl">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold text-lg">{user.name}</h2>
                    <div className="flex items-center gap-2">
                      <Badge className={`${levelInfo.current.bgColor} ${levelInfo.current.color} border-0`}>
                        {levelInfo.current.icon} {levelInfo.current.name}
                      </Badge>
                      <span className="text-xs text-gray-400">Ур. {levelInfo.current.level}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm font-medium">Total XP</span>
                    </div>
                    <span className="font-bold text-lg">{user.totalXP}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium">Модулей пройдено</span>
                    </div>
                    <span className="font-bold text-lg">
                      {user.moduleProgress.length}
                    </span>
                  </div>

                  <Link
                    href="/leaderboard"
                    className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Medal className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium">Место в рейтинге</span>
                    </div>
                    <span className="font-bold text-lg text-blue-600">
                      #{leaderboardRank}
                    </span>
                  </Link>
                </div>

                {/* Progress to next level */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {levelInfo.isMaxLevel
                          ? "Максимальный уровень!"
                          : `До ${levelInfo.next?.name}`}
                      </span>
                    </div>
                    {levelInfo.isMaxLevel && (
                      <Sparkles className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <Progress
                    value={levelInfo.progressPercent}
                    className="h-2"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">{levelInfo.current.name}</span>
                    {!levelInfo.isMaxLevel && levelInfo.next && (
                      <span className="text-xs text-purple-600 font-medium">
                        ещё {levelInfo.xpToNext} XP
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Info Section */}
            <div className="flex-1 space-y-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Добро пожаловать, {user.name.split(" ")[0]}!
                </h1>
                <p className="text-gray-600">
                  Продолжайте обучение и развивайте свои навыки
                </p>
              </div>

              {pendingSubmissions.length > 0 && (
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-orange-700 mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">На проверке ({pendingSubmissions.length})</span>
                    </div>
                    <div className="space-y-2">
                      {pendingSubmissions.slice(0, 5).map((sub: { id: string; module: { title: string } }) => (
                        <div
                          key={sub.id}
                          className="text-sm text-orange-600"
                        >
                          {sub.module.title}
                        </div>
                      ))}
                      {pendingSubmissions.length > 5 && (
                        <div className="text-xs text-orange-500">
                          и ещё {pendingSubmissions.length - 5}...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submissions Stats */}
              <SubmissionsChart stats={submissionStats} showTitle={true} />

              {/* Certificates */}
              {user.certificates.length > 0 ? (
                <CertificatesShowcase
                  certificates={user.certificates}
                  showTitle={true}
                  compact={true}
                  linkToFullPage={true}
                />
              ) : (
                <Card>
                  <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center">
                    <GraduationCap className="h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-1">Сертификаты</h3>
                    <p className="text-sm text-gray-500">
                      Завершите trail, чтобы получить сертификат
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Achievements Section */}
        <section className="mb-12">
          <AchievementsGrid
            achievements={allAchievements}
            stats={achievementStats}
            showTitle={true}
            compact={false}
            collapsible={true}
            defaultExpanded={true}
          />
        </section>

        {/* Enrolled Trails */}
        {enrolledTrails.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Мои trails
                  </h2>
                  <p className="text-sm text-gray-500">
                    {enrolledTrails.length} {pluralizeRu(enrolledTrails.length, ["активный курс", "активных курса", "активных курсов"])}
                  </p>
                </div>
              </div>
              <Link
                href="/trails"
                className="text-sm text-[#0176D3] hover:underline"
              >
                Смотреть все
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                <Compass className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Доступные trails
                </h2>
                <p className="text-sm text-gray-500">
                  {availableTrails.length} {pluralizeRu(availableTrails.length, ["курс", "курса", "курсов"])} для изучения
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {availableTrails.map((trail) => (
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
    </div>
  )
}
