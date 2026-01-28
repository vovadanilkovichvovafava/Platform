"use client"

import { useState, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Check, X, RotateCcw, ChevronDown } from "lucide-react"

interface Blank {
  id: string
  correctAnswer: string
  options: string[]
}

interface FillBlankExerciseProps {
  question: string
  textWithBlanks: string // "Программа состоит из {{1}} и {{2}}"
  blanks: Blank[]
  onComplete: (isCorrect: boolean, attempts: number) => void
  disabled?: boolean
}

export function FillBlankExercise({
  question,
  textWithBlanks,
  blanks,
  onComplete,
  disabled = false,
}: FillBlankExerciseProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(blanks.map(b => [b.id, ""]))
  )
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  // Parse text and find blank positions
  const textParts = useMemo(() => {
    const parts: { type: "text" | "blank"; content: string; blankId?: string }[] = []
    const regex = /\{\{(\d+)\}\}/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(textWithBlanks)) !== null) {
      // Add text before the blank
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: textWithBlanks.slice(lastIndex, match.index),
        })
      }

      // Add the blank
      parts.push({
        type: "blank",
        content: match[0],
        blankId: match[1],
      })

      lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < textWithBlanks.length) {
      parts.push({
        type: "text",
        content: textWithBlanks.slice(lastIndex),
      })
    }

    return parts
  }, [textWithBlanks])

  const setAnswer = useCallback((blankId: string, value: string) => {
    if (disabled || showResult) return
    setAnswers(prev => ({ ...prev, [blankId]: value }))
    setOpenDropdown(null)
  }, [disabled, showResult])

  const toggleDropdown = useCallback((blankId: string) => {
    if (disabled || showResult) return
    setOpenDropdown(prev => prev === blankId ? null : blankId)
  }, [disabled, showResult])

  const allFilled = blanks.every(b => answers[b.id] !== "")

  const handleCheck = useCallback(() => {
    if (!allFilled) return

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    // Check all answers
    const allCorrect = blanks.every(b =>
      answers[b.id].toLowerCase().trim() === b.correctAnswer.toLowerCase().trim()
    )

    setIsCorrect(allCorrect)
    setShowResult(true)

    if (allCorrect) {
      onComplete(true, newAttempts)
    }
  }, [allFilled, answers, attempts, blanks, onComplete])

  const handleRetry = useCallback(() => {
    setShowResult(false)
    setIsCorrect(false)
    setAnswers(Object.fromEntries(blanks.map(b => [b.id, ""])))
    setOpenDropdown(null)
  }, [blanks])

  // Get status for a blank after checking
  const getBlankStatus = (blank: Blank) => {
    if (!showResult) return null
    const userAnswer = answers[blank.id]
    if (userAnswer.toLowerCase().trim() === blank.correctAnswer.toLowerCase().trim()) return "correct"
    return "wrong"
  }

  // Count correct answers
  const correctCount = showResult
    ? blanks.filter(b => answers[b.id].toLowerCase().trim() === b.correctAnswer.toLowerCase().trim()).length
    : 0

  // Get blank by id
  const getBlank = (blankId: string) => blanks.find(b => b.id === blankId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-gray-900">{question}</h3>
        <p className="text-sm text-gray-500">
          Заполните пропуски, выбрав правильные варианты
        </p>
      </div>

      {/* Text with blanks */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
        <div className="text-lg leading-relaxed flex flex-wrap items-baseline gap-1">
          {textParts.map((part, index) => {
            if (part.type === "text") {
              return (
                <span key={index} className="text-gray-700">
                  {part.content}
                </span>
              )
            }

            // Blank
            const blankId = part.blankId!
            const blank = getBlank(blankId)
            if (!blank) return null

            const status = getBlankStatus(blank)
            const userAnswer = answers[blankId]
            const isOpen = openDropdown === blankId

            return (
              <span key={index} className="relative inline-block">
                <button
                  onClick={() => toggleDropdown(blankId)}
                  disabled={disabled || showResult}
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1 rounded-lg border-2 font-medium transition-all min-w-[120px] justify-between",
                    // Default state - empty
                    !userAnswer && !showResult && "bg-white border-dashed border-gray-300 text-gray-400 hover:border-blue-400",
                    // Filled state
                    userAnswer && !showResult && "bg-blue-50 border-blue-400 text-blue-700",
                    // Result states
                    status === "correct" && "bg-green-100 border-green-500 text-green-700",
                    status === "wrong" && "bg-red-100 border-red-500 text-red-700",
                    // Disabled
                    (disabled || showResult) && "cursor-default"
                  )}
                >
                  <span className="truncate">
                    {userAnswer || `Пропуск ${blankId}`}
                  </span>
                  {!showResult && <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />}
                  {status === "correct" && <Check className="w-4 h-4" />}
                  {status === "wrong" && <X className="w-4 h-4" />}
                </button>

                {/* Dropdown */}
                {isOpen && !showResult && (
                  <div className="absolute z-10 top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-full">
                    {blank.options.map((option, optIdx) => (
                      <button
                        key={optIdx}
                        onClick={() => setAnswer(blankId, option)}
                        className={cn(
                          "w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors",
                          userAnswer === option && "bg-blue-100 text-blue-700"
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {/* Show correct answer when wrong */}
                {status === "wrong" && (
                  <div className="absolute z-10 top-full left-0 mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded whitespace-nowrap">
                    Правильно: {blank.correctAnswer}
                  </div>
                )}
              </span>
            )
          })}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {blanks.map((blank) => {
          const status = getBlankStatus(blank)
          const filled = answers[blank.id] !== ""
          return (
            <div
              key={blank.id}
              className={cn(
                "w-8 h-2 rounded-full transition-all",
                !showResult && !filled && "bg-gray-200",
                !showResult && filled && "bg-blue-500",
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
              ? "Отлично! Все пропуски заполнены правильно!"
              : `Правильных ответов: ${correctCount} из ${blanks.length}`}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        {!showResult && (
          <button
            onClick={handleCheck}
            disabled={!allFilled || disabled}
            className={cn(
              "px-8 py-3 rounded-xl font-semibold text-white transition-all",
              "shadow-lg hover:shadow-xl hover:-translate-y-0.5",
              allFilled && !disabled
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
