"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, Lock, ChevronDown } from "lucide-react"

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  color: string
  rarity: string
  earned: boolean
  earnedAt: string | null
}

interface AchievementsGridProps {
  achievements: Achievement[]
  stats?: { count: number; total: number }
  showTitle?: boolean
  compact?: boolean
  collapsible?: boolean
  defaultExpanded?: boolean
}

function getRarityLabel(rarity: string) {
  switch (rarity) {
    case "common": return "Обычное"
    case "uncommon": return "Необычное"
    case "rare": return "Редкое"
    case "epic": return "Эпическое"
    case "legendary": return "Легендарное"
    default: return rarity
  }
}

function getRarityBorder(rarity: string) {
  switch (rarity) {
    case "common": return "border-gray-200"
    case "uncommon": return "border-green-300"
    case "rare": return "border-blue-400"
    case "epic": return "border-purple-500"
    case "legendary": return "border-yellow-500"
    default: return "border-gray-200"
  }
}

export function AchievementsGrid({
  achievements,
  stats,
  showTitle = true,
  compact = false,
  collapsible = false,
  defaultExpanded = true,
}: AchievementsGridProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (achievements.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <Award className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Загрузка достижений...</p>
        </CardContent>
      </Card>
    )
  }

  const earnedAchievements = compact
    ? achievements.filter((a) => a.earned)
    : achievements

  const earnedCount = achievements.filter((a) => a.earned).length
  const progressPercent = Math.round((earnedCount / achievements.length) * 100)

  return (
    <div>
      {showTitle && (
        <div
          className={`flex items-center justify-between mb-4 ${
            collapsible
              ? "cursor-pointer select-none group hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
              : ""
          }`}
          onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-sm">
              <Award className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                Достижения
                {collapsible && (
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 transition-transform duration-300 group-hover:text-gray-600 ${
                      isExpanded ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                )}
              </h2>
              {stats && (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {stats.count} / {stats.total}
                  </span>
                </div>
              )}
            </div>
          </div>
          {stats && (
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-700 border-0 hover:bg-orange-100"
            >
              {progressPercent}%
            </Badge>
          )}
        </div>
      )}

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          collapsible && !isExpanded ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
        }`}
      >
        <div className={`grid gap-4 ${
          compact
            ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        }`}>
          {earnedAchievements.map((achievement) => (
            <Card
              key={achievement.id}
              className={`relative overflow-hidden transition-all duration-200 ${
                achievement.earned
                  ? `border-2 ${getRarityBorder(achievement.rarity)} hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5`
                  : "opacity-50 grayscale hover:opacity-70 hover:grayscale-[50%]"
              }`}
            >
              <CardContent className={`text-center ${compact ? "p-3" : "p-4"}`}>
                <div className={`${compact ? "text-2xl mb-1" : "text-3xl mb-2"} transition-transform duration-200 hover:scale-110`}>
                  {achievement.icon}
                </div>
                <h3 className={`font-semibold text-gray-900 mb-1 ${
                  compact ? "text-xs" : "text-sm"
                }`}>
                  {achievement.name}
                </h3>
                {!compact && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                    {achievement.description}
                  </p>
                )}
                <Badge
                  className={`text-[10px] ${
                    achievement.earned ? achievement.color : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {getRarityLabel(achievement.rarity)}
                </Badge>
                {!compact && achievement.earned && achievement.earnedAt && (
                  <p className="text-[10px] text-gray-400 mt-2">
                    {new Date(achievement.earnedAt).toLocaleDateString("ru-RU")}
                  </p>
                )}
                {!achievement.earned && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/50 transition-opacity duration-200">
                    <Lock className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {compact && earnedAchievements.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-4">
            Пока нет достижений
          </p>
        )}
      </div>
    </div>
  )
}
