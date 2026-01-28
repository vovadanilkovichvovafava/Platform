"use client"

import { cn } from "@/lib/utils"
import { getLevelInfo, getRankInfo, formatXP, type LevelInfo, type RankInfo } from "@/lib/levels"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Star, Sparkles } from "lucide-react"

interface LevelBadgeProps {
  xp: number
  showProgress?: boolean
  showXP?: boolean
  variant?: "compact" | "full" | "inline"
  className?: string
}

/**
 * Компонент для отображения уровня пользователя
 */
export function LevelBadge({
  xp,
  showProgress = false,
  showXP = true,
  variant = "compact",
  className,
}: LevelBadgeProps) {
  const levelInfo = getLevelInfo(xp)
  const { current, next, progressPercent, isMaxLevel, xpToNext } = levelInfo

  if (variant === "inline") {
    return (
      <Badge className={cn(current.bgColor, current.color, "border-0", className)}>
        {current.icon} {current.name}
        {showXP && <span className="ml-1 opacity-75">({formatXP(xp)} XP)</span>}
      </Badge>
    )
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-sm",
          current.bgColor, current.color
        )}>
          <span>{current.icon}</span>
          <span>{current.name}</span>
        </div>
        {showXP && (
          <span className="text-sm text-gray-500">
            {formatXP(xp)} XP
          </span>
        )}
      </div>
    )
  }

  // Full variant
  return (
    <div className={cn("space-y-3", className)}>
      {/* Level header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl text-2xl",
            current.bgColor
          )}>
            {current.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("font-bold text-lg", current.color)}>
                {current.name}
              </span>
              <Badge variant="outline" className="text-xs">
                Уровень {current.level}
              </Badge>
            </div>
            {showXP && (
              <span className="text-sm text-gray-500">
                {formatXP(xp)} XP накоплено
              </span>
            )}
          </div>
        </div>
        {isMaxLevel && (
          <div className="flex items-center gap-1 text-amber-500">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">MAX</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {isMaxLevel ? "Максимальный уровень достигнут!" : `До уровня ${next?.name}`}
            </span>
            {!isMaxLevel && (
              <span className={cn("font-medium", current.color)}>
                {xpToNext} XP
              </span>
            )}
          </div>
          <Progress
            value={progressPercent}
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{current.name}</span>
            {next && <span>{next.name}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

interface RankBadgeProps {
  xp: number
  showProgress?: boolean
  variant?: "compact" | "full"
  className?: string
}

/**
 * Компонент для отображения ранга пользователя
 */
export function RankBadge({
  xp,
  showProgress = false,
  variant = "compact",
  className,
}: RankBadgeProps) {
  const rankInfo = getRankInfo(xp)
  const { current, next, progressPercent, isMaxRank, xpToNext } = rankInfo

  if (variant === "compact") {
    return (
      <Badge className={cn(current.bgColor, current.color, "border-0", className)}>
        {current.name}
      </Badge>
    )
  }

  // Full variant
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Badge className={cn(current.bgColor, current.color, "border-0 px-3 py-1")}>
          {current.name}
        </Badge>
        {!isMaxRank && next && (
          <span className="text-xs text-gray-500">
            до {next.name}: {xpToNext} XP
          </span>
        )}
      </div>

      {showProgress && (
        <Progress value={progressPercent} className="h-1.5" />
      )}
    </div>
  )
}

interface XPDisplayProps {
  xp: number
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  className?: string
}

/**
 * Компонент для отображения XP
 */
export function XPDisplay({
  xp,
  size = "md",
  showIcon = true,
  className,
}: XPDisplayProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {showIcon && (
        <Star className={cn(iconSizes[size], "text-yellow-500")} />
      )}
      <span className={cn("font-bold", sizeClasses[size])}>
        {formatXP(xp)}
      </span>
      <span className={cn("text-gray-500", sizeClasses[size])}>
        XP
      </span>
    </div>
  )
}
