"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"

interface MatchingItem {
  id: string
  text: string
}

interface MatchingExerciseProps {
  question: string
  leftItems: MatchingItem[]
  rightItems: MatchingItem[]
  correctPairs: Record<string, string> // leftId -> rightId
  onComplete: (isCorrect: boolean, attempts: number) => void
  disabled?: boolean
}

export function MatchingExercise({
  question,
  leftItems,
  rightItems,
  correctPairs,
  onComplete,
  disabled = false,
}: MatchingExerciseProps) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [matches, setMatches] = useState<Record<string, string>>({})
  const [attempts, setAttempts] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const handleLeftClick = useCallback(
    (id: string) => {
      if (disabled || showResult) return
      if (matches[id]) {
        // Remove existing match
        const newMatches = { ...matches }
        delete newMatches[id]
        setMatches(newMatches)
      } else {
        setSelectedLeft(id)
      }
    },
    [disabled, showResult, matches]
  )

  const handleRightClick = useCallback(
    (id: string) => {
      if (disabled || showResult || !selectedLeft) return

      // Check if this right item is already matched
      const existingLeft = Object.keys(matches).find((k) => matches[k] === id)
      if (existingLeft) {
        // Remove the existing match
        const newMatches = { ...matches }
        delete newMatches[existingLeft]
        setMatches(newMatches)
      }

      // Create new match
      setMatches((prev) => ({ ...prev, [selectedLeft]: id }))
      setSelectedLeft(null)
    },
    [disabled, showResult, selectedLeft, matches]
  )

  const getMatchedRight = useCallback(
    (rightId: string) => {
      return Object.keys(matches).find((k) => matches[k] === rightId)
    },
    [matches]
  )

  const handleCheck = useCallback(() => {
    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    // Check if all pairs are correct
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

  // Generate colors for matched pairs
  const pairColors = [
    "bg-blue-500/20 border-blue-500",
    "bg-green-500/20 border-green-500",
    "bg-purple-500/20 border-purple-500",
    "bg-orange-500/20 border-orange-500",
    "bg-pink-500/20 border-pink-500",
    "bg-cyan-500/20 border-cyan-500",
  ]

  const getMatchColor = useCallback(
    (leftId: string) => {
      const index = Object.keys(matches).indexOf(leftId)
      return index >= 0 ? pairColors[index % pairColors.length] : ""
    },
    [matches]
  )

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">{question}</h3>

      <p className="text-sm text-zinc-400">
        Соедините элементы слева с соответствующими элементами справа. Нажмите на элемент слева, затем на элемент
        справа.
      </p>

      <div className="grid grid-cols-2 gap-8">
        {/* Left column */}
        <div className="space-y-3">
          {leftItems.map((item) => {
            const isMatched = !!matches[item.id]
            const isSelected = selectedLeft === item.id
            const matchColor = getMatchColor(item.id)

            return (
              <button
                key={item.id}
                onClick={() => handleLeftClick(item.id)}
                disabled={disabled || showResult}
                className={cn(
                  "w-full p-4 rounded-lg border-2 text-left transition-all",
                  isMatched && matchColor,
                  isSelected && "border-indigo-500 bg-indigo-500/20",
                  !isMatched && !isSelected && "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500",
                  (disabled || showResult) && "cursor-default"
                )}
              >
                <span className="text-white">{item.text}</span>
              </button>
            )
          })}
        </div>

        {/* Right column */}
        <div className="space-y-3">
          {rightItems.map((item) => {
            const matchedLeftId = getMatchedRight(item.id)
            const isMatched = !!matchedLeftId
            const matchColor = matchedLeftId ? getMatchColor(matchedLeftId) : ""

            return (
              <button
                key={item.id}
                onClick={() => handleRightClick(item.id)}
                disabled={disabled || showResult || !selectedLeft}
                className={cn(
                  "w-full p-4 rounded-lg border-2 text-left transition-all",
                  isMatched && matchColor,
                  !isMatched && selectedLeft && "border-zinc-600 bg-zinc-800/50 hover:border-indigo-400",
                  !isMatched && !selectedLeft && "border-zinc-700 bg-zinc-800/50",
                  (disabled || showResult) && "cursor-default"
                )}
              >
                <span className="text-white">{item.text}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Result feedback */}
      {showResult && (
        <div
          className={cn("p-4 rounded-lg border", isCorrect ? "bg-green-500/10 border-green-500" : "bg-red-500/10 border-red-500")}
        >
          <p className={cn("font-medium", isCorrect ? "text-green-400" : "text-red-400")}>
            {isCorrect ? "Отлично! Все пары соединены правильно!" : "Некоторые пары соединены неправильно. Попробуйте ещё раз."}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {!showResult && (
          <button
            onClick={handleCheck}
            disabled={!allMatched || disabled}
            className={cn(
              "px-6 py-2 rounded-lg font-medium transition-colors",
              allMatched && !disabled
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
