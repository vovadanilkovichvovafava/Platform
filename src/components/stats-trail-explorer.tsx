"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import {
  ChevronDown,
  BookOpen,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  User,
  Layers,
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
  module: {
    id: string
    title: string
  }
  review?: {
    score: number
  } | null
}

interface Module {
  id: string
  title: string
  slug: string
  type: string
  submissions: Submission[]
}

interface Trail {
  id: string
  title: string
  slug: string
  color: string
  modules: Module[]
}

interface StatsTrailExplorerProps {
  trails: Trail[]
}

function getStatusBadge(status: string) {
  switch (status) {
    case "APPROVED":
      return (
        <Badge className="bg-green-100 text-green-700 border-0 text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Принято
        </Badge>
      )
    case "PENDING":
      return (
        <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Ожидает
        </Badge>
      )
    case "REVISION":
      return (
        <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Доработка
        </Badge>
      )
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>
  }
}

export function StatsTrailExplorer({ trails }: StatsTrailExplorerProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  if (trails.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <Layers className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          Нет данных о направлениях
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {trails.map((trail) => {
        const totalSubmissions = trail.modules.reduce(
          (sum, m) => sum + m.submissions.length,
          0
        )
        const approvedSubmissions = trail.modules.reduce(
          (sum, m) => sum + m.submissions.filter((s) => s.status === "APPROVED").length,
          0
        )
        const pendingSubmissions = trail.modules.reduce(
          (sum, m) => sum + m.submissions.filter((s) => s.status === "PENDING").length,
          0
        )

        return (
          <Card key={trail.id}>
            <Collapsible defaultOpen={false}>
              <CardContent className="p-0">
                <CollapsibleTrigger className="w-full p-4 hover:bg-gray-50 transition-colors" showChevron={false}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: trail.color || "#6366f1" }}
                      />
                      <span className="font-semibold text-gray-900">{trail.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {trail.modules.length} модулей
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                          {approvedSubmissions}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {pendingSubmissions}
                        </span>
                        <span className="text-gray-500">{totalSubmissions} всего</span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t px-4 pb-4">
                    {trail.modules.length === 0 ? (
                      <p className="py-4 text-center text-gray-500 text-sm">
                        Нет модулей в этом направлении
                      </p>
                    ) : (
                      <div className="space-y-2 mt-3">
                        {trail.modules.map((module) => {
                          const moduleApproved = module.submissions.filter(
                            (s) => s.status === "APPROVED"
                          ).length
                          const modulePending = module.submissions.filter(
                            (s) => s.status === "PENDING"
                          ).length
                          const isExpanded = expandedModules.has(module.id)

                          return (
                            <div key={module.id} className="bg-gray-50 rounded-lg">
                              {/* Module Header */}
                              <button
                                onClick={() => toggleModule(module.id)}
                                className="w-full p-3 flex items-center justify-between hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-700">
                                    {module.title}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {module.type}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                  {module.submissions.length > 0 && (
                                    <div className="flex gap-1 text-xs">
                                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                                        {moduleApproved}
                                      </span>
                                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                        {modulePending}
                                      </span>
                                    </div>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {module.submissions.length} работ
                                  </span>
                                  <ChevronDown
                                    className={`h-4 w-4 text-gray-400 transition-transform ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                </div>
                              </button>

                              {/* Submissions List */}
                              {isExpanded && module.submissions.length > 0 && (
                                <div className="px-3 pb-3 space-y-2">
                                  {module.submissions.map((submission) => (
                                    <div
                                      key={submission.id}
                                      className="flex items-center justify-between p-2 bg-white rounded border"
                                    >
                                      <div className="flex items-center gap-3">
                                        <User className="h-4 w-4 text-gray-400" />
                                        <div>
                                          <Link
                                            href={`/teacher/students/${submission.user.id}`}
                                            className="text-sm font-medium text-gray-900 hover:text-blue-600"
                                          >
                                            {submission.user.name}
                                          </Link>
                                          <p className="text-xs text-gray-500">
                                            {new Date(submission.createdAt).toLocaleDateString(
                                              "ru-RU",
                                              {
                                                day: "numeric",
                                                month: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              }
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {getStatusBadge(submission.status)}
                                        {submission.review && (
                                          <span className="text-sm font-bold text-blue-600">
                                            {submission.review.score}/10
                                          </span>
                                        )}
                                        <Button asChild variant="ghost" size="sm">
                                          <Link href={`/teacher/reviews/${submission.id}`}>
                                            <ExternalLink className="h-4 w-4" />
                                          </Link>
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {isExpanded && module.submissions.length === 0 && (
                                <p className="px-3 pb-3 text-center text-gray-500 text-xs">
                                  Нет сданных работ
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Collapsible>
          </Card>
        )
      })}
    </div>
  )
}
