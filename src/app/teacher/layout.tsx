import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TeacherSidebar } from "@/components/teacher-sidebar"

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // Allow both TEACHER and ADMIN roles
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    redirect("/dashboard")
  }

  // Get initial pending submissions count for this teacher
  const isAdmin = session.user.role === "ADMIN"

  let pendingCount = 0
  if (isAdmin) {
    // Admin sees all pending submissions
    pendingCount = await prisma.submission.count({
      where: { status: "PENDING" },
    })
  } else {
    // Teacher sees trails with teacherVisibility = "ALL_TEACHERS" + specifically assigned trails
    const allTeacherTrails = await prisma.trail.findMany({
      where: { teacherVisibility: "ALL_TEACHERS" },
      select: { id: true },
    })

    const specificAssignments = await prisma.trailTeacher.findMany({
      where: { teacherId: session.user.id },
      select: { trailId: true },
    })

    const allTrailIds = new Set([
      ...allTeacherTrails.map(t => t.id),
      ...specificAssignments.map(a => a.trailId),
    ])

    const assignedTrailIds = Array.from(allTrailIds)

    pendingCount = await prisma.submission.count({
      where: {
        status: "PENDING",
        module: { trailId: { in: assignedTrailIds } },
      },
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar with real-time updates */}
        <TeacherSidebar initialPendingCount={pendingCount} />

        {/* Main content */}
        <main className="flex-1 md:ml-64 min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
