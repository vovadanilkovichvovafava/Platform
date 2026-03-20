"use client"

/**
 * AI Submission Review UI component.
 * Displays AI analysis and generated questions for a submission.
 * Isolated feature — does not affect existing components.
 */
import { useState, useEffect, useCallback } from "react"
import { Copy, Check } from "lucide-react"
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

  const hasNoReview = !review
  const isProcessing = review?.status === "pending" || review?.status === "processing"
  const isPending = hasNoReview || isProcessing

  // Poll for updates while status is pending/processing (only if a review record exists)
  useEffect(() => {
    if (!isProcessing) return

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
  }, [submissionId, isProcessing])

  const triggerAnalysis = useCallback(async (force?: boolean) => {
    setIsRetrying(true)
    setPollError(null)
    try {
      const res = await fetch(`/api/submissions/${submissionId}/ai-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: force ?? false }),
      })
      if (res.ok) {
        setReview((prev) =>
          prev
            ? { ...prev, status: "processing", errorMessage: null, analysis: null, questions: null }
            : {
                id: "",
                submissionId,
                status: "processing",
                analysis: null,
                questions: null,
                coverage: null,
                errorMessage: null,
                startedAt: new Date().toISOString(),
                finishedAt: null,
              }
        )
      }
    } catch {
      setPollError("Не удалось запустить анализ")
    } finally {
      setIsRetrying(false)
    }
  }, [submissionId])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          Анализ и вопросы от AI
          {review && (
            <StatusBadge status={review.status} />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* No review exists — show trigger button */}
        {hasNoReview && !isRetrying && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              AI-анализ ещё не проводился для этой работы.
            </p>
            <button
              onClick={() => triggerAnalysis()}
              disabled={isRetrying}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              Запустить AI-анализ
            </button>
          </div>
        )}

        {/* Processing */}
        {isProcessing && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-slate-400">AI анализирует работу…</p>
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

        {/* Triggered from no-review state — show processing */}
        {hasNoReview && isRetrying && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-slate-400">AI анализирует работу…</p>
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

        {/* Failed */}
        {review?.status === "failed" && (
          <div className="space-y-3">
            <p className="text-sm text-red-600">
              {review.errorMessage || "AI-анализ завершился с ошибкой."}
            </p>
            <button
              onClick={() => triggerAnalysis()}
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

            {/* Coverage info + re-run button */}
            <div className="flex items-center justify-between pt-2 border-t">
              {review.coverage && (
                <div className="text-xs text-gray-400 dark:text-slate-500">
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
              <button
                onClick={() => triggerAnalysis(true)}
                disabled={isRetrying}
                className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 underline underline-offset-2 disabled:opacity-50"
              >
                {isRetrying ? "Запускаю…" : "Перезапустить анализ"}
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

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Ожидание",
      className: "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-0",
    },
    processing: {
      label: "Анализ…",
      className: "bg-blue-100 dark:bg-blue-950 text-blue-700 border-0",
    },
    completed: {
      label: "Готово",
      className: "bg-green-100 dark:bg-green-950 text-green-700 border-0",
    },
    failed: {
      label: "Ошибка",
      className: "bg-red-100 dark:bg-red-950 text-red-700 border-0",
    },
  }
  const c = config[status] ?? config.pending
  return <Badge className={c.className}>{c.label}</Badge>
}

function AnalysisSection({ analysis }: { analysis: AiReviewAnalysis }) {
  return (
    <div className="space-y-4">
      {/* Short Verdict */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
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
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const typeLabels: Record<string, string> = {
    knowledge: "Знание",
    application: "Применение",
    reflection: "Рефлексия",
    verification: "Верификация",
    analysis: "Анализ",
    evaluation: "Оценка",
    synthesis: "Синтез",
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

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      // Clipboard API may fail in insecure contexts — silent fallback
    }
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">
        Вопросы для проверки ({questions.length})
      </h4>
      <div className="space-y-3">
        {questions.map((q, i) => (
          <div
            key={i}
            className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-700"
          >
            <div className="flex items-start gap-2 mb-2">
              <span className="text-sm font-medium text-gray-400 dark:text-slate-500 mt-0.5">
                {i + 1}.
              </span>
              <p className="text-sm text-gray-900 dark:text-slate-100 flex-1">{q.question}</p>
              <button
                onClick={() => handleCopy(q.question, i)}
                className="shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                aria-label={copiedIndex === i ? "Скопировано" : "Копировать вопрос"}
                title={copiedIndex === i ? "Скопировано!" : "Копировать вопрос"}
              >
                {copiedIndex === i ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
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
