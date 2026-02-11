"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  History,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  List,
} from "lucide-react"
import {
  PER_PAGE_OPTIONS,
  type PerPageOption,
  getUrlParams,
  parsePageParam,
  parsePerPageParam,
  updateUrl,
} from "@/lib/url-state"

interface AuditLog {
  id: string
  userName: string
  action: string
  entityType: string
  entityName: string
  createdAt: string
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATE: { label: "Создание", color: "bg-green-100 text-green-700" },
  UPDATE: { label: "Изменение", color: "bg-blue-100 text-blue-700" },
  DELETE: { label: "Удаление", color: "bg-red-100 text-red-700" },
  REORDER: { label: "Сортировка", color: "bg-purple-100 text-purple-700" },
}

const FILTER_DEFAULTS = { page: "1", perPage: "50" }

export default function AdminHistoryPage() {
  const pathname = usePathname()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<PerPageOption>(50)
  const [totalPages, setTotalPages] = useState(1)

  // Read initial values from URL
  useEffect(() => {
    const params = getUrlParams()
    const initialPage = parsePageParam(params.get("page"), 1)
    const initialPerPage = parsePerPageParam(params.get("perPage"), 50)
    setPage(initialPage)
    setPerPage(initialPerPage)
  }, [])

  const syncUrl = useCallback(
    (params: { page: number; perPage: number }) => {
      updateUrl(
        pathname,
        { page: String(params.page), perPage: String(params.perPage) },
        FILTER_DEFAULTS,
      )
    },
    [pathname],
  )

  const fetchLogs = useCallback(async (pageNum: number, limit: number) => {
    try {
      setLoading(true)
      const offset = (pageNum - 1) * limit
      const res = await fetch(`/api/admin/audit-logs?limit=${limit}&offset=${offset}`)
      if (!res.ok) throw new Error("Failed to fetch")

      const data = await res.json()

      // Handle both array response and paginated response
      if (Array.isArray(data)) {
        setLogs(data)
        setTotalPages(1)
      } else {
        setLogs(data.logs || [])
        setTotalPages(Math.ceil((data.total || 0) / limit) || 1)
      }
    } catch {
      console.error("Failed to fetch audit logs")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch logs when page or perPage changes (skip the first render before URL params are read)
  const [initialized, setInitialized] = useState(false)
  useEffect(() => {
    if (!initialized) {
      // First render: read URL params, then mark as initialized
      const params = getUrlParams()
      const initialPage = parsePageParam(params.get("page"), 1)
      const initialPerPage = parsePerPageParam(params.get("perPage"), 50)
      setPage(initialPage)
      setPerPage(initialPerPage)
      setInitialized(true)
      fetchLogs(initialPage, initialPerPage)
      return
    }
    fetchLogs(page, perPage)
  }, [page, perPage, initialized, fetchLogs])

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage)
      syncUrl({ page: newPage, perPage })
    },
    [perPage, syncUrl],
  )

  const handlePerPageChange = useCallback(
    (value: string) => {
      const newPerPage = parseInt(value, 10) as PerPageOption
      setPerPage(newPerPage)
      setPage(1)
      syncUrl({ page: 1, perPage: newPerPage })
    },
    [syncUrl],
  )

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Breadcrumbs
            items={[
              { label: "Админ", href: "/admin/invites" },
              { label: "Контент", href: "/admin/content" },
              { label: "История" },
            ]}
            className="mb-4"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
                <History className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  История изменений
                </h1>
                <p className="text-gray-600 mt-1">
                  Аудит всех изменений контента
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(perPage)} onValueChange={handlePerPageChange}>
                <SelectTrigger className="w-[140px]">
                  <List className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="На странице" />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option} на стр.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => fetchLogs(page, perPage)}
                variant="outline"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Обновить
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Записи аудита
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-gray-500 text-center py-12">Нет записей</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const actionInfo = ACTION_LABELS[log.action] || {
                    label: log.action,
                    color: "bg-gray-100 text-gray-700",
                  }

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${actionInfo.color}`}
                          >
                            {actionInfo.label}
                          </span>
                          <span className="font-medium text-gray-900">
                            {log.entityName}
                          </span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            {log.entityType}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{log.userName}</span>
                          <span>•</span>
                          <span>{formatDate(log.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination - hidden when total fits in one page */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 px-4">
                  Страница {page} из {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
