"use client"

import { useState, useEffect } from "react"
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
  const [isAnimated, setIsAnimated] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setIsAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

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
      hoverColor: "hover:bg-green-100",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
      ringColor: "ring-green-200",
      icon: FileCheck,
    },
    {
      label: "На проверке",
      value: pending,
      percentage: pendingPct,
      color: "bg-amber-500",
      hoverColor: "hover:bg-amber-100",
      textColor: "text-amber-600",
      bgColor: "bg-amber-50",
      ringColor: "ring-amber-200",
      icon: FileClock,
    },
    {
      label: "На доработке",
      value: revision,
      percentage: revisionPct,
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-100",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
      ringColor: "ring-blue-200",
      icon: FileEdit,
    },
    {
      label: "Отклонено",
      value: failed,
      percentage: failedPct,
      color: "bg-red-500",
      hoverColor: "hover:bg-red-100",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
      ringColor: "ring-red-200",
      icon: FileX,
    },
  ]

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        {showTitle && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Статистика работ</h3>
              <p className="text-sm text-gray-500">
                Всего отправлено: <span className="font-medium text-gray-700">{total}</span>
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
            {/* Progress bar visualization with hover effect */}
            <div className="mb-6 group">
              <div className="h-5 rounded-full overflow-hidden bg-gray-100 flex shadow-inner relative">
                {statItems.map((item, index) => {
                  if (item.percentage === 0) return null
                  const isHovered = hoveredIndex === index
                  return (
                    <div
                      key={item.label}
                      className={`${item.color} transition-all duration-500 ease-out cursor-pointer relative ${
                        isHovered ? "brightness-110 z-10" : ""
                      }`}
                      style={{
                        width: isAnimated ? `${item.percentage}%` : "0%",
                        transitionDelay: `${index * 100}ms`,
                        transform: isHovered ? "scaleY(1.1)" : "scaleY(1)",
                      }}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* Tooltip on hover */}
                      {isHovered && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-20">
                          {item.label}: {item.value} ({item.percentage}%)
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Percentage labels below the bar */}
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Stats grid with hover effects */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statItems.map((item, index) => (
                <div
                  key={item.label}
                  className={`p-3 rounded-xl ${item.bgColor} ${item.hoverColor} transition-all duration-200 cursor-pointer group/stat ${
                    hoveredIndex === index ? `ring-2 ${item.ringColor} shadow-sm` : ""
                  }`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon className={`h-4 w-4 ${item.textColor} transition-transform duration-200 group-hover/stat:scale-110`} />
                    <span className={`text-xs font-medium ${item.textColor}`}>
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold ${item.textColor} transition-all duration-300`}
                      style={{
                        transform: isAnimated ? "translateY(0)" : "translateY(10px)",
                        opacity: isAnimated ? 1 : 0,
                        transitionDelay: `${200 + index * 100}ms`
                      }}
                    >
                      {item.value}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({item.percentage}%)
                    </span>
                  </div>
                  {/* Mini progress indicator */}
                  <div className="mt-2 h-1 rounded-full bg-white/50 overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-700 ease-out`}
                      style={{
                        width: isAnimated ? `${item.percentage}%` : "0%",
                        transitionDelay: `${300 + index * 100}ms`
                      }}
                    />
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
