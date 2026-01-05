"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { AlertTriangle, Check, X } from "lucide-react"

interface CaseOption {
  id: string
  text: string
  isCorrect: boolean
  explanation?: string
}

interface CaseAnalysisExerciseProps {
  question: string
  caseContent: string // The bad example to analyze
  caseLabel?: string // Optional label like "Промпт" or "Код"
  options: CaseOption[]
  minCorrectRequired?: number // Minimum correct answers to select
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

  const toggleOption = useCallback(
    (id: string) => {
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
    },
    [disabled, showResult]
  )

  const handleCheck = useCallback(() => {
    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    // Check if all correct options are selected and no incorrect ones
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

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">{question}</h3>

      {/* Case content box */}
      <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/5 overflow-hidden">
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-400">{caseLabel}</span>
        </div>
        <div className="p-4">
          <pre className="text-zinc-300 whitespace-pre-wrap font-mono text-sm">{caseContent}</pre>
        </div>
      </div>

      <p className="text-sm text-zinc-400">
        Выберите все проблемы, которые вы нашли в примере выше. Нужно выбрать минимум {requiredCount}{" "}
        {requiredCount === 1 ? "проблему" : requiredCount < 5 ? "проблемы" : "проблем"}.
      </p>

      {/* Options */}
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedOptions.has(option.id)
          const showCorrectness = showResult

          let borderColor = "border-zinc-700"
          let bgColor = "bg-zinc-800/50"

          if (showCorrectness) {
            if (option.isCorrect && isSelected) {
              borderColor = "border-green-500"
              bgColor = "bg-green-500/10"
            } else if (option.isCorrect && !isSelected) {
              borderColor = "border-amber-500"
              bgColor = "bg-amber-500/10"
            } else if (!option.isCorrect && isSelected) {
              borderColor = "border-red-500"
              bgColor = "bg-red-500/10"
            }
          } else if (isSelected) {
            borderColor = "border-indigo-500"
            bgColor = "bg-indigo-500/10"
          }

          return (
            <button
              key={option.id}
              onClick={() => toggleOption(option.id)}
              disabled={disabled || showResult}
              className={cn(
                "w-full p-4 rounded-lg border-2 text-left transition-all flex items-start gap-3",
                borderColor,
                bgColor,
                !disabled && !showResult && "hover:border-zinc-500"
              )}
            >
              {/* Checkbox indicator */}
              <div
                className={cn(
                  "w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5",
                  isSelected ? "border-indigo-500 bg-indigo-500" : "border-zinc-600"
                )}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>

              <div className="flex-1">
                <span className="text-white">{option.text}</span>

                {/* Show explanation on result */}
                {showResult && option.explanation && (
                  <p className={cn("mt-2 text-sm", option.isCorrect ? "text-green-400" : "text-zinc-400")}>
                    {option.explanation}
                  </p>
                )}
              </div>

              {/* Result indicator */}
              {showCorrectness && (
                <div className="flex-shrink-0">
                  {option.isCorrect && isSelected && <Check className="w-5 h-5 text-green-500" />}
                  {option.isCorrect && !isSelected && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  {!option.isCorrect && isSelected && <X className="w-5 h-5 text-red-500" />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Result feedback */}
      {showResult && (
        <div
          className={cn("p-4 rounded-lg border", isCorrect ? "bg-green-500/10 border-green-500" : "bg-red-500/10 border-red-500")}
        >
          <p className={cn("font-medium", isCorrect ? "text-green-400" : "text-red-400")}>
            {isCorrect
              ? "Отлично! Вы правильно определили все проблемы!"
              : "Не все проблемы найдены или выбраны лишние варианты. Посмотрите подсказки и попробуйте снова."}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {!showResult && (
          <button
            onClick={handleCheck}
            disabled={!hasMinimumSelected || disabled}
            className={cn(
              "px-6 py-2 rounded-lg font-medium transition-colors",
              hasMinimumSelected && !disabled
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
            )}
          >
            Проверить
          </button>
        )}

        {showResult && !isCorrect && (
          <button
            onClick={handleRetry}
            className="px-6 py-2 rounded-lg font-medium bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
          >
            Попробовать снова
          </button>
        )}
      </div>
    </div>
  )
}
