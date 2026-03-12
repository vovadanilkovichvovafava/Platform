"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Plus,
  Trash2,
  GripVertical,
  Video,
  Music,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import type { ContentBlock, ContentBlockType } from "./types"

interface ContentBlocksEditorProps {
  blocks: ContentBlock[]
  onChange: (blocks: ContentBlock[]) => void
  readOnly?: boolean
}

const blockTypeConfig: Record<ContentBlockType, { label: string; icon: typeof Video; color: string; bgColor: string; borderColor: string }> = {
  VIDEO: { label: "Видео", icon: Video, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  AUDIO: { label: "Аудио", icon: Music, color: "text-pink-600", bgColor: "bg-pink-50", borderColor: "border-pink-200" },
  TEXT: { label: "Текст", icon: FileText, color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-200" },
}

export function ContentBlocksEditor({ blocks, onChange, readOnly = false }: ContentBlocksEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const addBlock = (type: ContentBlockType) => {
    const newBlock: ContentBlock = {
      type,
      url: type !== "TEXT" ? "" : null,
      title: "",
      description: type !== "TEXT" ? "" : null,
      content: type === "TEXT" ? "" : null,
      order: blocks.length,
      isNew: true,
    }
    onChange([...blocks, newBlock])
  }

  const updateBlock = (index: number, updates: Partial<ContentBlock>) => {
    const updated = [...blocks]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }

  const removeBlock = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index))
  }

  const moveBlock = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return
      const updated = [...blocks]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      onChange(updated.map((b, i) => ({ ...b, order: i })))
    },
    [blocks, onChange]
  )

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(index))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    const fromIndex = draggedIndex
    setDraggedIndex(null)
    setDragOverIndex(null)
    if (fromIndex !== null && fromIndex !== toIndex) {
      moveBlock(fromIndex, toIndex)
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="space-y-4">
      {/* Block list */}
      {blocks.map((block, index) => {
        const config = blockTypeConfig[block.type]
        const Icon = config.icon
        const isDragged = draggedIndex === index
        const isDragOver = dragOverIndex === index

        return (
          <div
            key={block.id || `new-${index}`}
            draggable={!readOnly}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`border rounded-lg transition-all ${config.borderColor} ${
              isDragged ? "opacity-40" : ""
            } ${isDragOver ? "border-blue-500 border-2 shadow-md" : ""}`}
          >
            {/* Block header */}
            <div className={`flex items-center gap-2 px-3 py-2 ${config.bgColor} rounded-t-lg border-b ${config.borderColor}`}>
              {!readOnly && (
                <GripVertical className="h-4 w-4 text-gray-400 cursor-grab active:cursor-grabbing shrink-0" />
              )}
              <Icon className={`h-4 w-4 ${config.color} shrink-0`} />
              <span className={`text-sm font-medium ${config.color}`}>
                {config.label}
              </span>
              {block.title && (
                <span className="text-xs text-gray-500 truncate">
                  — {block.title}
                </span>
              )}
              <div className="flex-1" />
              {!readOnly && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => moveBlock(index, Math.max(0, index - 1))}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => moveBlock(index, Math.min(blocks.length - 1, index + 1))}
                    disabled={index === blocks.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost-destructive"
                    className="h-6 w-6 p-0"
                    onClick={() => removeBlock(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Block content */}
            <div className="p-3 space-y-3">
              {/* Title (for all block types) */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Заголовок блока (необязательно)
                </label>
                <Input
                  value={block.title || ""}
                  onChange={(e) => updateBlock(index, { title: e.target.value })}
                  placeholder={`Заголовок ${config.label.toLowerCase()}`}
                  className="text-sm"
                  disabled={readOnly}
                />
              </div>

              {/* VIDEO / AUDIO specific fields */}
              {(block.type === "VIDEO" || block.type === "AUDIO") && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      URL {block.type === "VIDEO" ? "видео" : "аудио"}
                    </label>
                    <Input
                      value={block.url || ""}
                      onChange={(e) => updateBlock(index, { url: e.target.value })}
                      placeholder={
                        block.type === "VIDEO"
                          ? "https://youtube.com/watch?v=... или прямая ссылка"
                          : "https://soundcloud.com/... или прямая ссылка"
                      }
                      className="text-sm"
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Описание (Markdown)
                    </label>
                    <textarea
                      value={block.description || ""}
                      onChange={(e) => updateBlock(index, { description: e.target.value })}
                      className="w-full h-24 p-3 font-mono text-sm border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Описание к видео/аудио в формате Markdown..."
                      disabled={readOnly}
                    />
                  </div>
                </>
              )}

              {/* TEXT specific fields */}
              {block.type === "TEXT" && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Контент (Markdown)
                  </label>
                  <textarea
                    value={block.content || ""}
                    onChange={(e) => updateBlock(index, { content: e.target.value })}
                    className="w-full h-96 p-4 font-mono text-sm border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Markdown контент..."
                    disabled={readOnly}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Поддерживается Markdown: # заголовки, **жирный**, - списки
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Empty state */}
      {blocks.length === 0 && (
        <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Нет блоков контента</p>
          <p className="text-xs">Добавьте видео, аудио или текстовый блок</p>
        </div>
      )}

      {/* Add block buttons */}
      {!readOnly && (
        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs text-gray-500">Добавить блок:</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addBlock("VIDEO")}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Video className="h-4 w-4 mr-1" />
            Видео
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addBlock("AUDIO")}
            className="text-pink-600 border-pink-200 hover:bg-pink-50"
          >
            <Music className="h-4 w-4 mr-1" />
            Аудио
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addBlock("TEXT")}
            className="text-gray-600 border-gray-200 hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 mr-1" />
            Текст
          </Button>
        </div>
      )}
    </div>
  )
}
