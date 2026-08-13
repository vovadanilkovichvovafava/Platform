"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Check, RefreshCw, X } from "lucide-react"

export interface FolderFormData {
  id?: string
  name: string
  description: string
}

interface FolderEditModalProps {
  open: boolean
  mode: "create" | "edit"
  folder: FolderFormData | null
  onClose: () => void
  onSubmit: (data: FolderFormData) => Promise<void>
}

export function FolderEditModal({
  open,
  mode,
  folder,
  onClose,
  onSubmit,
}: FolderEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FolderFormData>({ name: "", description: "" })

  useEffect(() => {
    if (open) {
      setForm({
        id: folder?.id,
        name: folder?.name ?? "",
        description: folder?.description ?? "",
      })
    }
  }, [open, folder])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const submit = async () => {
    if (!form.name.trim()) return
    try {
      setLoading(true)
      await onSubmit({
        id: form.id,
        name: form.name.trim(),
        description: form.description.trim(),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{mode === "create" ? "Новая папка" : "Редактировать папку"}</CardTitle>
            <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="folderName">Название *</Label>
            <Input
              id="folderName"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Например: Маркетинг"
              maxLength={120}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="folderDescription">Описание</Label>
            <Textarea
              id="folderDescription"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Для чего эта папка"
              rows={4}
              maxLength={500}
              className="resize-y"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={submit} disabled={!form.name.trim() || loading}>
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {mode === "create" ? "Создать" : "Сохранить"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
