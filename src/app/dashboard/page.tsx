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
  Star,
  Trophy,
  BookOpen,
  Clock,
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

  // Get user's trail access
  const userAccess = await prisma.studentTrailAccess.findMany({
    where: { studentId: session.user.id },
    select: { trailId: true },
  })
  const accessibleTrailIds = userAccess.map((a) => a.trailId)

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
  const allTrails = allPublishedTrails.filter((trail) => {
    if (!trail.isRestricted) return true // Public trail
    if (isPrivileged) return true // Admin/Teacher can see all
    return accessibleTrailIds.includes(trail.id) // Check access
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
                    <Badge className={`${rank.bg} ${rank.color} border-0`}>
                      {rank.name}
                    </Badge>
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
                </div>
              </CardContent>
            </Card>

            {/* Welcome Message */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Добро пожаловать, {user.name.split(" ")[0]}!
              </h1>
              <p className="text-gray-600 mb-6">
                Продолжайте обучение и развивайте свои навыки
              </p>

              {user.submissions.length > 0 && (
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-orange-700 mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">На проверке</span>
                    </div>
                    <div className="space-y-2">
                      {user.submissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="text-sm text-orange-600"
                        >
                          {sub.module.title}
                        </div>
                      ))}
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
              <h2 className="text-xl font-bold text-gray-900">
                Мои trails
              </h2>
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Доступные trails
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
