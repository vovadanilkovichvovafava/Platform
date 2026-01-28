"use client"

import React, { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Check, RotateCcw } from "lucide-react"

interface MatchingItem {
  id: string
  text: string
}

interface MatchingExerciseProps {
  question: string
  leftItems: MatchingItem[]
  rightItems: MatchingItem[]
  correctPairs: Record<string, string>
  leftLabel?: string
  rightLabel?: string
  onComplete: (isCorrect: boolean, attempts: number) => void
  disabled?: boolean
}

const PAIR_COLORS = [
  { bg: "bg-blue-500", border: "border-blue-400", text: "text-blue-600" },
  { bg: "bg-emerald-500", border: "border-emerald-400", text: "text-emerald-600" },
  { bg: "bg-violet-500", border: "border-violet-400", text: "text-violet-600" },
  { bg: "bg-amber-500", border: "border-amber-400", text: "text-amber-600" },
  { bg: "bg-rose-500", border: "border-rose-400", text: "text-rose-600" },
  { bg: "bg-teal-500", border: "border-teal-400", text: "text-teal-600" },
]

export function MatchingExercise({
  question,
  leftItems,
  rightItems,
  correctPairs,
  leftLabel = "Задачи",
  rightLabel = "Ответы",
  onComplete,
  disabled = false,
}: MatchingExerciseProps) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [matches, setMatches] = useState<Record<string, string>>({})
  const [attempts, setAttempts] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const getColorIndex = useCallback((leftId: string) => {
    const matchedLeftIds = Object.keys(matches)
    const index = matchedLeftIds.indexOf(leftId)
    return index >= 0 ? index % PAIR_COLORS.length : -1
  }, [matches])

  const handleLeftClick = useCallback((id: string) => {
    if (disabled || showResult) return
    if (matches[id]) {
      const newMatches = { ...matches }
      delete newMatches[id]
      setMatches(newMatches)
      setSelectedLeft(null)
    } else {
      setSelectedLeft(selectedLeft === id ? null : id)
    }
  }, [disabled, showResult, matches, selectedLeft])

  const handleRightClick = useCallback((id: string) => {
    if (disabled || showResult || !selectedLeft) return
    setMatches(prev => ({ ...prev, [selectedLeft]: id }))
    setSelectedLeft(null)
  }, [disabled, showResult, selectedLeft])

  const handleCheck = useCallback(() => {
    const newAttempts = attempts + 1
    setAttempts(newAttempts)
    const allCorrect =
      Object.keys(correctPairs).length === Object.keys(matches).length &&
      Object.entries(correctPairs).every(([left, right]) => matches[left] === right)
    setIsCorrect(allCorrect)
    setShowResult(true)
    if (allCorrect) {
      onComplete(true, newAttempts)
    }
  }, [attempts, correctPairs, matches, onComplete])

  const handleRetry = useCallback(() => {
    setShowResult(false)
    setIsCorrect(false)
    setMatches({})
    setSelectedLeft(null)
  }, [])

  const allMatched = Object.keys(matches).length === leftItems.length

  // Get connected right item's display info
  const getMatchedRightText = (leftId: string) => {
    const rightId = matches[leftId]
    if (!rightId) return null
    return rightItems.find(r => r.id === rightId)?.text
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold text-gray-900">{question}</h3>
        <p className="text-sm text-gray-500">
          Выберите задачу слева, затем ответ справа
        </p>
      </div>

      {/* Main matching area - simple table-like layout */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        {/* Column headers */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {leftLabel}
          </div>
          <div className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {rightLabel}
          </div>
        </div>

        {/* Left items as rows with their matches */}
        {leftItems.map((item, index) => {
          const isMatched = !!matches[item.id]
          const isSelected = selectedLeft === item.id
          const colorIndex = getColorIndex(item.id)
          const colors = colorIndex >= 0 ? PAIR_COLORS[colorIndex] : null
          const matchedText = getMatchedRightText(item.id)

          const isPairCorrect = showResult && isMatched && correctPairs[item.id] === matches[item.id]
          const isPairWrong = showResult && isMatched && correctPairs[item.id] !== matches[item.id]

          return (
            <div key={item.id} className="grid grid-cols-2 gap-3 items-stretch">
              {/* Left item with number */}
              <button
                onClick={() => handleLeftClick(item.id)}
                disabled={disabled || showResult}
                className={cn(
                  "w-full p-3 rounded-lg text-left text-sm font-medium transition-all",
                  "border-2 overflow-hidden",
                  !isMatched && !isSelected && "bg-white border-gray-200 hover:border-blue-300",
                  isSelected && "bg-blue-50 border-blue-500 shadow-md",
                  isMatched && !showResult && colors && `bg-white ${colors.border}`,
                  isPairCorrect && "bg-green-50 border-green-500",
                  isPairWrong && "bg-red-50 border-red-500",
                  (disabled || showResult) && "cursor-default"
                )}
              >
                <div className="flex items-start gap-2">
                  {/* Номер вопроса */}
                  <span className={cn(
                    "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    isSelected ? "bg-blue-500 text-white" :
                    isPairCorrect ? "bg-green-500 text-white" :
                    isPairWrong ? "bg-red-500 text-white" :
                    isMatched && colors ? colors.bg + " text-white" :
                    "bg-gray-200 text-gray-600"
                  )}>
                    {index + 1}
                  </span>
                  {isMatched && colors && !showResult && (
                    <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1", colors.bg)} />
                  )}
                  {isPairCorrect && <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />}
                  {isPairWrong && <span className="text-red-600 font-bold flex-shrink-0">✕</span>}
                  <span className="leading-tight break-words overflow-wrap-anywhere min-w-0">{item.text}</span>
                </div>
              </button>

              {/* Right side - show match or placeholder */}
              <div
                className={cn(
                  "w-full p-3 rounded-lg text-sm font-medium transition-all border-2 min-h-[44px] overflow-hidden",
                  isMatched && !showResult && colors && `bg-white ${colors.border}`,
                  isPairCorrect && "bg-green-50 border-green-500",
                  isPairWrong && "bg-red-50 border-red-500",
                  !isMatched && "bg-gray-100 border-gray-200 border-dashed"
                )}
              >
                {matchedText ? (
                  <div className="flex items-start gap-2">
                    {isMatched && colors && !showResult && (
                      <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1", colors.bg)} />
                    )}
                    {isPairCorrect && <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />}
                    {isPairWrong && <span className="text-red-600 font-bold flex-shrink-0">✕</span>}
                    <span className="leading-tight break-words overflow-wrap-anywhere min-w-0">{matchedText}</span>
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            </div>
          )
        })}

        {/* Divider */}
        <div className="border-t border-gray-200 my-4" />

        {/* Right items to choose from */}
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Варианты ответов (можно использовать несколько раз)
        </div>
        <div className="flex flex-wrap gap-2">
          {rightItems.map((item) => {
            const useCount = Object.values(matches).filter(id => id === item.id).length
            const canClick = selectedLeft && !disabled && !showResult

            return (
              <button
                key={item.id}
                onClick={() => handleRightClick(item.id)}
                disabled={disabled || showResult || !selectedLeft}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border-2 relative",
                  "max-w-full break-words text-left",
                  !canClick && "bg-white border-gray-200 text-gray-700",
                  canClick && "bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer shadow-sm hover:shadow",
                  (disabled || showResult) && "cursor-default"
                )}
              >
                <span className="break-words overflow-wrap-anywhere">{item.text}</span>
                {useCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {useCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex gap-1">
          {leftItems.map((item, idx) => (
            <div
              key={item.id}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all",
                matches[item.id]
                  ? showResult
                    ? correctPairs[item.id] === matches[item.id]
                      ? "bg-green-500"
                      : "bg-red-500"
                    : PAIR_COLORS[idx % PAIR_COLORS.length].bg
                  : "bg-gray-300"
              )}
            />
          ))}
        </div>
        <span className="text-sm text-gray-500">
          {Object.keys(matches).length} / {leftItems.length}
        </span>
      </div>

      {/* Result */}
      {showResult && (
        <div className={cn(
          "p-4 rounded-xl text-center",
          isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
        )}>
          <p className={cn("font-semibold", isCorrect ? "text-green-700" : "text-red-700")}>
            {isCorrect ? "Отлично! Все пары верны!" : "Есть ошибки. Попробуйте снова."}
          </p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-center">
        {!showResult ? (
          <button
            onClick={handleCheck}
            disabled={!allMatched || disabled}
            className={cn(
              "px-8 py-3 rounded-xl font-semibold text-white transition-all",
              allMatched && !disabled
                ? "bg-blue-500 hover:bg-blue-600 shadow-lg"
                : "bg-gray-300 cursor-not-allowed"
            )}
          >
            Проверить
          </button>
        ) : !isCorrect && (
          <button
            onClick={handleRetry}
            className="px-8 py-3 rounded-xl font-semibold bg-white border-2 border-gray-200 hover:bg-gray-50 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Ещё раз
          </button>
        )}
      </div>
    </div>
  )
}
