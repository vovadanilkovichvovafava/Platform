"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { ClipboardList, Users, BarChart3, BookOpen, Eye } from "lucide-react"

interface TeacherSidebarProps {
  initialPendingCount: number
}

export function TeacherSidebar({ initialPendingCount }: TeacherSidebarProps) {
  const { data: session } = useSession()
  const [pendingCount, setPendingCount] = useState(initialPendingCount)

  const isHR = session?.user?.role === "HR"
  const isFilterActiveRef = useRef(false)

  // Listen for filtered pending count from SubmissionsFilter (teacher page)
  useEffect(() => {
    const handleCountUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setPendingCount(detail.count)
      isFilterActiveRef.current = true
    }
    const handleFilterUnmount = () => {
      isFilterActiveRef.current = false
      // Immediately fetch unfiltered count when leaving teacher page
      fetch("/api/teacher/pending-count")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setPendingCount(data.pendingCount)
        })
        .catch(() => {})
    }

    window.addEventListener("pending-count-update", handleCountUpdate)
    window.addEventListener("pending-count-unmount", handleFilterUnmount)
    return () => {
      window.removeEventListener("pending-count-update", handleCountUpdate)
      window.removeEventListener("pending-count-unmount", handleFilterUnmount)
    }
  }, [])

  // Poll API every 10 seconds, but skip when filter component provides the count
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (isFilterActiveRef.current) return
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

    const interval = setInterval(fetchPendingCount, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 pt-16 bg-white border-r">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="px-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {isHR ? "HR панель" : "Панель учителя"}
          </h2>
          <p className="text-sm text-gray-500">
            {isHR ? "Аналитика кандидатов" : "Управление обучением"}
          </p>
          {isHR && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
              <Eye className="h-3 w-3" />
              Только просмотр
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {/* Submissions — visible for all roles (HR = read-only) */}
          <Link
            href="/teacher"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <ClipboardList className="h-5 w-5" />
            <span className="flex-1">{isHR ? "Работы студентов" : "Работы на проверку"}</span>
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
            {isHR ? "Кандидаты" : "Ученики"}
          </Link>
          <Link
            href="/teacher/stats"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <BarChart3 className="h-5 w-5" />
            Статистика
          </Link>
          {/* Content - hidden for HR */}
          {!isHR && (
            <Link
              href="/teacher/content"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <BookOpen className="h-5 w-5" />
              Контент
            </Link>
          )}
        </nav>
      </div>
    </aside>
  )
}
