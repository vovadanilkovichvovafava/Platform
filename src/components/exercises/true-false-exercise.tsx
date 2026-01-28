"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Check, X, RotateCcw, CheckCircle2, XCircle } from "lucide-react"

interface Statement {
  id: string
  text: string
  isTrue: boolean
  explanation?: string
}

interface TrueFalseExerciseProps {
  question: string
  statements: Statement[]
  onComplete: (isCorrect: boolean, attempts: number) => void
  disabled?: boolean
}

export function TrueFalseExercise({
  question,
  statements,
  onComplete,
  disabled = false,
}: TrueFalseExerciseProps) {
  const [answers, setAnswers] = useState<Record<string, boolean | null>>(
    Object.fromEntries(statements.map(s => [s.id, null]))
  )
  const [attempts, setAttempts] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const setAnswer = useCallback((statementId: string, value: boolean) => {
    if (disabled || showResult) return
    setAnswers(prev => ({ ...prev, [statementId]: value }))
  }, [disabled, showResult])

  const allAnswered = statements.every(s => answers[s.id] !== null)

  const handleCheck = useCallback(() => {
    if (!allAnswered) return

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    // Check all answers
    const allCorrect = statements.every(s => answers[s.id] === s.isTrue)

    setIsCorrect(allCorrect)
    setShowResult(true)

    if (allCorrect) {
      onComplete(true, newAttempts)
    }
  }, [allAnswered, answers, attempts, statements, onComplete])

  const handleRetry = useCallback(() => {
    setShowResult(false)
    setIsCorrect(false)
    setAnswers(Object.fromEntries(statements.map(s => [s.id, null])))
  }, [statements])

  // Get status for a statement after checking
  const getStatementStatus = (statement: Statement) => {
    if (!showResult) return null
    const userAnswer = answers[statement.id]
    if (userAnswer === statement.isTrue) return "correct"
    return "wrong"
  }

  // Count correct answers
  const correctCount = showResult
    ? statements.filter(s => answers[s.id] === s.isTrue).length
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-gray-900">{question}</h3>
        <p className="text-sm text-gray-500">
          Определите, верно или неверно каждое утверждение
        </p>
      </div>

      {/* Statements */}
      <div className="space-y-3">
        {statements.map((statement, index) => {
          const status = getStatementStatus(statement)
          const userAnswer = answers[statement.id]

          return (
            <div
              key={statement.id}
              className={cn(
                "p-4 rounded-xl border-2 transition-all",
                !showResult && "bg-white border-gray-200",
                status === "correct" && "bg-green-50 border-green-400",
                status === "wrong" && "bg-red-50 border-red-400"
              )}
            >
              <div className="flex items-start gap-4">
                {/* Number */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                    !showResult && "bg-gray-100 text-gray-600",
                    status === "correct" && "bg-green-500 text-white",
                    status === "wrong" && "bg-red-500 text-white"
                  )}
                >
                  {status === "correct" ? (
                    <Check className="w-4 h-4" />
                  ) : status === "wrong" ? (
                    <X className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Statement text */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium",
                    !showResult && "text-gray-700",
                    status === "correct" && "text-green-700",
                    status === "wrong" && "text-red-700"
                  )}>
                    {statement.text}
                  </p>

                  {/* Explanation on wrong answer */}
                  {status === "wrong" && statement.explanation && (
                    <p className="mt-2 text-sm text-red-600">
                      {statement.explanation}
                    </p>
                  )}

                  {/* Show correct answer when wrong */}
                  {status === "wrong" && (
                    <p className="mt-1 text-sm text-red-600 font-medium">
                      Правильный ответ: {statement.isTrue ? "Верно" : "Неверно"}
                    </p>
                  )}
                </div>

                {/* True/False buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setAnswer(statement.id, true)}
                    disabled={disabled || showResult}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-1.5",
                      // Default state
                      userAnswer !== true && !showResult && "bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700",
                      // Selected state
                      userAnswer === true && !showResult && "bg-green-500 text-white shadow-md",
                      // Result states
                      showResult && userAnswer === true && status === "correct" && "bg-green-500 text-white",
                      showResult && userAnswer === true && status === "wrong" && "bg-red-500 text-white",
                      showResult && userAnswer !== true && "bg-gray-100 text-gray-400",
                      // Disabled
                      (disabled || showResult) && "cursor-default"
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Верно
                  </button>
                  <button
                    onClick={() => setAnswer(statement.id, false)}
                    disabled={disabled || showResult}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-1.5",
                      // Default state
                      userAnswer !== false && !showResult && "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700",
                      // Selected state
                      userAnswer === false && !showResult && "bg-red-500 text-white shadow-md",
                      // Result states
                      showResult && userAnswer === false && status === "correct" && "bg-green-500 text-white",
                      showResult && userAnswer === false && status === "wrong" && "bg-red-500 text-white",
                      showResult && userAnswer !== false && "bg-gray-100 text-gray-400",
                      // Disabled
                      (disabled || showResult) && "cursor-default"
                    )}
                  >
                    <XCircle className="w-4 h-4" />
                    Неверно
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {statements.map((statement) => {
          const status = getStatementStatus(statement)
          const answered = answers[statement.id] !== null
          return (
            <div
              key={statement.id}
              className={cn(
                "w-8 h-2 rounded-full transition-all",
                !showResult && !answered && "bg-gray-200",
                !showResult && answered && "bg-blue-500",
                status === "correct" && "bg-green-500",
                status === "wrong" && "bg-red-500"
              )}
            />
          )
        })}
      </div>

      {/* Result feedback */}
      {showResult && (
        <div
          className={cn(
            "p-4 rounded-xl border-2 text-center",
            isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          )}
        >
          <p className={cn("font-semibold text-lg", isCorrect ? "text-green-700" : "text-red-700")}>
            {isCorrect
              ? "Отлично! Все ответы правильные!"
              : `Правильных ответов: ${correctCount} из ${statements.length}`}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        {!showResult && (
          <button
            onClick={handleCheck}
            disabled={!allAnswered || disabled}
            className={cn(
              "px-8 py-3 rounded-xl font-semibold text-white transition-all",
              "shadow-lg hover:shadow-xl hover:-translate-y-0.5",
              allAnswered && !disabled
                ? "bg-[#0176D3] hover:bg-[#0161B3]"
                : "bg-gray-300 cursor-not-allowed shadow-none"
            )}
          >
            Проверить
          </button>
        )}

        {showResult && !isCorrect && (
          <button
            onClick={handleRetry}
            className="px-8 py-3 rounded-xl font-semibold bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Попробовать снова
          </button>
        )}
      </div>
    </div>
  )
}
