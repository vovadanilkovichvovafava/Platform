"use client"

import { useState, useRef, useEffect } from "react"
import { Tag, ChevronDown, X } from "lucide-react"
import { TAG_COLOR_CLASSES } from "@/components/student-tags-badges"

interface TagFilterOption {
  id: string
  name: string
  color: string
  count: number
}

interface TagFilterDropdownProps {
  tags: TagFilterOption[]
  selectedTagIds: string[]
  onChange: (ids: string[]) => void
}

export function TagFilterDropdown({
  tags,
  selectedTagIds,
  onChange,
}: TagFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
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

  // Sort tags by count desc
  const sortedTags = [...tags].sort((a, b) => b.count - a.count)

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  const selectedCount = selectedTagIds.length

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm bg-white hover:bg-gray-50 transition-colors ${
          selectedCount > 0 ? "border-blue-300 bg-blue-50 text-blue-700" : ""
        }`}
      >
        <Tag className="h-3.5 w-3.5" />
        <span>Теги{selectedCount > 0 ? ` (${selectedCount})` : ""}</span>
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
          title="Сбросить фильтр по тегам"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}

      {isOpen && (
        <div className="absolute z-30 w-56 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-auto">
          {sortedTags.length === 0 ? (
            <div className="p-3 text-gray-500 text-xs text-center">Нет тегов</div>
          ) : (
            sortedTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleTag(tag.id)
                  }}
                  className={`w-full text-left px-3 py-2 text-xs border-b last:border-b-0 flex items-center gap-2 hover:bg-gray-50 ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 pointer-events-none"
                  />
                  <span
                    className={`inline-flex items-center px-1.5 py-0 rounded text-xs border ${
                      TAG_COLOR_CLASSES[tag.color] || TAG_COLOR_CLASSES.gray
                    }`}
                  >
                    {tag.name}
                  </span>
                  <span className="ml-auto text-gray-400 text-[10px]">{tag.count}</span>
                </button>
              )
            })
          )}

          {selectedCount > 0 && (
            <div className="border-t p-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onChange([])
                }}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-1"
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
