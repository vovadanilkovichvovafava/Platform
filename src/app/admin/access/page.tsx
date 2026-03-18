"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Suspense, useEffect, useRef } from "react"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { TeachersTab } from "./_components/teachers-tab"
import { StudentAccessTab } from "./_components/student-access-tab"
import { TrailSettingsTab } from "./_components/trail-settings-tab"
import { AdminAccessTab } from "./_components/admin-access-tab"
import {
  Users,
  Lock,
  BookOpen,
  ShieldCheck,
  RefreshCw,
} from "lucide-react"

type TabValue = "teachers" | "student-access" | "trail-settings" | "admin-access"

const VALID_TABS: TabValue[] = ["teachers", "student-access", "trail-settings", "admin-access"]

function AccessPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()

  const tabParam = searchParams.get("tab")
  const currentTab: TabValue = VALID_TABS.includes(tabParam as TabValue)
    ? (tabParam as TabValue)
    : "teachers"

  const isAdmin = session?.user?.role === "ADMIN"
  const studentIdCleaned = useRef(false)

  // Clean studentId from URL after initial mount so it doesn't persist on refresh/save
  useEffect(() => {
    if (searchParams.get("studentId") && !studentIdCleaned.current) {
      studentIdCleaned.current = true
      const params = new URLSearchParams(searchParams.toString())
      params.delete("studentId")
      router.replace(`/admin/access?${params.toString()}`, { scroll: false })
    }
  }, [searchParams, router])

  const handleTabChange = (value: string) => {
    const newTab = value as TabValue
    router.push(`/admin/access?tab=${newTab}`, { scroll: false })
  }

  const getTabTitle = () => {
    switch (currentTab) {
      case "teachers":
        return "Назначение учителей"
      case "student-access":
        return "Доступ студентов"
      case "trail-settings":
        return "Доступ трейлов"
      case "admin-access":
        return "Доступ админов"
      default:
        return "Управление доступом"
    }
  }

  const getTabDescription = () => {
    switch (currentTab) {
      case "teachers":
        return "Перетащите учителя на trail для назначения"
      case "student-access":
        return "Назначайте трейлы студентам через карточки"
      case "trail-settings":
        return "Управляйте публикацией, ограничениями и паролями trails"
      case "admin-access":
        return "Назначьте каким trails имеет доступ каждый со-админ"
      default:
        return ""
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Breadcrumbs
            items={[
              { label: "Админ", href: "/admin/invites" },
              { label: "Управление доступом" },
            ]}
            className="mb-4"
          />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getTabTitle()}
              </h1>
              <p className="text-gray-600 mt-1">
                {getTabDescription()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6 bg-white border">
            <TabsTrigger value="teachers" className="gap-2">
              <Users className="h-4 w-4" />
              Учителя
            </TabsTrigger>
            <TabsTrigger value="student-access" className="gap-2">
              <Users className="h-4 w-4" />
              Доступ студентов
            </TabsTrigger>
            <TabsTrigger value="trail-settings" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Доступ трейлов
            </TabsTrigger>
            <TabsTrigger
              value="admin-access"
              className="gap-2"
              disabled={!isAdmin}
              title={!isAdmin ? "Только для ADMIN" : undefined}
            >
              <ShieldCheck className="h-4 w-4" />
              Доступ админов
              {!isAdmin && (
                <Lock className="h-3 w-3 text-gray-400" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teachers">
            <TeachersTab />
          </TabsContent>

          <TabsContent value="student-access">
            <StudentAccessTab initialStudentId={searchParams.get("studentId") || undefined} />
          </TabsContent>

          <TabsContent value="trail-settings">
            <TrailSettingsTab />
          </TabsContent>

          <TabsContent value="admin-access">
            <AdminAccessTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function AccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <AccessPageContent />
    </Suspense>
  )
}
