import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ACHIEVEMENTS } from "@/lib/achievements"

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params

    // Get student with public info
    const student = await prisma.user.findUnique({
      where: { id, role: "STUDENT" },
      select: {
        id: true,
        name: true,
        totalXP: true,
        createdAt: true,
        avatarUrl: true,
        _count: {
          select: {
            moduleProgress: { where: { status: "COMPLETED" } },
            submissions: true,
            certificates: true,
            enrollments: true,
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Get leaderboard position
    const higherRanked = await prisma.user.count({
      where: {
        role: "STUDENT",
        totalXP: { gt: student.totalXP },
      },
    })
    const leaderboardRank = higherRanked + 1

    // Get total students for context
    const totalStudents = await prisma.user.count({
      where: { role: "STUDENT" },
    })

    // Get submissions stats
    const submissions = await prisma.submission.groupBy({
      by: ["status"],
      where: { userId: id },
      _count: true,
    })

    const submissionStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
    }
    submissions.forEach((s) => {
      if (s.status === "PENDING") submissionStats.pending = s._count
      if (s.status === "APPROVED") submissionStats.approved = s._count
      if (s.status === "REJECTED") submissionStats.rejected = s._count
    })

    // Get certificates
    const certificates = await prisma.certificate.findMany({
      where: { userId: id },
      include: {
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
    })

    // Get achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: id },
      orderBy: { earnedAt: "desc" },
    })

    const achievements = Object.values(ACHIEVEMENTS).map((def) => {
      const userAch = userAchievements.find((ua) => ua.achievementId === def.id)
      return {
        ...def,
        earned: !!userAch,
        earnedAt: userAch?.earnedAt.toISOString() || null,
      }
    })

    // Get enrolled trails with progress
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: id },
      include: {
        trail: {
          include: {
            modules: {
              select: { id: true },
            },
          },
        },
      },
    })

    const moduleProgress = await prisma.moduleProgress.findMany({
      where: { userId: id, status: "COMPLETED" },
      select: { moduleId: true },
    })
    const completedModuleIds = new Set(moduleProgress.map((p) => p.moduleId))

    const trails = enrollments.map((enrollment) => {
      const moduleIds = enrollment.trail.modules.map((m) => m.id)
      const completedCount = moduleIds.filter((id) => completedModuleIds.has(id)).length
      const progress = moduleIds.length > 0
        ? Math.round((completedCount / moduleIds.length) * 100)
        : 0

      return {
        id: enrollment.trail.id,
        slug: enrollment.trail.slug,
        title: enrollment.trail.title,
        color: enrollment.trail.color,
        icon: enrollment.trail.icon,
        totalModules: moduleIds.length,
        completedModules: completedCount,
        progress,
      }
    })

    return NextResponse.json({
      id: student.id,
      name: student.name,
      avatarUrl: student.avatarUrl,
      totalXP: student.totalXP,
      createdAt: student.createdAt.toISOString(),
      leaderboardRank,
      totalStudents,
      stats: {
        modulesCompleted: student._count.moduleProgress,
        submissions: student._count.submissions,
        certificatesCount: student._count.certificates,
        enrolledTrails: student._count.enrollments,
      },
      submissionStats,
      certificates,
      achievements: {
        all: achievements,
        count: userAchievements.length,
        total: Object.keys(ACHIEVEMENTS).length,
      },
      trails,
    })
  } catch (error) {
    console.error("Public student profile error:", error)
    return NextResponse.json({ error: "Failed to fetch student profile" }, { status: 500 })
  }
}
