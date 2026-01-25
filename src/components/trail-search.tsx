"use client"

import { useState, useMemo } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { TrailCard } from "@/components/trail-card"

interface Trail {
  id: string
  title: string
  slug: string
  subtitle: string
  description: string
  icon: string
  color: string
  duration: string
  modules: { id: string }[]
}

interface TrailSearchProps {
  trails: Trail[]
  enrolledTrailIds: string[]
  progressMap: Record<string, number>
}

export function TrailSearch({ trails, enrolledTrailIds, progressMap }: TrailSearchProps) {
  const [search, setSearch] = useState("")

  const filteredTrails = useMemo(() => {
    if (!search.trim()) return trails

    const searchLower = search.toLowerCase()
    return trails.filter(
      (trail) =>
        trail.title.toLowerCase().includes(searchLower) ||
        trail.description?.toLowerCase().includes(searchLower)
    )
  }, [trails, search])

  return (
    <>
      {/* Search Input */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или описанию..."
            className="pl-10 pr-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {search && (
          <p className="mt-2 text-sm text-gray-500">
            Найдено: {filteredTrails.length} из {trails.length}
          </p>
        )}
      </div>

      {/* Trails Grid */}
      {filteredTrails.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredTrails.map((trail) => (
            <TrailCard
              key={trail.id}
              trail={trail}
              enrolled={enrolledTrailIds.includes(trail.id)}
              progress={progressMap[trail.id] || 0}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Ничего не найдено по запросу &quot;{search}&quot;</p>
          <button
            onClick={() => setSearch("")}
            className="mt-2 text-orange-500 hover:underline"
          >
            Сбросить поиск
          </button>
        </div>
      )}
    </>
  )
}
