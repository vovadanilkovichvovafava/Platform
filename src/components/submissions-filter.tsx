"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Github,
  Globe,
  Eye,
  ClipboardList,
  History,
  Search,
  Filter,
  AlertTriangle,
  Trash2,
  RefreshCw,
} from "lucide-react"

interface Submission {
  id: string
  status: string
  createdAt: string
  updatedAt: string
  githubUrl: string | null
  deployUrl: string | null
  fileUrl: string | null
  user: {
    id?: string
    name: string
    email: string
  }
  module: {
    title: string
    trail: {
      title: string
    }
  }
  review?: {
    score: number
    comment: string | null
    createdAt: string
    reviewer: {
      name: string
    }
  } | null
}

interface SubmissionsFilterProps {
  pendingSubmissions: Submission[]
  reviewedSubmissions: Submission[]
  trails: string[]
}

function getDaysWaiting(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function getDaysWaitingLabel(days: number): { label: string; color: string } {
  if (days === 0) return { label: "Сегодня", color: "bg-green-100 text-green-700" }
  if (days === 1) return { label: "1 день", color: "bg-green-100 text-green-700" }
  if (days <= 3) return { label: `${days} дня`, color: "bg-yellow-100 text-yellow-700" }
  if (days <= 7) return { label: `${days} дней`, color: "bg-orange-100 text-orange-700" }
  return { label: `${days} дней`, color: "bg-red-100 text-red-700" }
}

export function SubmissionsFilter({
  pendingSubmissions,
  reviewedSubmissions,
  trails,
}: SubmissionsFilterProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const [search, setSearch] = useState("")
  const [trailFilter, setTrailFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDeleteSubmission = async (id: string, userName: string, moduleTitle: string) => {
    const confirmed = await confirm({
      title: "Удалить работу?",
      message: `Вы уверены, что хотите удалить работу "${moduleTitle}" от ${userName}? Это действие необратимо. Студент получит уведомление об удалении.`,
      confirmText: "Удалить",
      variant: "danger",
    })

    if (!confirmed) return

    try {
      setDeletingId(id)
      const res = await fetch(`/api/teacher/submissions/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Ошибка удаления")
      }

      showToast("Работа удалена", "success")
      router.refresh() // Refresh to get updated list
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Ошибка при удалении", "error")
    } finally {
      setDeletingId(null)
    }
  }

  const filteredPending = useMemo(() => {
    return pendingSubmissions.filter((sub) => {
      const matchesSearch =
        !search ||
        sub.user.name.toLowerCase().includes(search.toLowerCase()) ||
        sub.user.email.toLowerCase().includes(search.toLowerCase()) ||
        sub.module.title.toLowerCase().includes(search.toLowerCase())
      const matchesTrail =
        trailFilter === "all" || sub.module.trail.title === trailFilter
      return matchesSearch && matchesTrail
    })
  }, [pendingSubmissions, search, trailFilter])

  const filteredReviewed = useMemo(() => {
    return reviewedSubmissions.filter((sub) => {
      const matchesSearch =
        !search ||
        sub.user.name.toLowerCase().includes(search.toLowerCase()) ||
        sub.user.email.toLowerCase().includes(search.toLowerCase()) ||
        sub.module.title.toLowerCase().includes(search.toLowerCase())
      const matchesTrail =
        trailFilter === "all" || sub.module.trail.title === trailFilter
      const matchesStatus =
        statusFilter === "all" || sub.status === statusFilter
      return matchesSearch && matchesTrail && matchesStatus
    })
  }, [reviewedSubmissions, search, trailFilter, statusFilter])

  // Sort pending by days waiting (oldest first)
  const sortedPending = useMemo(() => {
    return [...filteredPending].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [filteredPending])

  return (
    <>
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по имени, email или модулю..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={trailFilter} onValueChange={setTrailFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Trail" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все trails</SelectItem>
                  {trails.map((trail) => (
                    <SelectItem key={trail} value={trail}>
                      {trail}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="APPROVED">Принято</SelectItem>
                  <SelectItem value="REVISION">На доработку</SelectItem>
                  <SelectItem value="FAILED">Провал</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Submissions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Работы на проверку
            {sortedPending.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {sortedPending.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedPending.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {pendingSubmissions.length === 0
                  ? "Все работы проверены!"
                  : "Нет работ по выбранным фильтрам"}
              </h3>
              <p className="text-gray-600">
                {pendingSubmissions.length === 0
                  ? "Новые работы появятся здесь автоматически"
                  : "Попробуйте изменить фильтры"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedPending.map((submission) => {
                const days = getDaysWaiting(submission.createdAt)
                const { label, color } = getDaysWaitingLabel(days)

                return (
                  <div
                    key={submission.id}
                    className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {submission.module.trail.title}
                        </Badge>
                        <Badge className={`${color} border-0`}>
                          <Clock className="h-3 w-3 mr-1" />
                          {label}
                        </Badge>
                        {days >= 3 && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900">
                        {submission.module.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {submission.user.name} ({submission.user.email})
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Отправлено{" "}
                        {new Date(submission.createdAt).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex gap-2">
                        {submission.githubUrl && (
                          <a
                            href={submission.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                          >
                            <Github className="h-4 w-4" />
                          </a>
                        )}
                        {submission.deployUrl && (
                          <a
                            href={submission.deployUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                      </div>

                      <Button asChild>
                        <Link href={`/teacher/reviews/${submission.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Проверить
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteSubmission(
                          submission.id,
                          submission.user.name,
                          submission.module.title
                        )}
                        disabled={deletingId === submission.id}
                        title="Удалить работу (антиспам)"
                      >
                        {deletingId === submission.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History of reviewed submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            История проверок
            {filteredReviewed.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filteredReviewed.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReviewed.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {reviewedSubmissions.length === 0
                ? "Пока нет проверенных работ"
                : "Нет работ по выбранным фильтрам"}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReviewed.map((submission) => (
                <div
                  key={submission.id}
                  className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {submission.module.trail.title}
                      </Badge>
                      <Badge
                        className={
                          submission.status === "APPROVED"
                            ? "bg-green-100 text-green-700 border-0"
                            : submission.status === "FAILED"
                            ? "bg-red-100 text-red-700 border-0"
                            : "bg-orange-100 text-orange-700 border-0"
                        }
                      >
                        {submission.status === "APPROVED" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Принято
                          </>
                        ) : submission.status === "FAILED" ? (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Провал
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            На доработку
                          </>
                        )}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-gray-900">
                      {submission.module.title}
                    </h3>
                    <p className="text-sm text-gray-500">{submission.user.name}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    {submission.review && (
                      <div className="text-center px-4">
                        <div className="text-2xl font-bold text-[#0176D3]">
                          {submission.review.score}/10
                        </div>
                        <div className="text-xs text-gray-500">Оценка</div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {submission.githubUrl && (
                        <a
                          href={submission.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                      {submission.deployUrl && (
                        <a
                          href={submission.deployUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                    </div>

                    <Button asChild variant="outline" size="sm">
                      <Link href={`/teacher/reviews/${submission.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Детали
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
