"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Trash2,
  GripVertical,
  Video,
  Music,
  FileText,
  ChevronDown,
  ChevronUp,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  Check,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ContentBlock, ContentBlockType } from "./types"

interface ContentBlocksEditorProps {
  blocks: ContentBlock[]
  onChange: (blocks: ContentBlock[]) => void
  readOnly?: boolean
}

const VIDEO_ACCEPT = ".mp4,.webm,.mov,.avi,.mkv,.m4v"
const AUDIO_ACCEPT = ".mp3,.wav,.ogg,.m4a,.aac,.flac,.wma,.opus"

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"]
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".wma", ".opus"]

const blockTypeConfig: Record<ContentBlockType, { label: string; icon: typeof Video; color: string; bgColor: string; borderColor: string }> = {
  VIDEO: { label: "Видео", icon: Video, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  AUDIO: { label: "Аудио", icon: Music, color: "text-pink-600", bgColor: "bg-pink-50", borderColor: "border-pink-200" },
  TEXT: { label: "Текст", icon: FileText, color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-200" },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`
}

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".")
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : ""
}

export function ContentBlocksEditor({ blocks, onChange, readOnly = false }: ContentBlocksEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const addBlock = (type: ContentBlockType) => {
    const newBlock: ContentBlock = {
      type,
      url: null,
      fileKey: null,
      fileName: null,
      fileSize: null,
      mimeType: null,
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
    const block = blocks[index]
    // Delete file from storage if it exists
    if (block.fileKey) {
      fetch("/api/admin/upload/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey: block.fileKey }),
      }).catch(console.error)
    }
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

  const validateFile = (file: File, blockType: ContentBlockType): string | null => {
    const ext = getExtension(file.name)
    if (blockType === "VIDEO") {
      if (!VIDEO_EXTENSIONS.includes(ext)) {
        return `Недопустимый формат видео: ${ext}. Допустимые: ${VIDEO_EXTENSIONS.join(", ")}`
      }
      if (file.size > 500 * 1024 * 1024) {
        return `Видео слишком большое (${formatFileSize(file.size)}). Максимум: 500 МБ`
      }
    } else if (blockType === "AUDIO") {
      if (!AUDIO_EXTENSIONS.includes(ext)) {
        return `Недопустимый формат аудио: ${ext}. Допустимые: ${AUDIO_EXTENSIONS.join(", ")}`
      }
      if (file.size > 100 * 1024 * 1024) {
        return `Аудио слишком большое (${formatFileSize(file.size)}). Максимум: 100 МБ`
      }
    }
    return null
  }

  const handleFileUpload = async (index: number, file: File) => {
    const block = blocks[index]
    const validationError = validateFile(file, block.type)
    if (validationError) {
      setUploadError(validationError)
      return
    }

    setUploadError(null)
    setUploadingIndex(index)

    try {
      // Delete old file if replacing
      if (block.fileKey) {
        await fetch("/api/admin/upload/media", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKey: block.fileKey }),
        }).catch(console.error)
      }

      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", block.type)

      const res = await fetch("/api/admin/upload/media", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Ошибка загрузки")
      }

      const data = await res.json()
      updateBlock(index, {
        url: data.url,
        fileKey: data.fileKey,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Ошибка загрузки файла")
    } finally {
      setUploadingIndex(null)
    }
  }

  const handleFileDropZone = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(index, files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(index, files[0])
    }
    // Reset input so same file can be selected again
    e.target.value = ""
  }

  const changeBlockType = (index: number, newType: ContentBlockType) => {
    if (readOnly) return
    const block = blocks[index]
    if (block.type === newType) return

    // Clear file data when switching away from media types
    if ((block.type === "VIDEO" || block.type === "AUDIO") && block.fileKey) {
      fetch("/api/admin/upload/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey: block.fileKey }),
      }).catch(console.error)
    }

    const updates: Partial<ContentBlock> = {
      type: newType,
      url: null,
      fileKey: null,
      fileName: null,
      fileSize: null,
      mimeType: null,
    }

    if (newType === "TEXT") {
      updates.description = null
      updates.content = block.content || block.description || ""
    } else {
      updates.content = null
      updates.description = block.description || block.content || ""
    }

    updateBlock(index, updates)
  }

  const removeFile = (index: number) => {
    const block = blocks[index]
    if (block.fileKey) {
      fetch("/api/admin/upload/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey: block.fileKey }),
      }).catch(console.error)
    }
    updateBlock(index, {
      url: null,
      fileKey: null,
      fileName: null,
      fileSize: null,
      mimeType: null,
    })
  }

  return (
    <div className="space-y-4">
      {/* Upload error */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0 cursor-pointer" onClick={() => setUploadError(null)} />
          <p className="text-sm text-red-600">{uploadError}</p>
        </div>
      )}

      {/* Block list */}
      {blocks.map((block, index) => {
        const config = blockTypeConfig[block.type]
        const Icon = config.icon
        const isDragged = draggedIndex === index
        const isDragOver = dragOverIndex === index
        const isUploading = uploadingIndex === index

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
              {!readOnly ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      <Icon className={`h-4 w-4 ${config.color} shrink-0`} />
                      <span className={`text-sm font-medium ${config.color}`}>
                        {config.label}
                      </span>
                      <ChevronDown className="h-3 w-3 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    {(Object.entries(blockTypeConfig) as [ContentBlockType, typeof config][]).map(([type, cfg]) => {
                      const TypeIcon = cfg.icon
                      return (
                        <DropdownMenuItem
                          key={type}
                          onClick={() => changeBlockType(index, type)}
                          className="flex items-center gap-2"
                        >
                          <TypeIcon className={`h-4 w-4 ${cfg.color}`} />
                          <span>{cfg.label}</span>
                          {block.type === type && (
                            <Check className="h-3 w-3 ml-auto text-green-500" />
                          )}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-4 w-4 ${config.color} shrink-0`} />
                  <span className={`text-sm font-medium ${config.color}`}>
                    {config.label}
                  </span>
                </div>
              )}
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

              {/* VIDEO / AUDIO: File upload zone */}
              {(block.type === "VIDEO" || block.type === "AUDIO") && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Файл {block.type === "VIDEO" ? "видео" : "аудио"}
                    </label>

                    {block.fileKey && block.url ? (
                      /* File already uploaded */
                      <div className={`border rounded-lg p-3 ${config.bgColor} ${config.borderColor}`}>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{block.fileName || "Загруженный файл"}</p>
                            <p className="text-xs text-gray-500">
                              {block.fileSize ? formatFileSize(block.fileSize) : ""}{" "}
                              {block.mimeType ? `• ${block.mimeType}` : ""}
                            </p>
                          </div>
                          {!readOnly && (
                            <Button
                              size="sm"
                              variant="ghost-destructive"
                              className="shrink-0"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Удалить
                            </Button>
                          )}
                        </div>
                        {/* Preview */}
                        {block.type === "VIDEO" && (
                          <video controls className="w-full rounded-lg mt-3 max-h-48" preload="metadata">
                            <source src={block.url} type={block.mimeType || undefined} />
                          </video>
                        )}
                        {block.type === "AUDIO" && (
                          <audio controls className="w-full mt-3" preload="metadata">
                            <source src={block.url} type={block.mimeType || undefined} />
                          </audio>
                        )}
                      </div>
                    ) : isUploading ? (
                      /* Upload in progress */
                      <div className="border-2 border-dashed rounded-lg p-8 text-center border-blue-300 bg-blue-50">
                        <Loader2 className="h-8 w-8 mx-auto mb-2 text-blue-500 animate-spin" />
                        <p className="text-sm text-blue-600 font-medium">Загрузка файла...</p>
                        <p className="text-xs text-blue-500 mt-1">Это может занять некоторое время</p>
                      </div>
                    ) : (
                      /* Drop zone */
                      <div
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                        onDrop={(e) => handleFileDropZone(e, index)}
                        onClick={() => !readOnly && fileInputRefs.current[index]?.click()}
                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                          readOnly
                            ? "border-gray-200 bg-gray-50 cursor-default"
                            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
                        }`}
                      >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          Перетащите {block.type === "VIDEO" ? "видеофайл" : "аудиофайл"} сюда
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          или нажмите для выбора файла
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {block.type === "VIDEO"
                            ? `Форматы: ${VIDEO_EXTENSIONS.join(", ")} • Макс. 500 МБ`
                            : `Форматы: ${AUDIO_EXTENSIONS.join(", ")} • Макс. 100 МБ`
                          }
                        </p>
                        <input
                          ref={(el) => { fileInputRefs.current[index] = el }}
                          type="file"
                          accept={block.type === "VIDEO" ? VIDEO_ACCEPT : AUDIO_ACCEPT}
                          className="hidden"
                          onChange={(e) => handleFileInput(e, index)}
                          disabled={readOnly}
                        />
                      </div>
                    )}
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
