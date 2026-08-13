"use client"

import { useState, useRef, useEffect } from "react"
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
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

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
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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

      {isOpen && (
        <div className="absolute z-30 left-0 w-56 sm:w-64 mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg">
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
        </div>
      )}
    </div>
  )
}
