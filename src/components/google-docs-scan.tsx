"use client"

/**
 * Google Docs Scanner UI component.
 * Displays scan results for a submission's Google Docs/Drive link.
 * Shows initial scan (immutable) and optional re-scan in separate blocks.
 * Isolated feature — does not affect existing components.
 */
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LocalDate } from "@/components/local-date"
import {
  FileText,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet,
  Presentation,
  Folder,
  File,
  Eye,
} from "lucide-react"
import type { GoogleDocsScanDTO, GoogleDocsScanData, ScanStatus } from "@/lib/google-docs-scanner/types"

interface Props {
  submissionId: string
  initialData: GoogleDocsScanDTO | null
}

const POLL_INTERVAL = 5000

export function GoogleDocsScan({ submissionId, initialData }: Props) {
  const [scan, setScan] = useState<GoogleDocsScanDTO | null>(initialData)
  const [isTriggering, setIsTriggering] = useState(false)
  const [pollError, setPollError] = useState<string | null>(null)

  const hasNoScan = !scan
  const isInitialProcessing =
    scan?.status === "pending" || scan?.status === "processing"
  const isRescanProcessing =
    scan?.rescanStatus === "pending" || scan?.rescanStatus === "processing"
  const isAnyProcessing = isInitialProcessing || isRescanProcessing

  // Poll while any scan is processing
  useEffect(() => {
    if (!isAnyProcessing) return

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/submissions/${submissionId}/google-docs-scan`
        )
        if (!res.ok) return
        const data = await res.json()
        if (data.scan) {
          setScan(data.scan)
          setPollError(null)
        }
      } catch {
        setPollError("Ошибка при загрузке статуса")
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL)
    poll()

    return () => clearInterval(interval)
  }, [submissionId, isAnyProcessing])

  const triggerScan = useCallback(
    async (rescan?: boolean) => {
      setIsTriggering(true)
      setPollError(null)
      try {
        const res = await fetch(
          `/api/submissions/${submissionId}/google-docs-scan`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rescan: rescan ?? false }),
          }
        )
        if (res.ok) {
          setScan((prev) => {
            if (!prev) {
              return {
                id: "",
                submissionId,
                status: "processing",
                initialScan: null,
                rescan: null,
                rescanStatus: null,
                errorMessage: null,
                rescanError: null,
                scannedAt: null,
                rescannedAt: null,
              }
            }
            if (rescan) {
              return { ...prev, rescanStatus: "processing", rescanError: null }
            }
            return { ...prev, status: "processing", errorMessage: null }
          })
        }
      } catch {
        setPollError("Не удалось запустить сканирование")
      } finally {
        setIsTriggering(false)
      }
    },
    [submissionId]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Сканирование Google Документа
          {scan && <StatusBadge status={scan.status} />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* No scan exists — show trigger button */}
        {hasNoScan && !isTriggering && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Сканирование документа ещё не проводилось.
            </p>
            <button
              onClick={() => triggerScan()}
              disabled={isTriggering}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              Запустить сканирование
            </button>
          </div>
        )}

        {/* Processing indicator */}
        {(isInitialProcessing || (hasNoScan && isTriggering)) && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Сканирование документа...
            </p>
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-3 rounded bg-gray-200 dark:bg-slate-700 animate-pulse"
                  style={{ width: `${60 + i * 20}px` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Initial scan failed */}
        {scan?.status === "failed" && !scan.initialScan && (
          <div className="space-y-3">
            <p className="text-sm text-red-600">
              {scan.errorMessage || "Сканирование завершилось с ошибкой."}
            </p>
            <button
              onClick={() => triggerScan()}
              disabled={isTriggering}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {isTriggering ? "Запускаю..." : "Повторить сканирование"}
            </button>
          </div>
        )}

        {/* Initial scan completed */}
        {scan?.status === "completed" && scan.initialScan && (
          <div className="space-y-6">
            {/* Block 1: Initial scan (immutable) */}
            <ScanBlock
              title="Первичное сканирование"
              data={scan.initialScan}
              timestamp={scan.scannedAt}
            />

            {/* Re-scan section */}
            {scan.rescanStatus === "processing" && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Повторное сканирование
                </h4>
                <div className="flex gap-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-3 rounded bg-gray-200 dark:bg-slate-700 animate-pulse"
                      style={{ width: `${60 + i * 20}px` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Re-scan failed */}
            {scan.rescanStatus === "failed" && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Повторное сканирование
                </h4>
                <p className="text-sm text-red-600">
                  {scan.rescanError || "Повторное сканирование завершилось с ошибкой."}
                </p>
              </div>
            )}

            {/* Block 2: Re-scan results */}
            {scan.rescanStatus === "completed" && scan.rescan && (
              <div className="border-t pt-4">
                <ScanBlock
                  title="Повторное сканирование"
                  data={scan.rescan}
                  timestamp={scan.rescannedAt}
                  compareWith={scan.initialScan}
                />
              </div>
            )}

            {/* Re-scan button */}
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Повторное сканирование покажет актуальное состояние документа
              </p>
              <button
                onClick={() => triggerScan(true)}
                disabled={isTriggering || isRescanProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isRescanProcessing ? "animate-spin" : ""}`} />
                {isTriggering || isRescanProcessing
                  ? "Сканирую..."
                  : "Запустить повторное сканирование"}
              </button>
            </div>
          </div>
        )}

        {pollError && (
          <p className="text-xs text-red-500 mt-2">{pollError}</p>
        )}
      </CardContent>
    </Card>
  )
}

