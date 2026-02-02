import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrivileged } from "@/lib/admin-access"

export const dynamic = "force-dynamic"
import { Users } from "lucide-react"
import { StudentsSearch } from "@/components/students-search"

export default async function TeacherStudentsPage() {
  const session = await getServerSession(authOptions)

  // Allow TEACHER, CO_ADMIN, and ADMIN roles
  if (!session || !isPrivileged(session.user.role)) {
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
    maxXPByTrail[trail.id] = trail.modules.reduce((sum, m) => sum + m.points, 0)
  }

  // Get submission stats per student
  const submissionStats = await prisma.submission.groupBy({
    by: ["userId", "status"],
    _count: true,
  })

  const getStudentStats = (userId: string) => {
    const stats = submissionStats.filter((s) => s.userId === userId)
    return {
      pending: stats.find((s) => s.status === "PENDING")?._count || 0,
      approved: stats.find((s) => s.status === "APPROVED")?._count || 0,
      revision: stats.find((s) => s.status === "REVISION")?._count || 0,
    }
  }

  // Get unique trail names for filter
  const trailNames = [...new Set(allTrails.map((t) => t.title))].sort()

  // Serialize students data for client component
  const serializedStudents = students.map((student) => ({
    id: student.id,
    name: student.name,
    email: student.email,
    totalXP: student.totalXP,
    enrollments: student.enrollments,
    moduleProgress: student.moduleProgress,
    submissions: student.submissions.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    })),
    _count: student._count,
    stats: getStudentStats(student.id),
    maxXP: student.enrollments.reduce(
      (sum, e) => sum + (maxXPByTrail[e.trail.id] || 0),
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
