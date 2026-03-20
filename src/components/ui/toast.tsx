"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Award } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastType = "success" | "error" | "info" | "warning"

interface AchievementToastData {
  achievementId: string
  name: string
  rarity: string
  description: string
}

interface Toast {
  id: string
  message: string
  type: ToastType
  achievementData?: AchievementToastData
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
  showAchievementToast: (data: AchievementToastData) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const styleMap = {
  success: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
  error: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
  info: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
  warning: "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200",
}

const iconStyleMap = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
  warning: "text-yellow-500",
}

const rarityStyleMap: Record<string, { bg: string; border: string; badge: string; glow: string }> = {
  common: { bg: "bg-gradient-to-r from-gray-50 to-slate-100 dark:from-gray-900 dark:to-slate-800", border: "border-gray-300 dark:border-gray-600", badge: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400", glow: "" },
  uncommon: { bg: "bg-gradient-to-r from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900", border: "border-green-400", badge: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300", glow: "" },
  rare: { bg: "bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900", border: "border-blue-400", badge: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300", glow: "shadow-blue-200/50 dark:shadow-blue-800/50" },
  epic: { bg: "bg-gradient-to-r from-purple-50 to-violet-100 dark:from-purple-950 dark:to-violet-900", border: "border-purple-400", badge: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300", glow: "shadow-purple-200/50 dark:shadow-purple-800/50" },
  legendary: { bg: "bg-gradient-to-r from-orange-50 via-amber-100 to-yellow-50 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950", border: "border-orange-400", badge: "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300", glow: "shadow-orange-200/50 dark:shadow-orange-800/50" },
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

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, type }])

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const showAchievementToast = useCallback((data: AchievementToastData) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [
      ...prev,
      { id, message: data.name, type: "success" as ToastType, achievementData: data },
    ])

    // Achievement toasts stay longer (6 seconds)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 6000)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, showAchievementToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => {
        // Achievement toast rendering
        if (toast.achievementData) {
          const rarity = toast.achievementData.rarity
          const styles = rarityStyleMap[rarity] || rarityStyleMap.common

          return (
            <div
              key={toast.id}
              onClick={() => {
                onDismiss(toast.id)
                window.location.href = `/dashboard?achievement=${toast.achievementData!.achievementId}`
              }}
              className={cn(
                "flex items-start gap-3 px-4 py-3 rounded-lg border-2 shadow-xl cursor-pointer animate-in slide-in-from-right-full duration-300 hover:scale-[1.02] transition-transform",
                styles.bg,
                styles.border,
                styles.glow
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                styles.badge
              )}>
                <Award className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                  Новое достижение!
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                  {toast.achievementData.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                    styles.badge
                  )}>
                    {getRarityLabel(rarity)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-slate-400 truncate">
                    {toast.achievementData.description}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDismiss(toast.id)
                }}
                className="shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-400 dark:text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        }

        // Standard toast rendering
        const Icon = iconMap[toast.type]
        return (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-right-full duration-300",
              styleMap[toast.type]
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", iconStyleMap[toast.type])} />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
