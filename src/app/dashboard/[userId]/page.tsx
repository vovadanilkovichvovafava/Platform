import { getServerSession } from "next-auth"
import { notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ACHIEVEMENTS, getAchievement } from "@/lib/achievements"

export const dynamic = "force-dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { AchievementsGrid } from "@/components/achievements-grid"
import { CertificatesShowcase } from "@/components/certificates-showcase"
import { SubmissionsChart } from "@/components/submissions-chart"
import {
  Star,
  Trophy,
  Medal,
  Award,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"

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

interface PageProps {
  params: Promise<{ userId: string }>
}

export default async function PublicDashboardPage({ params }: PageProps) {
  const { userId } = await params
  const session = await getServerSession(authOptions)
  const isOwnProfile = session?.user?.id === userId

  // Get user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      totalXP: true,
      createdAt: true,
      moduleProgress: {
        where: { status: "COMPLETED" },
        select: { id: true },
      },
      submissions: {
        select: {
          id: true,
          status: true,
          moduleId: true,
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
    notFound()
  }

  const rank = getRank(user.totalXP)

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
    where: { userId },
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

  const earnedAchievements = allAchievements.filter((a) => a.earned)

  const achievementStats = {
    count: earnedAchievements.length,
    total: Object.keys(ACHIEVEMENTS).length,
  }

  // Calculate submissions stats with corrected revision logic
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

  const submissionStats = {
    approved: user.submissions.filter((s: { status: string }) => s.status === "APPROVED").length,
    pending: user.submissions.filter((s: { status: string }) => s.status === "PENDING").length,
    revision: actualRevisionCount,
    failed: user.submissions.filter((s: { status: string }) => s.status === "FAILED").length,
    total: user.submissions.length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
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
          {/* Back link */}
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            К рейтингу
          </Link>

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
                    <Badge className={`${rank.bg} ${rank.color} border-0`}>
                      {rank.name}
                    </Badge>
                    {isOwnProfile && (
                      <Badge variant="outline" className="ml-2">
                        Это вы
                      </Badge>
                    )}
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

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Medal className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium">Место в рейтинге</span>
                    </div>
                    <span className="font-bold text-lg text-blue-600">
                      #{leaderboardRank}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-orange-500" />
                      <span className="text-sm font-medium">Достижений</span>
                    </div>
                    <span className="font-bold text-lg text-orange-600">
                      {achievementStats.count}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-6 text-center">
                  На платформе с{" "}
                  {new Date(user.createdAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </CardContent>
            </Card>

            {/* Info Section */}
            <div className="flex-1 space-y-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Профиль {user.name}
                </h1>
                <p className="text-gray-600">
                  Достижения и статистика
                </p>
              </div>

              {/* Submissions Stats */}
              <SubmissionsChart stats={submissionStats} showTitle={true} />

              {/* Certificates */}
              {user.certificates.length > 0 && (
                <CertificatesShowcase
                  certificates={user.certificates}
                  showTitle={true}
                  compact={true}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Achievements Section */}
        {earnedAchievements.length > 0 ? (
          <section>
            <AchievementsGrid
              achievements={earnedAchievements}
              stats={achievementStats}
              showTitle={true}
              compact={false}
            />
          </section>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Award className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Пользователь ещё не получил достижений</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
