"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Search, Plus, ChevronDown } from "lucide-react"
import { TAG_COLOR_CLASSES } from "@/components/student-tags-badges"

interface TagOption {
  id: string
  name: string
  color: string
}

const COLOR_OPTIONS = [
  { value: "gray", label: "Серый", dot: "bg-gray-400" },
  { value: "blue", label: "Синий", dot: "bg-blue-400" },
  { value: "green", label: "Зелёный", dot: "bg-green-400" },
  { value: "red", label: "Красный", dot: "bg-red-400" },
  { value: "purple", label: "Фиолетовый", dot: "bg-purple-400" },
  { value: "amber", label: "Жёлтый", dot: "bg-amber-400" },
  { value: "pink", label: "Розовый", dot: "bg-pink-400" },
]

interface TagAssignDropdownProps {
  availableTags: TagOption[]
  assignedTagIds: string[]
  onAssign: (tagId: string) => void
  onCreateAndAssign: (name: string, color: string) => void
}

export function TagAssignDropdown({
  availableTags,
  assignedTagIds,
  onAssign,
  onCreateAndAssign,
}: TagAssignDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [newTagColor, setNewTagColor] = useState("gray")
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch("")
        setNewTagColor("gray")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  const filteredTags = availableTags
    .filter((t) => !assignedTagIds.includes(t.id))
    .filter((t) =>
      search ? t.name.toLowerCase().includes(search.toLowerCase()) : true
    )

  const hasExactMatch = availableTags.some(
    (t) => t.name.toLowerCase() === search.trim().toLowerCase()
  )
  const showCreateOption = search.trim().length > 0 && !hasExactMatch

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(!isOpen)
          setSearch("")
          setNewTagColor("gray")
        }}
        className="text-xs gap-1"
      >
        <Plus className="h-3 w-3" />
        Добавить тег
        <ChevronDown className="h-3 w-3" />
      </Button>

      {isOpen && (
        <div className="absolute z-30 w-64 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-auto">
          {/* Search */}
          <div className="p-2 border-b sticky top-0 bg-white z-10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск или создать тег..."
                className="w-full py-1 pl-7 pr-2 text-xs border rounded"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Existing tags list */}
          {filteredTags.length === 0 && !showCreateOption ? (
            <div className="p-3 text-gray-500 text-xs text-center">
              {search ? "Не найдено" : "Все теги уже назначены"}
            </div>
          ) : (
            <>
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onAssign(tag.id)
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-xs border-b last:border-b-0 flex items-center gap-2"
                >
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      COLOR_OPTIONS.find((c) => c.value === tag.color)?.dot || "bg-gray-400"
                    }`}
                  />
                  <span className="font-medium">{tag.name}</span>
                </button>
              ))}
            </>
          )}

          {/* Create new tag option */}
          {showCreateOption && (
            <div className="border-t">
              <div className="px-3 py-2">
                <p className="text-xs text-gray-500 mb-1.5">Создать новый тег:</p>
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setNewTagColor(c.value)
                      }}
                      className={`w-5 h-5 rounded-full ${c.dot} ${
                        newTagColor === c.value
                          ? "ring-2 ring-offset-1 ring-gray-400"
                          : "hover:ring-1 hover:ring-offset-1 hover:ring-gray-300"
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onCreateAndAssign(search.trim(), newTagColor)
                    setSearch("")
                    setNewTagColor("gray")
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium hover:opacity-80 transition-opacity border ${
                    TAG_COLOR_CLASSES[newTagColor] || TAG_COLOR_CLASSES.gray
                  }`}
                >
                  + Создать &ldquo;{search.trim()}&rdquo;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
