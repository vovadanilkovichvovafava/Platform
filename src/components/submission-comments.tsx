"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import {
  MessageSquare,
  Reply,
  Trash2,
  Edit3,
  X,
  Check,
  Loader2,
  CornerDownRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Author {
  id: string
  name: string
  role: string
  avatarUrl: string | null
}

interface Comment {
  id: string
  submissionId: string
  authorId: string
  parentId: string | null
  depth: number
  content: string
  createdAt: string
  updatedAt: string
  author: Author
  replies: Comment[]
}

interface SubmissionCommentsProps {
  submissionId: string
  currentUserId: string
  currentUserRole: string
}

const MAX_DEPTH = 3 // 0-3 = 4 levels

export function SubmissionComments({
  submissionId,
  currentUserId,
  currentUserRole,
}: SubmissionCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")

  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/submissions/${submissionId}/comments`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setComments(data)
    } catch {
      showToast("Ошибка загрузки комментариев", "error")
    } finally {
      setLoading(false)
    }
  }, [submissionId, showToast])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleSubmit = async (parentId?: string) => {
    const content = parentId ? replyContent : newComment
    if (!content.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/submissions/${submissionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), parentId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to post")
      }

      if (parentId) {
        setReplyContent("")
        setReplyingTo(null)
      } else {
        setNewComment("")
      }

      fetchComments()
      showToast("Комментарий добавлен", "success")
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Ошибка отправки",
        "error"
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch(
        `/api/submissions/${submissionId}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editContent.trim() }),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to edit")
      }

      setEditingId(null)
      setEditContent("")
      fetchComments()
      showToast("Комментарий обновлен", "success")
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Ошибка редактирования",
        "error"
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    const confirmed = await confirm({
      title: "Удалить комментарий?",
      message: "Это действие нельзя отменить. Все ответы также будут удалены.",
      confirmText: "Удалить",
      variant: "danger",
    })

    if (!confirmed) return

    try {
      const res = await fetch(
        `/api/submissions/${submissionId}/comments/${commentId}`,
        { method: "DELETE" }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete")
      }

      fetchComments()
      showToast("Комментарий удален", "success")
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Ошибка удаления",
        "error"
      )
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-700">
            Админ
          </span>
        )
      case "TEACHER":
        return (
          <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
            Преподаватель
          </span>
        )
      default:
        return null
    }
  }

  const renderComment = (comment: Comment) => {
    const isAuthor = comment.authorId === currentUserId
    const canDelete = isAuthor || currentUserRole === "ADMIN"
    const canEdit = isAuthor
    const canReply = comment.depth < MAX_DEPTH
    const isEditing = editingId === comment.id
    const isReplying = replyingTo === comment.id

    return (
      <div key={comment.id} className="group">
        <div
          className={cn(
            "p-3 rounded-lg bg-gray-50 border border-gray-100",
            comment.depth > 0 && "ml-6 border-l-2 border-l-gray-200"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-700">
                {comment.author.name.charAt(0).toUpperCase()}
              </div>
              <div className="ml-2">
                <span className="font-medium text-gray-900">
                  {comment.author.name}
                </span>
                {getRoleBadge(comment.author.role)}
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {formatDate(comment.createdAt)}
              {comment.updatedAt !== comment.createdAt && " (изменен)"}
            </span>
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[80px]"
                placeholder="Текст комментария..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleEdit(comment.id)}
                  disabled={submitting || !editContent.trim()}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Сохранить
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null)
                    setEditContent("")
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {canReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-gray-500"
                  onClick={() => {
                    setReplyingTo(isReplying ? null : comment.id)
                    setReplyContent("")
                  }}
                >
                  <Reply className="h-3.5 w-3.5 mr-1" />
                  Ответить
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-gray-500"
                  onClick={() => {
                    setEditingId(comment.id)
                    setEditContent(comment.content)
                  }}
                >
                  <Edit3 className="h-3.5 w-3.5 mr-1" />
                  Редактировать
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(comment.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Удалить
                </Button>
              )}
            </div>
          )}

          {/* Reply form */}
          {isReplying && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-start gap-2">
                <CornerDownRight className="h-4 w-4 text-gray-400 mt-2" />
                <div className="flex-1">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[60px]"
                    placeholder={`Ответить ${comment.author.name}...`}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      onClick={() => handleSubmit(comment.id)}
                      disabled={submitting || !replyContent.trim()}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Отправить"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReplyingTo(null)
                        setReplyContent("")
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Render replies */}
        {comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map((reply) => renderComment(reply))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const totalComments = comments.reduce((acc, comment) => {
    const countReplies = (c: Comment): number =>
      1 + c.replies.reduce((sum, r) => sum + countReplies(r), 0)
    return acc + countReplies(comment)
  }, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-gray-500" />
        <h3 className="font-medium text-gray-900">
          Комментарии {totalComments > 0 && `(${totalComments})`}
        </h3>
      </div>

      {/* New comment form */}
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px]"
          placeholder="Написать комментарий..."
        />
        <Button
          onClick={() => handleSubmit()}
          disabled={submitting || !newComment.trim()}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <MessageSquare className="h-4 w-4 mr-2" />
          )}
          Отправить
        </Button>
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Комментариев пока нет. Будьте первым!
        </div>
      ) : (
        <div className="space-y-3">{comments.map(renderComment)}</div>
      )}
    </div>
  )
}
