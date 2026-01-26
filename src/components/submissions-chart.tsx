"use client"

import { Card, CardContent } from "@/components/ui/card"
import { FileCheck, FileClock, FileX, FileEdit, BarChart3 } from "lucide-react"

interface SubmissionStats {
  approved: number
  pending: number
  revision: number
  failed: number
  total: number
}

interface SubmissionsChartProps {
  stats: SubmissionStats
  showTitle?: boolean
}

export function SubmissionsChart({ stats, showTitle = true }: SubmissionsChartProps) {
  const { approved, pending, revision, failed, total } = stats

  // Calculate percentages for the bar chart
  const getPercentage = (value: number) => {
    if (total === 0) return 0
    return Math.round((value / total) * 100)
  }

  const approvedPct = getPercentage(approved)
  const pendingPct = getPercentage(pending)
  const revisionPct = getPercentage(revision)
  const failedPct = getPercentage(failed)

  const statItems = [
    {
      label: "Принято",
      value: approved,
      percentage: approvedPct,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
      icon: FileCheck,
    },
    {
      label: "На проверке",
      value: pending,
      percentage: pendingPct,
      color: "bg-amber-500",
      textColor: "text-amber-600",
      bgColor: "bg-amber-50",
      icon: FileClock,
    },
    {
      label: "На доработке",
      value: revision,
      percentage: revisionPct,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
      icon: FileEdit,
    },
    {
      label: "Отклонено",
      value: failed,
      percentage: failedPct,
      color: "bg-red-500",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
      icon: FileX,
    },
  ]

  return (
    <Card>
      <CardContent className="p-6">
        {showTitle && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Статистика работ</h3>
              <p className="text-sm text-gray-500">
                Всего отправлено: {total}
              </p>
            </div>
          </div>
        )}

        {total === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileClock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Работы ещё не отправлялись</p>
          </div>
        ) : (
          <>
            {/* Progress bar visualization */}
            <div className="mb-6">
              <div className="h-4 rounded-full overflow-hidden bg-gray-100 flex">
                {approvedPct > 0 && (
                  <div
                    className="bg-green-500 transition-all duration-500"
                    style={{ width: `${approvedPct}%` }}
                    title={`Принято: ${approved}`}
                  />
                )}
                {pendingPct > 0 && (
                  <div
                    className="bg-amber-500 transition-all duration-500"
                    style={{ width: `${pendingPct}%` }}
                    title={`На проверке: ${pending}`}
                  />
                )}
                {revisionPct > 0 && (
                  <div
                    className="bg-blue-500 transition-all duration-500"
                    style={{ width: `${revisionPct}%` }}
                    title={`На доработке: ${revision}`}
                  />
                )}
                {failedPct > 0 && (
                  <div
                    className="bg-red-500 transition-all duration-500"
                    style={{ width: `${failedPct}%` }}
                    title={`Отклонено: ${failed}`}
                  />
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statItems.map((item) => (
                <div
                  key={item.label}
                  className={`p-3 rounded-lg ${item.bgColor}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon className={`h-4 w-4 ${item.textColor}`} />
                    <span className={`text-xs font-medium ${item.textColor}`}>
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold ${item.textColor}`}>
                      {item.value}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
