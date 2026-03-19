"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Search, Plus, ChevronDown, Pencil, Trash2, Check, X } from "lucide-react"
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
  onEditTag?: (tagId: string, name: string, color: string) => void
  onDeleteTag?: (tagId: string) => void
}

export function TagAssignDropdown({
  availableTags,
  assignedTagIds,
  onAssign,
  onCreateAndAssign,
  onEditTag,
  onDeleteTag,
}: TagAssignDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [newTagColor, setNewTagColor] = useState("gray")
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("gray")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch("")
        setNewTagColor("gray")
        setEditingTagId(null)
        setConfirmDeleteId(null)
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

  const startEdit = (tag: TagOption) => {
    setEditingTagId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
    setConfirmDeleteId(null)
  }

  const cancelEdit = () => {
    setEditingTagId(null)
    setEditName("")
    setEditColor("gray")
  }

  const saveEdit = () => {
    if (editingTagId && editName.trim() && onEditTag) {
      onEditTag(editingTagId, editName.trim(), editColor)
      setEditingTagId(null)
    }
  }

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
          setEditingTagId(null)
          setConfirmDeleteId(null)
        }}
        className="text-xs gap-1"
      >
        <Plus className="h-3 w-3" />
        Добавить тег
        <ChevronDown className="h-3 w-3" />
      </Button>

      {isOpen && (
        <div className="absolute z-30 left-0 w-56 sm:w-72 mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-auto">
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
              {filteredTags.map((tag) => {
                // Edit mode for this tag
                if (editingTagId === tag.id) {
                  return (
                    <div key={tag.id} className="px-3 py-2 border-b last:border-b-0 bg-gray-50">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full py-1 px-2 text-xs border rounded mb-1.5"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit()
                          if (e.key === "Escape") cancelEdit()
                        }}
                      />
                      <div className="flex items-center gap-1 mb-1.5">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setEditColor(c.value)
                            }}
                            className={`w-4 h-4 rounded-full ${c.dot} ${
                              editColor === c.value
                                ? "ring-2 ring-offset-1 ring-gray-400"
                                : "hover:ring-1 hover:ring-offset-1 hover:ring-gray-300"
                            }`}
                            title={c.label}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            saveEdit()
                          }}
                          className="flex items-center gap-0.5 px-2 py-0.5 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          <Check className="h-3 w-3" /> Сохранить
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            cancelEdit()
                          }}
                          className="flex items-center gap-0.5 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          <X className="h-3 w-3" /> Отмена
                        </button>
                      </div>
                    </div>
                  )
                }

                // Confirm delete mode
                if (confirmDeleteId === tag.id) {
                  return (
                    <div key={tag.id} className="px-3 py-2 border-b last:border-b-0 bg-red-50">
                      <p className="text-xs text-red-700 mb-1.5">
                        Удалить тег &laquo;{tag.name}&raquo;? Он будет убран у всех студентов.
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onDeleteTag?.(tag.id)
                            setConfirmDeleteId(null)
                          }}
                          className="flex items-center gap-0.5 px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          <Trash2 className="h-3 w-3" /> Удалить
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setConfirmDeleteId(null)
                          }}
                          className="flex items-center gap-0.5 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )
                }

                // Normal tag row
                return (
                  <div
                    key={tag.id}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-xs border-b last:border-b-0 flex items-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onAssign(tag.id)
                      }}
                      className="flex items-center gap-2 flex-1 min-w-0"
                    >
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
                          COLOR_OPTIONS.find((c) => c.value === tag.color)?.dot || "bg-gray-400"
                        }`}
                      />
                      <span className="font-medium truncate">{tag.name}</span>
                    </button>
                    {(onEditTag || onDeleteTag) && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {onEditTag && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              startEdit(tag)
                            }}
                            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                            title="Редактировать тег"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                        {onDeleteTag && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setConfirmDeleteId(tag.id)
                              setEditingTagId(null)
                            }}
                            className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
                            title="Удалить тег"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* Also show assigned tags with edit/delete (but not assign button) */}
          {(onEditTag || onDeleteTag) && (() => {
            const assignedTags = availableTags
              .filter((t) => assignedTagIds.includes(t.id))
              .filter((t) => search ? t.name.toLowerCase().includes(search.toLowerCase()) : true)
            if (assignedTags.length === 0) return null
            return (
              <>
                <div className="px-3 py-1.5 bg-gray-50 border-t border-b">
                  <span className="text-xs text-gray-400">Назначенные</span>
                </div>
                {assignedTags.map((tag) => {
                  if (editingTagId === tag.id) {
                    return (
                      <div key={tag.id} className="px-3 py-2 border-b last:border-b-0 bg-gray-50">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full py-1 px-2 text-xs border rounded mb-1.5"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit()
                            if (e.key === "Escape") cancelEdit()
                          }}
                        />
                        <div className="flex items-center gap-1 mb-1.5">
                          {COLOR_OPTIONS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setEditColor(c.value)
                              }}
                              className={`w-4 h-4 rounded-full ${c.dot} ${
                                editColor === c.value
                                  ? "ring-2 ring-offset-1 ring-gray-400"
                                  : "hover:ring-1 hover:ring-offset-1 hover:ring-gray-300"
                              }`}
                              title={c.label}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveEdit() }}
                            className="flex items-center gap-0.5 px-2 py-0.5 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            <Check className="h-3 w-3" /> Сохранить
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); cancelEdit() }}
                            className="flex items-center gap-0.5 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            <X className="h-3 w-3" /> Отмена
                          </button>
                        </div>
                      </div>
                    )
                  }
                  if (confirmDeleteId === tag.id) {
                    return (
                      <div key={tag.id} className="px-3 py-2 border-b last:border-b-0 bg-red-50">
                        <p className="text-xs text-red-700 mb-1.5">
                          Удалить тег &laquo;{tag.name}&raquo;? Он будет убран у всех студентов.
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteTag?.(tag.id); setConfirmDeleteId(null) }}
                            className="flex items-center gap-0.5 px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            <Trash2 className="h-3 w-3" /> Удалить
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(null) }}
                            className="flex items-center gap-0.5 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div
                      key={tag.id}
                      className="w-full text-left px-3 py-2 text-xs border-b last:border-b-0 flex items-center gap-2 opacity-60"
                    >
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
                          COLOR_OPTIONS.find((c) => c.value === tag.color)?.dot || "bg-gray-400"
                        }`}
                      />
                      <span className="font-medium truncate flex-1">{tag.name}</span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {onEditTag && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(tag) }}
                            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                            title="Редактировать тег"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                        {onDeleteTag && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(tag.id); setEditingTagId(null) }}
                            className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
                            title="Удалить тег"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </>
            )
          })()}

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

export { COLOR_OPTIONS }
