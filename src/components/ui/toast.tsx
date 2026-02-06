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
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
}

const iconStyleMap = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
  warning: "text-yellow-500",
}

const rarityStyleMap: Record<string, { bg: string; border: string; badge: string; glow: string }> = {
  common: { bg: "bg-gradient-to-r from-gray-50 to-slate-100", border: "border-gray-300", badge: "bg-gray-100 text-gray-600", glow: "" },
  uncommon: { bg: "bg-gradient-to-r from-green-50 to-emerald-100", border: "border-green-400", badge: "bg-green-100 text-green-700", glow: "" },
  rare: { bg: "bg-gradient-to-r from-blue-50 to-indigo-100", border: "border-blue-400", badge: "bg-blue-100 text-blue-700", glow: "shadow-blue-200/50" },
  epic: { bg: "bg-gradient-to-r from-purple-50 to-violet-100", border: "border-purple-400", badge: "bg-purple-100 text-purple-700", glow: "shadow-purple-200/50" },
  legendary: { bg: "bg-gradient-to-r from-orange-50 via-amber-100 to-yellow-50", border: "border-orange-400", badge: "bg-orange-100 text-orange-700", glow: "shadow-orange-200/50" },
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
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Новое достижение!
                </p>
                <p className="text-sm font-bold text-gray-900 truncate">
                  {toast.achievementData.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                    styles.badge
                  )}>
                    {getRarityLabel(rarity)}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {toast.achievementData.description}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDismiss(toast.id)
                }}
                className="shrink-0 p-1 rounded hover:bg-black/5 transition-colors text-gray-400"
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
