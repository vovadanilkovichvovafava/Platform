"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/toast"

interface ExportStatsButtonProps {
  studentId?: string
  studentName?: string
}

export function ExportStatsButton({ studentId, studentName }: ExportStatsButtonProps) {
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const handleExport = async () => {
    setLoading(true)
    try {
      const url = studentId
        ? `/api/teacher/export-stats?studentId=${studentId}`
        : "/api/teacher/export-stats"
      const response = await fetch(url)
      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      const filename = studentName
        ? `${studentName.replace(/\s+/g, "-")}-works-${new Date().toISOString().split("T")[0]}.csv`
        : `students-works-${new Date().toISOString().split("T")[0]}.csv`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(blobUrl)
      document.body.removeChild(a)
      showToast("Экспорт завершён", "success")
    } catch (error) {
      console.error("Export error:", error)
      showToast("Ошибка экспорта", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleExport} disabled={loading} variant="outline">
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Экспорт работ
    </Button>
  )
}
