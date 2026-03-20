"use client"

import { useState, useRef, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

export interface TagInfo {
  id: string
  name: string
  color: string
}

const TAG_COLOR_CLASSES: Record<string, string> = {
  gray: "bg-gray-100 text-gray-700 border-gray-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  green: "bg-green-100 text-green-700 border-green-200",
  red: "bg-red-100 text-red-700 border-red-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  pink: "bg-pink-100 text-pink-700 border-pink-200",
}

interface StudentTagsBadgesProps {
  tags: TagInfo[]
  maxVisible?: number
  onRemove?: (tagId: string) => void
}

export function StudentTagsBadges({
  tags,
  maxVisible = 3,
  onRemove,
}: StudentTagsBadgesProps) {
  const [showOverflow, setShowOverflow] = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showOverflow) return
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showOverflow])

  if (tags.length === 0) return null

  const visible = tags.slice(0, maxVisible)
  const overflow = tags.slice(maxVisible)

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className={`text-xs px-1.5 py-0 gap-1 border ${TAG_COLOR_CLASSES[tag.color] || TAG_COLOR_CLASSES.gray}`}
        >
          {tag.name}
          {onRemove && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRemove(tag.id)
              }}
              className="ml-0.5 p-0.5 rounded hover:bg-black/10"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </Badge>
      ))}
      {overflow.length > 0 && (
        <div className="relative" ref={overflowRef}>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowOverflow(!showOverflow)
            }}
            className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            ещё +{overflow.length}
          </button>
          {showOverflow && (
            <div className="absolute z-30 top-full left-0 mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg p-2 min-w-[140px] max-h-48 overflow-y-auto">
              <div className="flex flex-col gap-1">
                {overflow.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className={`text-xs px-1.5 py-0.5 gap-1 border ${TAG_COLOR_CLASSES[tag.color] || TAG_COLOR_CLASSES.gray}`}
                  >
                    {tag.name}
                    {onRemove && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onRemove(tag.id)
                        }}
                        className="ml-0.5 p-0.5 rounded hover:bg-black/10"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { TAG_COLOR_CLASSES }