// --- Sub-components ---

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Ожидание",
      className:
        "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-0",
    },
    processing: {
      label: "Сканирование...",
      className:
        "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-0",
    },
    completed: {
      label: "Готово",
      className:
        "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-0",
    },
    failed: {
      label: "Ошибка",
      className:
        "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-0",
    },
  }
  const c = config[status] ?? config.pending
  return <Badge className={c.className}>{c.label}</Badge>
}

function UrlTypeBadge({ urlType }: { urlType: string }) {
  const config: Record<
    string,
    { label: string; icon: React.ReactNode; className: string }
  > = {
    document: {
      label: "Документ",
      icon: <FileText className="h-3 w-3" />,
      className: "bg-blue-100 dark:bg-blue-950 text-blue-700 border-0",
    },
    spreadsheet: {
      label: "Таблица",
      icon: <FileSpreadsheet className="h-3 w-3" />,
      className: "bg-green-100 dark:bg-green-950 text-green-700 border-0",
    },
    presentation: {
      label: "Презентация",
      icon: <Presentation className="h-3 w-3" />,
      className: "bg-orange-100 dark:bg-orange-950 text-orange-700 border-0",
    },
    folder: {
      label: "Папка",
      icon: <Folder className="h-3 w-3" />,
      className: "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 border-0",
    },
    file: {
      label: "Файл",
      icon: <File className="h-3 w-3" />,
      className: "bg-purple-100 dark:bg-purple-950 text-purple-700 border-0",
    },
    unknown: {
      label: "Неизвестный тип",
      icon: <AlertTriangle className="h-3 w-3" />,
      className: "bg-gray-100 dark:bg-slate-800 text-gray-600 border-0",
    },
  }
  const c = config[urlType] ?? config.unknown
  return (
    <Badge className={`inline-flex items-center gap-1 ${c.className}`}>
      {c.icon}
      {c.label}
    </Badge>
  )
}

interface ScanBlockProps {
  title: string
  data: GoogleDocsScanData
  timestamp: string | null
  compareWith?: GoogleDocsScanData
}

function ScanBlock({ title, data, timestamp, compareWith }: ScanBlockProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300">
          {title}
        </h4>
        {timestamp && (
          <span className="text-xs text-gray-400 dark:text-slate-500">
            <LocalDate date={timestamp} format="short" />
          </span>
        )}
      </div>

      {/* Access error */}
      {data.accessError && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {data.accessError}
          </div>
        </div>
      )}

      {/* Title and type */}
      <div className="flex flex-wrap items-center gap-2">
        <UrlTypeBadge urlType={data.urlType} />
        {data.title && (
          <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
            {data.title}
          </span>
        )}
      </div>

      {/* Content metrics */}
      {data.wordCount !== null && (
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Слов"
            value={data.wordCount}
            compare={compareWith?.wordCount}
          />
          <MetricCard
            label="Символов"
            value={data.characterCount ?? 0}
            compare={compareWith?.characterCount}
          />
          <MetricCard
            label="Строк"
            value={data.lineCount ?? 0}
            compare={compareWith?.lineCount}
          />
        </div>
      )}

      {/* Empty document warning */}
      {data.isEmpty && !data.accessError && (
        <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">
            Документ пуст или не содержит текстового контента.
          </p>
        </div>
      )}

      {/* Iframe embed preview */}
      {data.embedUrl && (
        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
          <iframe
            src={data.embedUrl}
            className="w-full"
            style={{ height: "400px" }}
            title={`Предпросмотр: ${data.title || "Google Документ"}`}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  compare,
}: {
  label: string
  value: number
  compare?: number | null
}) {
  const delta = compare != null ? value - compare : null

  return (
    <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg text-center">
      <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
        {value.toLocaleString("ru-RU")}
      </div>
      <div className="text-xs text-gray-500 dark:text-slate-400">{label}</div>
      {delta !== null && delta !== 0 && (
        <div
          className={`text-xs mt-1 ${
            delta > 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {delta > 0 ? "+" : ""}
          {delta.toLocaleString("ru-RU")}
        </div>
      )}
    </div>
  )
}
