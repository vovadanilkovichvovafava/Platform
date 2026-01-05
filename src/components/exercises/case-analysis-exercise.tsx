"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { AlertTriangle, Check, X, RotateCcw, Lightbulb } from "lucide-react"

interface CaseOption {
  id: string
  text: string
  isCorrect: boolean
  explanation?: string
}

interface CaseAnalysisExerciseProps {
  question: string
  caseContent: string
  caseLabel?: string
  options: CaseOption[]
  minCorrectRequired?: number
  onComplete: (isCorrect: boolean, attempts: number) => void
  disabled?: boolean
}

export function CaseAnalysisExercise({
  question,
  caseContent,
  caseLabel = "Пример",
  options,
  minCorrectRequired,
  onComplete,
  disabled = false,
}: CaseAnalysisExerciseProps) {
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set())
  const [attempts, setAttempts] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const correctOptionIds = options.filter((o) => o.isCorrect).map((o) => o.id)
  const requiredCount = minCorrectRequired || correctOptionIds.length

  const toggleOption = useCallback((id: string) => {
    if (disabled || showResult) return

    setSelectedOptions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [disabled, showResult])

  const handleCheck = useCallback(() => {
    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    const selectedCorrect = correctOptionIds.filter((id) => selectedOptions.has(id))
    const selectedIncorrect = [...selectedOptions].filter((id) => !correctOptionIds.includes(id))

    const allCorrect = selectedCorrect.length === correctOptionIds.length && selectedIncorrect.length === 0

    setIsCorrect(allCorrect)
    setShowResult(true)

    if (allCorrect) {
      onComplete(true, newAttempts)
    }
  }, [attempts, correctOptionIds, selectedOptions, onComplete])

  const handleRetry = useCallback(() => {
    setShowResult(false)
    setIsCorrect(false)
    setSelectedOptions(new Set())
  }, [])

  const hasMinimumSelected = selectedOptions.size >= requiredCount

  // Get option status for result display
  const getOptionStatus = (option: CaseOption) => {
    if (!showResult) return null
    const isSelected = selectedOptions.has(option.id)

    if (option.isCorrect && isSelected) return "correct"
    if (option.isCorrect && !isSelected) return "missed"
    if (!option.isCorrect && isSelected) return "wrong"
    return "neutral"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-gray-900">{question}</h3>
        <p className="text-sm text-gray-500">
          Выберите все проблемы в примере ниже (минимум {requiredCount})
        </p>
      </div>

      {/* Case content box */}
      <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden shadow-lg">
        <div className="px-5 py-3 bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-amber-800">{caseLabel}</span>
        </div>
        <div className="p-6">
          <div className="bg-white/80 backdrop-blur rounded-xl p-5 border border-amber-200/50">
            <pre className="text-gray-800 whitespace-pre-wrap font-mono text-lg leading-relaxed">
              {caseContent}
            </pre>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedOptions.has(option.id)
          const status = getOptionStatus(option)

          return (
            <button
              key={option.id}
              onClick={() => toggleOption(option.id)}
              disabled={disabled || showResult}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
                "flex items-start gap-4 group",
                // Default state
                !showResult && !isSelected && "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md",
                !showResult && isSelected && "bg-indigo-50 border-indigo-500 shadow-md",
                // Result states
                status === "correct" && "bg-green-50 border-green-500",
                status === "missed" && "bg-amber-50 border-amber-500",
                status === "wrong" && "bg-red-50 border-red-500",
                status === "neutral" && "bg-white border-gray-200 opacity-60",
                // Cursor
                !disabled && !showResult && "cursor-pointer"
              )}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  "w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all",
                  // Default
                  !showResult && !isSelected && "border-gray-300 group-hover:border-gray-400",
                  !showResult && isSelected && "border-indigo-500 bg-indigo-500",
                  // Result states
                  status === "correct" && "border-green-500 bg-green-500",
                  status === "missed" && "border-amber-500 bg-amber-500",
                  status === "wrong" && "border-red-500 bg-red-500",
                  status === "neutral" && "border-gray-300"
                )}
              >
                {(isSelected || status === "missed") && !showResult && (
                  <Check className="w-4 h-4 text-white" />
                )}
                {status === "correct" && <Check className="w-4 h-4 text-white" />}
                {status === "missed" && <Lightbulb className="w-4 h-4 text-white" />}
                {status === "wrong" && <X className="w-4 h-4 text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "font-medium block",
                    !showResult && "text-gray-700",
                    status === "correct" && "text-green-700",
                    status === "missed" && "text-amber-700",
                    status === "wrong" && "text-red-700",
                    status === "neutral" && "text-gray-500"
                  )}
                >
                  {option.text}
                </span>

                {/* Show explanation on result */}
                {showResult && option.explanation && (status === "correct" || status === "missed" || status === "wrong") && (
                  <p
                    className={cn(
                      "mt-2 text-sm",
                      status === "correct" && "text-green-600",
                      status === "missed" && "text-amber-600",
                      status === "wrong" && "text-red-600"
                    )}
                  >
                    {option.explanation}
                  </p>
                )}
              </div>

              {/* Status badge */}
              {showResult && status !== "neutral" && (
                <div
                  className={cn(
                    "flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold",
                    status === "correct" && "bg-green-100 text-green-700",
                    status === "missed" && "bg-amber-100 text-amber-700",
                    status === "wrong" && "bg-red-100 text-red-700"
                  )}
                >
                  {status === "correct" && "Верно"}
                  {status === "missed" && "Пропущено"}
                  {status === "wrong" && "Неверно"}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex gap-1">
          {Array.from({ length: requiredCount }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "w-3 h-3 rounded-full transition-all",
                idx < selectedOptions.size
                  ? showResult
                    ? isCorrect
                      ? "bg-green-500"
                      : "bg-red-500"
                    : "bg-indigo-500"
                  : "bg-gray-300"
              )}
            />
          ))}
        </div>
        <span className="text-sm text-gray-500">
          {selectedOptions.size} / {requiredCount} выбрано
        </span>
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
              ? "Отлично! Вы нашли все проблемы!"
              : "Не все проблемы найдены или выбраны лишние варианты."}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        {!showResult && (
          <button
            onClick={handleCheck}
            disabled={!hasMinimumSelected || disabled}
            className={cn(
              "px-8 py-3 rounded-xl font-semibold text-white transition-all",
              "shadow-lg hover:shadow-xl hover:-translate-y-0.5",
              hasMinimumSelected && !disabled
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
