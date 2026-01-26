"use client"

import { useState } from "react"
import { Icon } from "@iconify/react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

function getRarityGradient(rarity: string) {
  switch (rarity) {
    case "common": return "from-gray-100 to-gray-200"
    case "uncommon": return "from-green-100 to-emerald-200"
    case "rare": return "from-blue-100 to-indigo-200"
    case "epic": return "from-purple-100 to-violet-200"
    case "legendary": return "from-yellow-100 via-amber-200 to-orange-200"
    default: return "from-gray-100 to-gray-200"
  }
}

function getRarityIconBg(rarity: string) {
  switch (rarity) {
    case "common": return "bg-gray-100"
    case "uncommon": return "bg-green-100"
    case "rare": return "bg-blue-100"
    case "epic": return "bg-purple-100"
    case "legendary": return "bg-gradient-to-br from-yellow-200 via-amber-300 to-orange-300"
    default: return "bg-gray-100"
  }
}

function getRarityIconColor(rarity: string) {
  switch (rarity) {
    case "common": return "text-gray-600"
    case "uncommon": return "text-green-600"
    case "rare": return "text-blue-600"
    case "epic": return "text-purple-600"
    case "legendary": return "text-amber-700"
    default: return "text-gray-600"
  }
}

function AchievementModal({
  achievement,
  open,
  onOpenChange,
}: {
  achievement: Achievement | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!achievement) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">{achievement.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center text-center">
          {/* Achievement Icon */}
          <div
            className={`relative w-24 h-24 rounded-2xl flex items-center justify-center mb-4 ${
              achievement.earned
                ? `bg-gradient-to-br ${getRarityGradient(achievement.rarity)} shadow-lg`
                : "bg-gray-100"
            }`}
          >
            <Icon
              icon={achievement.icon}
              className={`w-14 h-14 ${
                achievement.earned
                  ? getRarityIconColor(achievement.rarity)
                  : "text-gray-400"
              }`}
            />
            {!achievement.earned && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-2xl">
                <Lock className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Achievement Name */}
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {achievement.name}
          </h3>

          {/* Rarity Badge */}
          <Badge
            className={`mb-3 ${
              achievement.earned ? achievement.color : "bg-gray-100 text-gray-500"
            }`}
          >
            {getRarityLabel(achievement.rarity)}
          </Badge>

          {/* Description */}
          <p className="text-gray-600 mb-4">
            {achievement.description}
          </p>

          {/* Earned Date or Status */}
          {achievement.earned && achievement.earnedAt ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Получено {new Date(achievement.earnedAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Lock className="w-4 h-4" />
              <span>Ещё не получено</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
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
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleAchievementClick = (achievement: Achievement) => {
    setSelectedAchievement(achievement)
    setModalOpen(true)
  }

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
  const totalCount = stats?.total ?? achievements.length
  const progressPercent = Math.round((earnedCount / totalCount) * 100)

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
              onClick={() => handleAchievementClick(achievement)}
              className={`relative overflow-hidden transition-all duration-200 cursor-pointer ${
                achievement.earned
                  ? `border-2 ${getRarityBorder(achievement.rarity)} hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5`
                  : "opacity-50 grayscale hover:opacity-70 hover:grayscale-[50%]"
              }`}
            >
              <CardContent className={`text-center ${compact ? "p-3" : "p-4"}`}>
                <div
                  className={`${compact ? "w-10 h-10 mb-1" : "w-12 h-12 mb-2"} mx-auto rounded-xl flex items-center justify-center transition-transform duration-200 hover:scale-110 ${
                    achievement.earned
                      ? getRarityIconBg(achievement.rarity)
                      : "bg-gray-100"
                  }`}
                >
                  <Icon
                    icon={achievement.icon}
                    className={`${compact ? "w-6 h-6" : "w-7 h-7"} ${
                      achievement.earned
                        ? getRarityIconColor(achievement.rarity)
                        : "text-gray-400"
                    }`}
                  />
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

      <AchievementModal
        achievement={selectedAchievement}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
