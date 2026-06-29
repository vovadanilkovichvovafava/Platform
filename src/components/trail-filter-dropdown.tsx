"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { BookOpen, ChevronDown, X, Search } from "lucide-react"

interface TrailFilterOption {
  id: string
  title: string
  count: number
}

interface TrailFilterDropdownProps {
  trails: TrailFilterOption[]
  selectedTrailIds: string[]
  onChange: (ids: string[]) => void
  matchMode: "any" | "all"
  onMatchModeChange: (mode: "any" | "all") => void
}

export function TrailFilterDropdown({
  trails,
  selectedTrailIds,
  onChange,
  matchMode,
  onMatchModeChange,
}: TrailFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  // Anchors the panel and detects "click outside" together with the panel itself.
  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Position the panel just below the trigger. The panel is rendered in a portal
  // with position:fixed so it escapes the users-list card's `overflow-hidden`
  // clipping ("зона выгрузки") instead of being cut off when the list is short.
  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({ top: rect.bottom + 4, left: rect.left })
  }, [])

  // Keep the panel glued to the trigger while open as the page scrolls/resizes.
  // The initial position is computed in handleToggle before opening, so the
  // effect only needs to subscribe to scroll/resize updates.
  useEffect(() => {
    if (!isOpen) return
    const handle = () => updatePosition()
    window.addEventListener("scroll", handle, true)
    window.addEventListener("resize", handle)
    return () => {
      window.removeEventListener("scroll", handle, true)
      window.removeEventListener("resize", handle)
    }
  }, [isOpen, updatePosition])

  // Close on outside click. The panel lives in a portal (outside triggerRef),
  // so both refs must be checked.
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  const handleToggle = () => {
    if (!isOpen) updatePosition()
    setIsOpen((prev) => !prev)
  }

  // Sort trails by count desc, then filter by search query
  const visibleTrails = [...trails]
    .sort((a, b) => b.count - a.count)
    .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))

  const toggleTrail = (trailId: string) => {
    if (selectedTrailIds.includes(trailId)) {
      onChange(selectedTrailIds.filter((id) => id !== trailId))
    } else {
      onChange([...selectedTrailIds, trailId])
    }
  }

  const selectedCount = selectedTrailIds.length

  return (
    <div className="relative" ref={triggerRef}>
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
          selectedCount > 0 ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300" : ""
        }`}
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span>Трейлы{selectedCount > 0 ? ` (${selectedCount})` : ""}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {selectedCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onChange([])
          }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-gray-400 hover:bg-gray-500 text-white rounded-full flex items-center justify-center"
          title="Сбросить фильтр по трейлам"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}

      {/* Rendered in a portal so the menu is never clipped by the users-list
          card's `overflow-hidden`. `isOpen` is always false during SSR/hydration,
          so document.body is only touched after a client-side click. */}
      {isOpen && position &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="z-[60] w-56 sm:w-64 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg"
          >
            {/* Search */}
            <div className="p-2 border-b dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Поиск трейла..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 border dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Match mode toggle */}
              {selectedCount > 1 && (
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-[10px] text-gray-400 dark:text-slate-500">Совпадение:</span>
                  <button
                    type="button"
                    onClick={() => onMatchModeChange("any")}
                    className={`px-2 py-0.5 rounded text-[10px] border ${
                      matchMode === "any"
                        ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    Любой
                  </button>
                  <button
                    type="button"
                    onClick={() => onMatchModeChange("all")}
                    className={`px-2 py-0.5 rounded text-[10px] border ${
                      matchMode === "all"
                        ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    Все
                  </button>
                </div>
              )}
            </div>

            {/* Trail list */}
            <div className="max-h-56 overflow-auto">
              {visibleTrails.length === 0 ? (
                <div className="p-3 text-gray-500 dark:text-slate-400 text-xs text-center">
                  {trails.length === 0 ? "Нет трейлов" : "Ничего не найдено"}
                </div>
              ) : (
                visibleTrails.map((trail) => {
                  const isSelected = selectedTrailIds.includes(trail.id)
                  return (
                    <button
                      key={trail.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleTrail(trail.id)
                      }}
                      className={`w-full text-left px-3 py-2 text-xs border-b last:border-b-0 dark:border-slate-700 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800 ${
                        isSelected ? "bg-blue-50 dark:bg-blue-950" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 pointer-events-none shrink-0"
                      />
                      <span className="truncate">{trail.title}</span>
                      <span className="ml-auto text-gray-400 dark:text-slate-500 text-[10px] shrink-0">{trail.count}</span>
                    </button>
                  )
                })
              )}
            </div>

            {selectedCount > 0 && (
              <div className="border-t dark:border-slate-700 p-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange([])
                  }}
                  className="w-full text-center text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 py-1"
                >
                  Сбросить фильтр
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
