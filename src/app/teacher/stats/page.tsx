import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TeacherStats } from "@/components/teacher-stats"

export const dynamic = "force-dynamic"

export default async function TeacherStatsPage() {
  const session = await getServerSession(authOptions)

  // Allow both TEACHER and ADMIN roles
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    redirect("/dashboard")
  }

  // Get all submissions with related data
  const submissions = await prisma.submission.findMany({
    include: {
      module: {
        include: {
          trail: {
            select: { id: true, title: true, color: true },
          },
        },
      },
      user: {
        select: { id: true, name: true },
      },
      review: {
        select: { score: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Get total students count
  const totalStudents = await prisma.user.count({
    where: { role: "STUDENT" },
  })

  // Get completed modules count
  const completedModules = await prisma.moduleProgress.count({
    where: { status: "COMPLETED" },
  })

  // Get top students by XP
  const topStudents = await prisma.user.findMany({
    where: { role: "STUDENT", totalXP: { gt: 0 } },
    orderBy: { totalXP: "desc" },
    take: 9,
    select: {
      id: true,
      name: true,
      totalXP: true,
      _count: {
        select: { submissions: true },
      },
    },
  })

  // Transform data for the component
  const formattedSubmissions = []
  for (const sub of submissions) {
    formattedSubmissions.push({
      id: sub.id,
      status: sub.status,
      createdAt: sub.createdAt.toISOString(),
      module: {
        id: sub.moduleId,
        title: sub.module.title,
        trail: {
          id: sub.module.trail.id,
          title: sub.module.trail.title,
          color: sub.module.trail.color,
        },
      },
      user: {
        id: sub.user.id,
        name: sub.user.name,
      },
      review: sub.review
        ? {
            score: sub.review.score,
            createdAt: sub.review.createdAt.toISOString(),
          }
        : null,
    })
  }

  const formattedTopStudents = []
  for (const s of topStudents) {
    formattedTopStudents.push({
      id: s.id,
      name: s.name,
      totalXP: s.totalXP,
      submissionsCount: s._count.submissions,
    })
  }

  return (
    <div className="p-8">
      <TeacherStats
        submissions={formattedSubmissions}
        topStudents={formattedTopStudents}
        totalStudents={totalStudents}
        completedModules={completedModules}
      />
    </div>
  )
}
