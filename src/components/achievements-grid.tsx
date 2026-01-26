"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, Lock } from "lucide-react"

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
}: AchievementsGridProps) {
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

  return (
    <div>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="h-6 w-6 text-orange-500" />
            Достижения
          </h2>
          {stats && (
            <Badge variant="secondary">
              {stats.count} / {stats.total}
            </Badge>
          )}
        </div>
      )}

      <div className={`grid gap-4 ${
        compact
          ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6"
          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      }`}>
        {earnedAchievements.map((achievement) => (
          <Card
            key={achievement.id}
            className={`relative overflow-hidden transition-all ${
              achievement.earned
                ? `border-2 ${getRarityBorder(achievement.rarity)} hover:shadow-lg`
                : "opacity-50 grayscale"
            }`}
          >
            <CardContent className={`text-center ${compact ? "p-3" : "p-4"}`}>
              <div className={compact ? "text-2xl mb-1" : "text-3xl mb-2"}>
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
                <div className="absolute inset-0 flex items-center justify-center bg-white/50">
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
  )
}
