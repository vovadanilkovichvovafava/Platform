import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrivileged, isHR, getPrivilegedAllowedTrailIds } from "@/lib/admin-access"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Allow privileged roles AND HR (read-only analytics)
  if (!isPrivileged(session.user.role) && !isHR(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    // Get assigned trails based on role (null = all for ADMIN)
    const allowedTrailIds = await getPrivilegedAllowedTrailIds(session.user.id, session.user.role)

    let trailIds: string[] = []

    if (allowedTrailIds === null) {
      // ADMIN - sees all trails
      const allTrails = await prisma.trail.findMany({ select: { id: true } })
      trailIds = allTrails.map(t => t.id)
    } else {
      trailIds = allowedTrailIds
    }

    if (trailIds.length === 0) {
      return NextResponse.json([])
    }

    // Get stats for each trail
    const trailStats = await Promise.all(
      trailIds.map(async (trailId) => {
        const trail = await prisma.trail.findUnique({
          where: { id: trailId },
          select: {
            id: true,
            title: true,
            slug: true,
            modules: {
              select: { id: true },
            },
            enrollments: {
              select: { id: true, userId: true },
            },
          },
        })

        if (!trail) return null

        const moduleIds = trail.modules.map(m => m.id)

        // Get submissions for this trail's modules
        const submissions = await prisma.submission.findMany({
          where: {
            moduleId: { in: moduleIds },
          },
          select: {
            status: true,
          },
        })

        // Get reviews with scores
        const reviews = await prisma.review.findMany({
          where: {
            submission: {
              moduleId: { in: moduleIds },
            },
          },
          select: {
            score: true,
          },
        })

        // Calculate completion rate
        const completedModules = await prisma.moduleProgress.count({
          where: {
            moduleId: { in: moduleIds },
            status: "COMPLETED",
          },
        })

        const totalPossibleCompletions = trail.enrollments.length * trail.modules.length
        const completionRate = totalPossibleCompletions > 0
          ? Math.round((completedModules / totalPossibleCompletions) * 100)
          : 0

        // Calculate avg score
        const scores = reviews.filter(r => r.score !== null).map(r => r.score!)
        const avgScore = scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null

        return {
          trailId: trail.id,
          trailTitle: trail.title,
          trailSlug: trail.slug,
          enrollments: trail.enrollments.length,
          submissions: {
            pending: submissions.filter(s => s.status === "PENDING").length,
            approved: submissions.filter(s => s.status === "APPROVED").length,
            revision: submissions.filter(s => s.status === "REVISION").length,
            total: submissions.length,
          },
          avgScore,
          completionRate,
          modulesCount: trail.modules.length,
        }
      })
    )

    return NextResponse.json(trailStats.filter(Boolean))
  } catch (error) {
    console.error("Error fetching teacher trail stats:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
