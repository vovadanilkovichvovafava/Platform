"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ClipboardList, Users, BarChart3, BookOpen } from "lucide-react"

interface TeacherSidebarProps {
  initialPendingCount: number
}

export function TeacherSidebar({ initialPendingCount }: TeacherSidebarProps) {
  const [pendingCount, setPendingCount] = useState(initialPendingCount)

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await fetch("/api/teacher/pending-count")
        if (res.ok) {
          const data = await res.json()
          setPendingCount(data.pendingCount)
        }
      } catch (err) {
        console.error("Error fetching pending count:", err)
      }
    }

    // Poll every 10 seconds (same as notifications)
    const interval = setInterval(fetchPendingCount, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 pt-16 bg-white border-r">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="px-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Панель учителя
          </h2>
          <p className="text-sm text-gray-500">Управление обучением</p>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          <Link
            href="/teacher"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <ClipboardList className="h-5 w-5" />
            <span className="flex-1">Работы на проверку</span>
            {pendingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
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
  )
}
