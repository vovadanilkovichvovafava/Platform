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
import { Award, Lock, ChevronDown, X } from "lucide-react"
import { pluralizeRu } from "@/lib/utils"

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
    case "common": return "border-gray-300"
    case "uncommon": return "border-green-400"
    case "rare": return "border-blue-500"
    case "epic": return "border-purple-500"
    case "legendary": return "border-orange-500"
    default: return "border-gray-300"
  }
}

function getRarityGradient(rarity: string) {
  switch (rarity) {
    case "common": return "from-gray-100 to-gray-200"
    case "uncommon": return "from-green-100 to-emerald-200"
    case "rare": return "from-blue-100 to-indigo-200"
    case "epic": return "from-purple-100 to-violet-200"
    case "legendary": return "from-orange-100 via-amber-200 to-yellow-100"
    default: return "from-gray-100 to-gray-200"
  }
}

function getRarityIconBg(rarity: string) {
  switch (rarity) {
    case "common": return "bg-gray-100"
    case "uncommon": return "bg-green-100"
    case "rare": return "bg-blue-100"
    case "epic": return "bg-purple-100"
    case "legendary": return "bg-gradient-to-br from-orange-200 via-amber-300 to-yellow-200"
    default: return "bg-gray-100"
  }
}

function getRarityIconColor(rarity: string) {
  switch (rarity) {
    case "common": return "text-gray-600"
    case "uncommon": return "text-green-600"
    case "rare": return "text-blue-600"
    case "epic": return "text-purple-600"
    case "legendary": return "text-orange-600"
    default: return "text-gray-600"
  }
}

function getRarityCardClass(rarity: string) {
  return `achievement-card-${rarity}`
}

function getRarityGlowColor(rarity: string) {
  switch (rarity) {
    case "common": return "shadow-gray-300/50"
    case "uncommon": return "shadow-green-400/50"
    case "rare": return "shadow-blue-400/50"
    case "epic": return "shadow-purple-500/50"
    case "legendary": return "shadow-orange-500/60"
    default: return "shadow-gray-300/50"
  }
}

function getRarityBorderGradient(rarity: string) {
  switch (rarity) {
    case "common": return "from-gray-300 via-gray-400 to-gray-300"
    case "uncommon": return "from-green-400 via-emerald-500 to-green-400"
    case "rare": return "from-blue-400 via-indigo-500 to-blue-400"
    case "epic": return "from-purple-400 via-violet-500 to-purple-400"
    case "legendary": return "from-orange-400 via-amber-500 to-orange-400"
    default: return "from-gray-300 via-gray-400 to-gray-300"
  }
}

