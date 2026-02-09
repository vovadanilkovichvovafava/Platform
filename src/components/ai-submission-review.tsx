"use client"

/**
 * AI Submission Review UI component.
 * Displays AI analysis and generated questions for a submission.
 * Isolated feature — does not affect existing components.
 */
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type {
  AiReviewDTO,
  AiReviewAnalysis,
  AiReviewQuestion,
} from "@/lib/ai-submission-review/types"

interface Props {
  submissionId: string
  /** Pre-loaded review data from server (avoids initial fetch) */
  initialData: AiReviewDTO | null
}

const POLL_INTERVAL = 5000 // 5 seconds

export function AiSubmissionReview({ submissionId, initialData }: Props) {
  const [review, setReview] = useState<AiReviewDTO | null>(initialData)
  const [isRetrying, setIsRetrying] = useState(false)
  const [pollError, setPollError] = useState<string | null>(null)

  const isPending = !review || review.status === "pending" || review.status === "processing"

  // Poll for updates while status is pending/processing
  useEffect(() => {
    if (!isPending) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/submissions/${submissionId}/ai-review`)
        if (!res.ok) return
        const data = await res.json()
        if (data.review) {
          setReview(data.review)
          setPollError(null)
        }
      } catch {
        setPollError("Ошибка при загрузке статуса")
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL)
    // Also poll immediately once
    poll()

    return () => clearInterval(interval)
  }, [submissionId, isPending])

  const handleRetry = useCallback(async () => {
    setIsRetrying(true)
    setPollError(null)
    try {
      const res = await fetch(`/api/submissions/${submissionId}/ai-review`, {
        method: "POST",
      })
      if (res.ok) {
        setReview((prev) =>
          prev ? { ...prev, status: "processing", errorMessage: null } : null
        )
      }
    } catch {
      setPollError("Не удалось запустить повторный анализ")
    } finally {
      setIsRetrying(false)
    }
  }, [submissionId])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          Анали и вопросы от AI
          {review && (
            <StatusBadge status={review.status} />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Pending / Processing */}
        {isPending && !review?.errorMessage && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">AI анализирует работу…</p>
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-3 rounded bg-gray-200 animate-pulse"
                  style={{ width: `${60 + i * 20}px` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Failed */}
        {review?.status === "failed" && (
          <div className="space-y-3">
            <p className="text-sm text-red-600">
              {review.errorMessage || "AI-анализ завершился с ошибкой."}
            </p>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {isRetrying ? "Запускаю…" : "Повторить анализ"}
            </button>
          </div>
        )}

        {/* Completed */}
        {review?.status === "completed" && review.analysis && (
          <div className="space-y-6">
            {/* Analysis Summary */}
            <AnalysisSection analysis={review.analysis} />

            {/* Questions */}
            {review.questions && review.questions.length > 0 && (
              <QuestionsSection questions={review.questions} />
            )}

            {/* Coverage info */}
            {review.coverage && (
              <div className="text-xs text-gray-400 pt-2 border-t">
                Источники: {[
                  review.coverage.submissionTextUsed && "текст ответа",
                  review.coverage.fileUsed && "файл работы",
                  review.coverage.moduleUsed && "модуль",
                  review.coverage.trailUsed && "трейл",
                ]
                  .filter(Boolean)
                  .join(", ") || "—"}
                {review.analysis.confidence != null && (
                  <span className="ml-2">
                    · Уверенность AI: {review.analysis.confidence}%
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {pollError && (
          <p className="text-xs text-red-500 mt-2">{pollError}</p>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Ожидание",
      className: "bg-gray-100 text-gray-600 border-0",
    },
    processing: {
      label: "Анализ…",
      className: "bg-blue-100 text-blue-700 border-0",
    },
    completed: {
      label: "Готово",
      className: "bg-green-100 text-green-700 border-0",
    },
    failed: {
      label: "Ошибка",
      className: "bg-red-100 text-red-700 border-0",
    },
  }
  const c = config[status] ?? config.pending
  return <Badge className={c.className}>{c.label}</Badge>
}

function AnalysisSection({ analysis }: { analysis: AiReviewAnalysis }) {
  return (
    <div className="space-y-4">
      {/* Short Verdict */}
      <div className="p-3 bg-blue-50 rounded-lg">
        <p className="text-sm font-medium text-blue-900">
          {analysis.shortVerdict}
        </p>
      </div>

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-green-700 mb-1">
            Сильные стороны
          </h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-green-600">
            {analysis.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {analysis.weaknesses.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-orange-700 mb-1">
            Слабые стороны
          </h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-orange-600">
            {analysis.weaknesses.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Gaps */}
      {analysis.gaps.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-700 mb-1">
            Пробелы
          </h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
            {analysis.gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk Flags */}
      {analysis.riskFlags.length > 0 && (
        <div className="p-3 bg-yellow-50 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-1">
            Риск-флаги
          </h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
            {analysis.riskFlags.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function QuestionsSection({ questions }: { questions: AiReviewQuestion[] }) {
  const typeLabels: Record<string, string> = {
    knowledge: "Знание",
    application: "Применение",
    reflection: "Рефлексия",
    verification: "Верификация",
  }
  const difficultyColors: Record<string, string> = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hard: "bg-red-100 text-red-700",
  }
  const sourceLabels: Record<string, string> = {
    submission: "работа",
    file: "файл",
    module: "модуль",
    trail: "трейл",
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-3">
        Вопросы для проверки ({questions.length})
      </h4>
      <div className="space-y-3">
        {questions.map((q, i) => (
          <div
            key={i}
            className="p-3 bg-gray-50 rounded-lg border border-gray-100"
          >
            <div className="flex items-start gap-2 mb-2">
              <span className="text-sm font-medium text-gray-400 mt-0.5">
                {i + 1}.
              </span>
              <p className="text-sm text-gray-900 flex-1">{q.question}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 ml-5">
              <Badge className="text-xs bg-blue-100 text-blue-700 border-0">
                {typeLabels[q.type] ?? q.type}
              </Badge>
              <Badge
                className={`text-xs border-0 ${difficultyColors[q.difficulty] ?? ""}`}
              >
                {q.difficulty}
              </Badge>
              <Badge className="text-xs bg-purple-100 text-purple-700 border-0">
                {sourceLabels[q.source] ?? q.source}
              </Badge>
            </div>
            {q.rationale && (
              <p className="text-xs text-gray-400 mt-1.5 ml-5 italic">
                {q.rationale}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
