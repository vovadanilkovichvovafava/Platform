import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
import { Card, CardContent } from "@/components/ui/card"
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react"
import { SubmissionsFilter } from "@/components/submissions-filter"

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions)

  // Allow both TEACHER and ADMIN roles
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    redirect("/dashboard")
  }

  const isAdmin = session.user.role === "ADMIN"

  // Get teacher's assigned trails (ADMIN sees all)
  const teacherAssignments = isAdmin ? [] : await prisma.trailTeacher.findMany({
    where: { teacherId: session.user.id },
    select: { trailId: true },
  })

  const assignedTrailIds = teacherAssignments.map((a: { trailId: string }) => a.trailId)
  const hasAssignments = !isAdmin && assignedTrailIds.length > 0

  // ADMIN sees all submissions, TEACHER only sees assigned trails
  const pendingSubmissions = await prisma.submission.findMany({
    where: {
      status: "PENDING",
      ...(hasAssignments ? { module: { trailId: { in: assignedTrailIds } } } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: { name: true, email: true },
      },
      module: {
        include: {
          trail: { select: { title: true } },
        },
      },
    },
  })

  // Get all reviewed submissions (approved, revision, failed) for history
  const reviewedSubmissions = await prisma.submission.findMany({
    where: {
      status: { in: ["APPROVED", "REVISION", "FAILED"] },
      ...(hasAssignments ? { module: { trailId: { in: assignedTrailIds } } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 50, // Limit history to last 50
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      module: {
        include: {
          trail: { select: { title: true } },
        },
      },
      review: {
        select: {
          score: true,
          comment: true,
          createdAt: true,
          reviewer: { select: { name: true } },
        },
      },
    },
  })

  // Stats - only for assigned trails
  const stats = await prisma.submission.groupBy({
    by: ["status"],
    where: hasAssignments ? { module: { trailId: { in: assignedTrailIds } } } : {},
    _count: true,
  })

  const pendingCount = stats.find((s: { status: string }) => s.status === "PENDING")?._count || 0
  const approvedCount = stats.find((s: { status: string }) => s.status === "APPROVED")?._count || 0
  const revisionCount = stats.find((s: { status: string }) => s.status === "REVISION")?._count || 0
  const failedCount = stats.find((s: { status: string }) => s.status === "FAILED")?._count || 0

  // Get unique trails for filter
  const allTrails = new Set<string>()
  pendingSubmissions.forEach((s: { module: { trail: { title: string } } }) => allTrails.add(s.module.trail.title))
  reviewedSubmissions.forEach((s: { module: { trail: { title: string } } }) => allTrails.add(s.module.trail.title))
  const trails = Array.from(allTrails).sort()

  // Serialize dates for client component
  const serializedPending = pendingSubmissions.map((s: typeof pendingSubmissions[number]) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }))

  const serializedReviewed = reviewedSubmissions.map((s: typeof reviewedSubmissions[number]) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    review: s.review
      ? {
          ...s.review,
          createdAt: s.review.createdAt.toISOString(),
        }
      : null,
  }))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Добро пожаловать!
        </h1>
        <p className="text-gray-600">
          Управляйте проверкой работ и отслеживайте прогресс учеников
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <div className="text-sm text-gray-500">На проверке</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{approvedCount}</div>
                <div className="text-sm text-gray-500">Принято</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{revisionCount}</div>
                <div className="text-sm text-gray-500">На доработку</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{failedCount}</div>
                <div className="text-sm text-gray-500">Провал</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions with filter */}
      <SubmissionsFilter
        pendingSubmissions={serializedPending}
        reviewedSubmissions={serializedReviewed}
        trails={trails}
      />
    </div>
  )
}
