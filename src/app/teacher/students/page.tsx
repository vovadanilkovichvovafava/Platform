import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
import { Users } from "lucide-react"
import { StudentsSearch } from "@/components/students-search"

export default async function TeacherStudentsPage() {
  const session = await getServerSession(authOptions)

  // Allow both TEACHER and ADMIN roles
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    redirect("/dashboard")
  }

  // Get all students with their progress
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { totalXP: "desc" },
    include: {
      enrollments: {
        include: {
          trail: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      },
      moduleProgress: {
        where: { status: "COMPLETED" },
        select: { id: true },
      },
      submissions: {
        include: {
          module: {
            select: { title: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          submissions: true,
          activityDays: true,
        },
      },
    },
  })

  // Get all trails with their modules to calculate max XP
  const allTrails = await prisma.trail.findMany({
    include: {
      modules: {
        select: {
          points: true,
        },
      },
    },
  })

  // Calculate max XP per trail (sum of all module points)
  const maxXPByTrail: Record<string, number> = {}
  for (const trail of allTrails) {
    maxXPByTrail[trail.id] = trail.modules.reduce((sum: number, m: { points: number }) => sum + m.points, 0)
  }

  // Get submission stats per student
  const submissionStats = await prisma.submission.groupBy({
    by: ["userId", "status"],
    _count: true,
  })

  type SubmissionStat = { userId: string; status: string; _count: number }
  const getStudentStats = (userId: string) => {
    const stats = submissionStats.filter((s: SubmissionStat) => s.userId === userId)
    return {
      pending: stats.find((s: SubmissionStat) => s.status === "PENDING")?._count || 0,
      approved: stats.find((s: SubmissionStat) => s.status === "APPROVED")?._count || 0,
      revision: stats.find((s: SubmissionStat) => s.status === "REVISION")?._count || 0,
    }
  }

  // Get unique trail names for filter
  const trailNames = [...new Set(allTrails.map((t: typeof allTrails[number]) => t.title))].sort() as string[]

  // Serialize students data for client component
  const serializedStudents = students.map((student: typeof students[number]) => ({
    id: student.id,
    name: student.name,
    email: student.email,
    totalXP: student.totalXP,
    enrollments: student.enrollments,
    moduleProgress: student.moduleProgress,
    submissions: student.submissions.map((s: typeof student.submissions[number]) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    })),
    _count: student._count,
    stats: getStudentStats(student.id),
    maxXP: student.enrollments.reduce(
      (sum: number, e: typeof student.enrollments[number]) => sum + (maxXPByTrail[e.trail.id] || 0),
      0
    ),
  }))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Users className="h-6 w-6" />
          Ученики
        </h1>
        <p className="text-gray-600">
          {students.length} студентов на платформе
        </p>
      </div>

      <StudentsSearch students={serializedStudents} trails={trailNames} />
    </div>
  )
}
