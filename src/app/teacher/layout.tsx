import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { ClipboardList, Users, BarChart3, BookOpen } from "lucide-react"

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 pt-16 bg-white border-r">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="px-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Панель учителя
              </h2>
              <p className="text-sm text-gray-500">
                Управление обучением
              </p>
            </div>

            <nav className="flex-1 px-2 space-y-1">
              <Link
                href="/teacher"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <ClipboardList className="h-5 w-5" />
                Работы на проверку
              </Link>
              <Link
                href="/teacher/students"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <Users className="h-5 w-5" />
                Ученики
              </Link>
              <Link
                href="/teacher/stats"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <BarChart3 className="h-5 w-5" />
                Статистика
              </Link>
              <Link
                href="/teacher/content"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <BookOpen className="h-5 w-5" />
                Контент
              </Link>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 md:ml-64">
          {children}
        </main>
      </div>
    </div>
  )
}
