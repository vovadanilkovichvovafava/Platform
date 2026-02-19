import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyExternalAuth } from "@/lib/external-auth"

export async function GET(request: Request) {
  const authError = verifyExternalAuth(request)
  if (authError) return authError

  try {
    const now = new Date()

    // Fetch all students with their progress data
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        totalXP: true,
        currentStreak: true,
        createdAt: true,
        activityDays: {
          orderBy: { date: "desc" as const },
          take: 1,
          select: { date: true },
        },
        enrollments: {
          select: {
            createdAt: true,
            trail: {
              select: {
                id: true,
                title: true,
                modules: {
                  select: { id: true },
                },
              },
            },
          },
        },
        moduleProgress: {
          where: { status: "COMPLETED" },
          select: { moduleId: true },
        },
        submissions: {
          select: {
            moduleId: true,
            status: true,
            review: {
              select: { score: true },
            },
          },
        },
        certificates: {
          select: {
            trailId: true,
            level: true,
            issuedAt: true,
          },
        },
        trailStatuses: {
          select: {
            trailId: true,
            status: true,
          },
        },
      },
    })

    const completedModuleIds = new Set<string>()

    const interns = students.map((student) => {
      // Last activity
      const lastActivityDate = student.activityDays[0]?.date ?? null
      const daysSinceActive = lastActivityDate
        ? Math.floor(
            (now.getTime() - new Date(lastActivityDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : Math.floor(
            (now.getTime() - new Date(student.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )

      // Build a set of completed module IDs for this student
      completedModuleIds.clear()
      for (const mp of student.moduleProgress) {
        completedModuleIds.add(mp.moduleId)
      }

      // Build trail-level status map
      const trailStatusMap = new Map<string, string>()
      for (const ts of student.trailStatuses) {
        trailStatusMap.set(ts.trailId, ts.status)
      }

      // Build certificate map
      const certMap = new Map<
        string,
        { level: string; issuedAt: string }
      >()
      for (const cert of student.certificates) {
        certMap.set(cert.trailId, {
          level: cert.level,
          issuedAt: cert.issuedAt.toISOString(),
        })
      }

      // Per-trail progress
      const trails = student.enrollments.map((enrollment) => {
        const trail = enrollment.trail
        const moduleIds = trail.modules.map((m) => m.id)
        const totalModules = moduleIds.length
        const modulesCompleted = moduleIds.filter((id) =>
          completedModuleIds.has(id)
        ).length

        // Submissions stats for this trail
        const trailSubmissions = student.submissions.filter((s) =>
          moduleIds.includes(s.moduleId)
        )
        let approved = 0
        let pending = 0
        let revision = 0
        const scores: number[] = []

        for (const sub of trailSubmissions) {
          if (sub.status === "APPROVED") approved++
          else if (sub.status === "PENDING") pending++
          else if (sub.status === "REVISION") revision++

          if (sub.review) {
            scores.push(sub.review.score)
          }
        }

        const avgScore =
          scores.length > 0
            ? Math.round(
                (scores.reduce((a, b) => a + b, 0) / scores.length) * 10
              ) / 10
            : null

        const certificate = certMap.get(trail.id) ?? null

        return {
          trailId: trail.id,
          trailTitle: trail.title,
          enrolledAt: enrollment.createdAt.toISOString(),
          totalModules,
          modulesCompleted,
          completionPercent:
            totalModules > 0
              ? Math.round((modulesCompleted / totalModules) * 100)
              : 0,
          submissions: {
            approved,
            pending,
            revision,
            total: approved + pending + revision,
          },
          avgScore,
          trailStatus: trailStatusMap.get(trail.id) ?? "LEARNING",
          certificate,
        }
      })

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        totalXP: student.totalXP,
        currentStreak: student.currentStreak,
        registeredAt: student.createdAt.toISOString(),
        lastActiveAt: lastActivityDate
          ? lastActivityDate.toISOString()
          : null,
        daysSinceActive,
        trails,
      }
    })

    return NextResponse.json({ interns })
  } catch (error) {
    console.error("External interns API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
