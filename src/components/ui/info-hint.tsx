"use client"

import * as React from "react"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface InfoHintProps {
  hint: string
  className?: string
  iconClassName?: string
  side?: "top" | "bottom" | "left" | "right"
}

/**
 * Compact info icon "i" with an accessible tooltip popover.
 * - Opens on click/focus (keyboard-friendly)
 * - Closes on click outside / Escape
 * - aria-label + focus-visible ring
 * - Mobile-adaptive positioning
 */
export function InfoHint({
  hint,
  className,
  iconClassName,
  side = "top",
}: InfoHintProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Close on click outside
  React.useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  const positionClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }

  return (
    <div ref={containerRef} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label="Подсказка"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-center rounded-full p-0.5",
          "text-gray-400 hover:text-blue-600 hover:bg-blue-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
          "transition-colors",
          iconClassName
        )}
      >
        <Info className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-50 w-64 max-w-[calc(100vw-2rem)]",
            "rounded-lg border border-gray-200 bg-white p-3 shadow-lg",
            "text-sm text-gray-700 leading-relaxed",
            positionClasses[side]
          )}
        >
          {hint}
        </div>
      )}
    </div>
  )
}