function getRarityBgGradient(rarity: string) {
  switch (rarity) {
    case "common": return "from-gray-50 via-slate-100 to-gray-50"
    case "uncommon": return "from-green-50 via-emerald-100 to-green-50"
    case "rare": return "from-blue-50 via-indigo-100 to-blue-50"
    case "epic": return "from-purple-50 via-violet-100 to-purple-50"
    case "legendary": return "from-orange-50 via-amber-100 to-yellow-50"
    default: return "from-gray-50 via-slate-100 to-gray-50"
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

  const isEarned = achievement.earned
  const rarity = achievement.rarity

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>{achievement.name}</DialogTitle>
        </DialogHeader>

        {/* Main Card with Holographic Effect */}
        <div
          className={`relative achievement-card ${getRarityCardClass(rarity)} ${
            isEarned ? "achievement-glow" : ""
          }`}
        >
          {/* Close Button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700 transition-all duration-200 shadow-sm hover:shadow"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Animated Border Gradient */}
          <div
            className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${getRarityBorderGradient(rarity)} p-[2px]`}
          >
            <div className={`h-full w-full rounded-2xl bg-gradient-to-br ${getRarityBgGradient(rarity)}`} />
          </div>

          {/* Card Content */}
          <div className="relative z-10 p-6 achievement-holographic">
            {/* Sparkles for earned achievements */}
            {isEarned && rarity !== "common" && (
              <>
                <div className="achievement-sparkle" style={{ top: "10%", left: "15%" }} />
                <div className="achievement-sparkle" style={{ top: "20%", right: "20%", animationDelay: "0.3s" }} />
                <div className="achievement-sparkle" style={{ bottom: "25%", left: "10%", animationDelay: "0.6s" }} />
                <div className="achievement-sparkle" style={{ bottom: "15%", right: "15%", animationDelay: "0.9s" }} />
              </>
            )}

            <div className="flex flex-col items-center text-center">
              {/* Achievement Icon Container - 2x larger */}
              <div
                className={`relative w-32 h-32 rounded-2xl flex items-center justify-center mb-5 achievement-stencil achievement-modal-shimmer ${
                  isEarned
                    ? `bg-gradient-to-br ${getRarityGradient(rarity)} shadow-xl ${getRarityGlowColor(rarity)}`
                    : "bg-gray-100"
                }`}
              >
                {/* Icon - doubled size */}
                <Icon
                  icon={achievement.icon}
                  className={`w-20 h-20 ${
                    isEarned ? getRarityIconColor(rarity) : "text-gray-400"
                  } transition-transform duration-300 ${isEarned ? "drop-shadow-lg" : ""}`}
                />

                {/* Lock Overlay for unearned */}
                {!isEarned && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-2xl backdrop-blur-[1px]">
                    <Lock className="h-10 w-10 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Achievement Name */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {achievement.name}
              </h3>

              {/* Rarity Badge with enhanced styling */}
              <Badge
                className={`mb-4 px-4 py-1 text-sm font-medium ${
                  isEarned ? achievement.color : "bg-gray-100 text-gray-500"
                }`}
              >
                {getRarityLabel(rarity)}
              </Badge>

              {/* Description */}
              <p className="text-gray-600 mb-5 text-base leading-relaxed">
                {achievement.description}
              </p>

              {/* Earned Date or Status */}
              {isEarned && achievement.earnedAt ? (
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                    rarity === "legendary"
                      ? "bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700"
                      : rarity === "epic"
                      ? "bg-purple-50 text-purple-700"
                      : rarity === "rare"
                      ? "bg-blue-50 text-blue-700"
                      : rarity === "uncommon"
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-50 text-gray-700"
                  }`}>
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
                <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 px-4 py-2 rounded-full">
                  <Lock className="w-4 h-4" />
                  <span>Ещё не получено</span>
                </div>
              )}
            </div>
          </div>
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
                    {stats.count} из {stats.total} {pluralizeRu(stats.total, ["достижения", "достижений", "достижений"])}
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
              className={`relative overflow-hidden transition-all duration-300 cursor-pointer achievement-card ${getRarityCardClass(achievement.rarity)} ${
                achievement.earned
                  ? `border-2 ${getRarityBorder(achievement.rarity)} hover:shadow-xl hover:scale-[1.03] hover:-translate-y-1 ${getRarityGlowColor(achievement.rarity)}`
                  : "opacity-50 grayscale hover:opacity-70 hover:grayscale-[50%]"
              }`}
            >
              <CardContent className={`text-center ${compact ? "p-3" : "p-5"}`}>
                <div
                  className={`${compact ? "w-12 h-12 mb-2" : "w-[76px] h-[76px] mb-3"} mx-auto rounded-xl flex items-center justify-center transition-transform duration-200 hover:scale-110 achievement-stencil ${
                    achievement.earned
                      ? `${getRarityIconBg(achievement.rarity)} ${getRarityGlowColor(achievement.rarity)} shadow-lg`
                      : "bg-gray-100"
                  }`}
                >
                  <Icon
                    icon={achievement.icon}
                    className={`${compact ? "w-8 h-8" : "w-11 h-11"} ${
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
