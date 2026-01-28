"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  ChevronRight,
  BookOpen,
  Wrench,
  FolderGit2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  ExternalLink,
  ArrowLeft,
} from "lucide-react"

interface Submission {
  id: string
  status: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface ModuleWithStats {
  id: string
  title: string
  type: string
  points: number
  submissions: Submission[]
  completedCount: number
  avgScore: number | null
}

interface TrailWithStats {
  id: string
  title: string
  color: string
  modules: ModuleWithStats[]
  totalSubmissions: number
  pendingCount: number
  approvedCount: number
}

interface TeacherStatsDrilldownProps {
  trails: TrailWithStats[]
}

const typeIcons = {
  THEORY: BookOpen,
  PRACTICE: Wrench,
  PROJECT: FolderGit2,
}

const typeLabels = {
  THEORY: "Теория",
  PRACTICE: "Практика",
  PROJECT: "Проект",
}

export function TeacherStatsDrilldown({ trails }: TeacherStatsDrilldownProps) {
  const [selectedTrail, setSelectedTrail] = useState<TrailWithStats | null>(null)
  const [selectedModule, setSelectedModule] = useState<ModuleWithStats | null>(null)

  // Drill-down view: Module submissions
  if (selectedModule && selectedTrail) {
    return (
      <div className="space-y-4">
        {/* Breadcrumb navigation */}
        <div className="flex items-center gap-2 text-sm">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedModule(null); setSelectedTrail(null); }}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Все направления
          </Button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <Button variant="ghost" size="sm" onClick={() => setSelectedModule(null)}>
            {selectedTrail.title}
          </Button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">{selectedModule.title}</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const TypeIcon = typeIcons[selectedModule.type as keyof typeof typeIcons] || BookOpen
                  return <TypeIcon className="h-5 w-5 text-gray-500" />
                })()}
                <span>{selectedModule.title}</span>
                <Badge variant="outline">{typeLabels[selectedModule.type as keyof typeof typeLabels] || selectedModule.type}</Badge>
              </div>
              <Badge variant="secondary">
                {selectedModule.submissions.length} работ
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedModule.submissions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Нет сданных работ по этому модулю</p>
            ) : (
              <div className="space-y-3">
                {selectedModule.submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Badge
                        className={`text-xs border-0 ${
                          sub.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : sub.status === "PENDING"
                            ? "bg-blue-100 text-blue-700"
                            : sub.status === "FAILED"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {sub.status === "APPROVED" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {sub.status === "PENDING" && <Clock className="h-3 w-3 mr-1" />}
                        {sub.status === "REVISION" && <AlertCircle className="h-3 w-3 mr-1" />}
                        {sub.status === "APPROVED"
                          ? "Принято"
                          : sub.status === "PENDING"
                          ? "На проверке"
                          : sub.status === "FAILED"
                          ? "Провал"
                          : "На доработку"}
                      </Badge>
                      <div>
                        <Link
                          href={`/teacher/students/${sub.user.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {sub.user.name}
                        </Link>
                        <p className="text-xs text-gray-500">{sub.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        {new Date(sub.createdAt).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <Link href={`/teacher/reviews/${sub.id}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Открыть
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Drill-down view: Trail modules
  if (selectedTrail) {
    return (
      <div className="space-y-4">
        {/* Breadcrumb navigation */}
        <div className="flex items-center gap-2 text-sm">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTrail(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Все направления
          </Button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">{selectedTrail.title}</span>
        </div>

        <Card>
          <CardHeader style={{ background: `linear-gradient(135deg, ${selectedTrail.color}15 0%, ${selectedTrail.color}05 100%)` }}>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedTrail.title}</span>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-700 border-0">
                  {selectedTrail.approvedCount} принято
                </Badge>
                <Badge className="bg-blue-100 text-blue-700 border-0">
                  {selectedTrail.pendingCount} ожидает
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {selectedTrail.modules.map((module) => {
                const TypeIcon = typeIcons[module.type as keyof typeof typeIcons] || BookOpen
                const pendingCount = module.submissions.filter((s) => s.status === "PENDING").length
                const approvedCount = module.submissions.filter((s) => s.status === "APPROVED").length

                return (
                  <button
                    key={module.id}
                    onClick={() => setSelectedModule(module)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <TypeIcon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{module.title}</p>
                        <p className="text-xs text-gray-500">
                          {typeLabels[module.type as keyof typeof typeLabels]} • {module.points} XP
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{module.submissions.length} работ</p>
                        <div className="flex gap-2 text-xs">
                          {approvedCount > 0 && (
                            <span className="text-green-600">{approvedCount} принято</span>
                          )}
                          {pendingCount > 0 && (
                            <span className="text-blue-600">{pendingCount} ожидает</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main view: All trails
  return (
    <div className="space-y-4">
      {trails.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Нет данных для отображения</p>
          </CardContent>
        </Card>
      ) : (
        trails.map((trail) => (
          <Card key={trail.id} className="overflow-hidden">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <button
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  style={{ background: `linear-gradient(135deg, ${trail.color}10 0%, transparent 100%)` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: trail.color }}
                    />
                    <span className="font-semibold text-gray-900">{trail.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {trail.modules.length} модулей
                    </Badge>
                    <Badge variant="secondary">
                      {trail.totalSubmissions} работ
                    </Badge>
                    {trail.pendingCount > 0 && (
                      <Badge className="bg-orange-100 text-orange-700 border-0">
                        {trail.pendingCount} на проверке
                      </Badge>
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 pt-2">
                  <div className="flex gap-3 mb-4 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTrail(trail)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Статистика по студентам
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{trail.approvedCount}</p>
                      <p className="text-xs text-green-700">Принято</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{trail.pendingCount}</p>
                      <p className="text-xs text-blue-700">На проверке</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-600">
                        {trail.totalSubmissions - trail.approvedCount - trail.pendingCount}
                      </p>
                      <p className="text-xs text-gray-700">На доработку/провал</p>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))
      )}
    </div>
  )
}
