"use client"

import { useState, useCallback, useRef, useEffect } from "react"
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
  onComplete: (isCorrect: boolean, attempts: number) => void
  disabled?: boolean
}

// Colors for connected pairs
const PAIR_COLORS = [
  { bg: "bg-blue-500", border: "border-blue-500", line: "#3b82f6" },
  { bg: "bg-emerald-500", border: "border-emerald-500", line: "#10b981" },
  { bg: "bg-purple-500", border: "border-purple-500", line: "#a855f7" },
  { bg: "bg-amber-500", border: "border-amber-500", line: "#f59e0b" },
  { bg: "bg-pink-500", border: "border-pink-500", line: "#ec4899" },
  { bg: "bg-cyan-500", border: "border-cyan-500", line: "#06b6d4" },
]

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
  const [itemPositions, setItemPositions] = useState<Record<string, DOMRect>>({})

  const containerRef = useRef<HTMLDivElement>(null)
  const leftRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const rightRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Update positions for SVG lines
  const updatePositions = useCallback(() => {
    if (!containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const newPositions: Record<string, DOMRect> = {}

    Object.entries(leftRefs.current).forEach(([id, el]) => {
      if (el) {
        const rect = el.getBoundingClientRect()
        newPositions[`left-${id}`] = new DOMRect(
          rect.right - containerRect.left,
          rect.top + rect.height / 2 - containerRect.top,
          rect.width,
          rect.height
        )
      }
    })

    Object.entries(rightRefs.current).forEach(([id, el]) => {
      if (el) {
        const rect = el.getBoundingClientRect()
        newPositions[`right-${id}`] = new DOMRect(
          rect.left - containerRect.left,
          rect.top + rect.height / 2 - containerRect.top,
          rect.width,
          rect.height
        )
      }
    })

    setItemPositions(newPositions)
  }, [])

  useEffect(() => {
    updatePositions()
    window.addEventListener("resize", updatePositions)
    return () => window.removeEventListener("resize", updatePositions)
  }, [updatePositions, matches])

  // Get color index for a left item
  const getColorIndex = useCallback((leftId: string) => {
    const matchedLeftIds = Object.keys(matches)
    const index = matchedLeftIds.indexOf(leftId)
    return index >= 0 ? index % PAIR_COLORS.length : -1
  }, [matches])

  // Get color index for a right item (by finding which left is connected)
  const getRightColorIndex = useCallback((rightId: string) => {
    const leftId = Object.keys(matches).find(k => matches[k] === rightId)
    return leftId ? getColorIndex(leftId) : -1
  }, [matches, getColorIndex])

  const handleLeftClick = useCallback((id: string) => {
    if (disabled || showResult) return

    if (matches[id]) {
      // Remove existing match
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

    // Check if this right item is already matched
    const existingLeft = Object.keys(matches).find(k => matches[k] === id)
    if (existingLeft) {
      // Remove the existing match
      const newMatches = { ...matches }
      delete newMatches[existingLeft]
      setMatches(newMatches)
    }

    // Create new match
    setMatches(prev => ({ ...prev, [selectedLeft]: id }))
    setSelectedLeft(null)
  }, [disabled, showResult, selectedLeft, matches])

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

  // Render SVG connection lines
  const renderLines = () => {
    const lines: JSX.Element[] = []

    Object.entries(matches).forEach(([leftId, rightId]) => {
      const leftPos = itemPositions[`left-${leftId}`]
      const rightPos = itemPositions[`right-${rightId}`]

      if (leftPos && rightPos) {
        const colorIndex = getColorIndex(leftId)
        const color = PAIR_COLORS[colorIndex]?.line || "#6366f1"

        // Check if this pair is correct (for result display)
        const isPairCorrect = showResult && correctPairs[leftId] === rightId
        const isPairWrong = showResult && correctPairs[leftId] !== rightId
        const strokeColor = isPairWrong ? "#ef4444" : isPairCorrect ? "#22c55e" : color

        lines.push(
          <g key={`${leftId}-${rightId}`}>
            {/* Glow effect */}
            <line
              x1={leftPos.x}
              y1={leftPos.y}
              x2={rightPos.x}
              y2={rightPos.y}
              stroke={strokeColor}
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.3"
            />
            {/* Main line */}
            <line
              x1={leftPos.x}
              y1={leftPos.y}
              x2={rightPos.x}
              y2={rightPos.y}
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              className="transition-all duration-300"
            />
            {/* Connection dots */}
            <circle cx={leftPos.x} cy={leftPos.y} r="6" fill={strokeColor} />
            <circle cx={rightPos.x} cy={rightPos.y} r="6" fill={strokeColor} />
          </g>
        )
      }
    })

    return lines
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-gray-900">{question}</h3>
        <p className="text-sm text-gray-500">
          Нажмите на элемент слева, затем на соответствующий элемент справа
        </p>
      </div>

      {/* Matching area */}
      <div
        ref={containerRef}
        className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 min-h-[400px]"
      >
        {/* SVG for connection lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ overflow: "visible" }}
        >
          {renderLines()}
        </svg>

        {/* Two columns */}
        <div className="grid grid-cols-2 gap-8 relative z-20">
          {/* Left column */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 text-center">
              Задачи
            </div>
            {leftItems.map((item) => {
              const isMatched = !!matches[item.id]
              const isSelected = selectedLeft === item.id
              const colorIndex = getColorIndex(item.id)
              const colors = colorIndex >= 0 ? PAIR_COLORS[colorIndex] : null

              // For result display
              const isPairCorrect = showResult && isMatched && correctPairs[item.id] === matches[item.id]
              const isPairWrong = showResult && isMatched && correctPairs[item.id] !== matches[item.id]

              return (
                <button
                  key={item.id}
                  ref={el => { leftRefs.current[item.id] = el }}
                  onClick={() => handleLeftClick(item.id)}
                  disabled={disabled || showResult}
                  className={cn(
                    "w-full p-4 rounded-xl text-left transition-all duration-200",
                    "border-2 shadow-sm hover:shadow-md",
                    "flex items-center gap-3",
                    // Default state
                    !isMatched && !isSelected && "bg-white border-gray-200 hover:border-gray-300",
                    // Selected state
                    isSelected && "bg-indigo-50 border-indigo-500 ring-4 ring-indigo-100 shadow-lg scale-[1.02]",
                    // Matched state
                    isMatched && !showResult && colors && `bg-white ${colors.border}`,
                    // Result states
                    isPairCorrect && "bg-green-50 border-green-500",
                    isPairWrong && "bg-red-50 border-red-500",
                    // Disabled
                    (disabled || showResult) && "cursor-default"
                  )}
                >
                  {/* Color indicator dot */}
                  {isMatched && colors && !showResult && (
                    <div className={cn("w-3 h-3 rounded-full flex-shrink-0", colors.bg)} />
                  )}
                  {isPairCorrect && (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {isPairWrong && (
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">✕</span>
                    </div>
                  )}
                  <span className={cn(
                    "font-medium",
                    isPairCorrect && "text-green-700",
                    isPairWrong && "text-red-700",
                    !showResult && "text-gray-700"
                  )}>
                    {item.text}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Right column */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 text-center">
              Роли
            </div>
            {rightItems.map((item) => {
              const colorIndex = getRightColorIndex(item.id)
              const colors = colorIndex >= 0 ? PAIR_COLORS[colorIndex] : null
              const isMatched = colorIndex >= 0
              const canClick = selectedLeft && !disabled && !showResult

              // For result display - check if any connected pair is wrong
              const connectedLeftId = Object.keys(matches).find(k => matches[k] === item.id)
              const isPairCorrect = showResult && connectedLeftId && correctPairs[connectedLeftId] === item.id
              const isPairWrong = showResult && connectedLeftId && correctPairs[connectedLeftId] !== item.id

              return (
                <button
                  key={item.id}
                  ref={el => { rightRefs.current[item.id] = el }}
                  onClick={() => handleRightClick(item.id)}
                  disabled={disabled || showResult || !selectedLeft}
                  className={cn(
                    "w-full p-4 rounded-xl text-left transition-all duration-200",
                    "border-2 shadow-sm",
                    "flex items-center gap-3",
                    // Default state
                    !isMatched && !canClick && "bg-white border-gray-200",
                    !isMatched && canClick && "bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md cursor-pointer",
                    // Matched state
                    isMatched && !showResult && colors && `bg-white ${colors.border}`,
                    // Result states
                    isPairCorrect && "bg-green-50 border-green-500",
                    isPairWrong && "bg-red-50 border-red-500",
                    // Disabled
                    (disabled || showResult) && "cursor-default"
                  )}
                >
                  {/* Color indicator dot */}
                  {isMatched && colors && !showResult && (
                    <div className={cn("w-3 h-3 rounded-full flex-shrink-0", colors.bg)} />
                  )}
                  {isPairCorrect && (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {isPairWrong && (
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">✕</span>
                    </div>
                  )}
                  <span className={cn(
                    "font-medium",
                    isPairCorrect && "text-green-700",
                    isPairWrong && "text-red-700",
                    !showResult && "text-gray-700"
                  )}>
                    {item.text}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
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
        <span className="ml-2 text-sm text-gray-500">
          {Object.keys(matches).length} / {leftItems.length}
        </span>
      </div>

      {/* Result feedback */}
      {showResult && (
        <div
          className={cn(
            "p-4 rounded-xl border-2 text-center",
            isCorrect
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          )}
        >
          <p className={cn(
            "font-semibold text-lg",
            isCorrect ? "text-green-700" : "text-red-700"
          )}>
            {isCorrect
              ? "Отлично! Все пары соединены правильно!"
              : "Есть ошибки. Попробуйте ещё раз."}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        {!showResult && (
          <button
            onClick={handleCheck}
            disabled={!allMatched || disabled}
            className={cn(
              "px-8 py-3 rounded-xl font-semibold text-white transition-all",
              "shadow-lg hover:shadow-xl hover:-translate-y-0.5",
              allMatched && !disabled
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
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
