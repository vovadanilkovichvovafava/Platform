"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Check, RotateCcw, ArrowRight } from "lucide-react"

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

// Colors for connected pairs
const PAIR_COLORS = [
  { bg: "bg-blue-500", border: "border-blue-500", line: "#3b82f6", light: "bg-blue-50" },
  { bg: "bg-emerald-500", border: "border-emerald-500", line: "#10b981", light: "bg-emerald-50" },
  { bg: "bg-violet-500", border: "border-violet-500", line: "#8b5cf6", light: "bg-violet-50" },
  { bg: "bg-amber-500", border: "border-amber-500", line: "#f59e0b", light: "bg-amber-50" },
  { bg: "bg-rose-500", border: "border-rose-500", line: "#f43f5e", light: "bg-rose-50" },
  { bg: "bg-teal-500", border: "border-teal-500", line: "#14b8a6", light: "bg-teal-50" },
]

export function MatchingExercise({
  question,
  leftItems,
  rightItems,
  correctPairs,
  leftLabel = "Выберите",
  rightLabel = "Соответствие",
  onComplete,
  disabled = false,
}: MatchingExerciseProps) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [matches, setMatches] = useState<Record<string, string>>({})
  const [attempts, setAttempts] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [itemPositions, setItemPositions] = useState<Record<string, { x: number; y: number }>>({})

  const containerRef = useRef<HTMLDivElement>(null)
  const leftRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const rightRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Update positions for SVG lines
  const updatePositions = useCallback(() => {
    if (!containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const newPositions: Record<string, { x: number; y: number }> = {}

    Object.entries(leftRefs.current).forEach(([id, el]) => {
      if (el) {
        const rect = el.getBoundingClientRect()
        newPositions[`left-${id}`] = {
          x: rect.right - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top,
        }
      }
    })

    Object.entries(rightRefs.current).forEach(([id, el]) => {
      if (el) {
        const rect = el.getBoundingClientRect()
        newPositions[`right-${id}`] = {
          x: rect.left - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top,
        }
      }
    })

    setItemPositions(newPositions)
  }, [])

  useEffect(() => {
    updatePositions()
    window.addEventListener("resize", updatePositions)
    // Update positions after a short delay to ensure layout is complete
    const timeout = setTimeout(updatePositions, 100)
    return () => {
      window.removeEventListener("resize", updatePositions)
      clearTimeout(timeout)
    }
  }, [updatePositions, matches])

  // Get color index for a left item
  const getColorIndex = useCallback((leftId: string) => {
    const matchedLeftIds = Object.keys(matches)
    const index = matchedLeftIds.indexOf(leftId)
    return index >= 0 ? index % PAIR_COLORS.length : -1
  }, [matches])

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

    // Many-to-one: allow multiple left items to connect to same right item
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

  // Render SVG connection lines with Bezier curves
  const renderLines = () => {
    const lines: React.ReactNode[] = []

    Object.entries(matches).forEach(([leftId, rightId], index) => {
      const leftPos = itemPositions[`left-${leftId}`]
      const rightPos = itemPositions[`right-${rightId}`]

      if (leftPos && rightPos) {
        const colorIndex = getColorIndex(leftId)
        const color = PAIR_COLORS[colorIndex]?.line || "#6366f1"

        // Check if this pair is correct (for result display)
        const isPairCorrect = showResult && correctPairs[leftId] === rightId
        const isPairWrong = showResult && correctPairs[leftId] !== rightId
        const strokeColor = isPairWrong ? "#ef4444" : isPairCorrect ? "#22c55e" : color

        // Calculate control points for Bezier curve
        const midX = (leftPos.x + rightPos.x) / 2
        // Add vertical offset based on index to prevent overlap
        const verticalOffset = (index - Object.keys(matches).length / 2) * 8

        const path = `M ${leftPos.x} ${leftPos.y}
                      C ${midX} ${leftPos.y + verticalOffset},
                        ${midX} ${rightPos.y + verticalOffset},
                        ${rightPos.x} ${rightPos.y}`

        lines.push(
          <g key={`${leftId}-${rightId}`}>
            {/* Glow effect */}
            <path
              d={path}
              fill="none"
              stroke={strokeColor}
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.15"
            />
            {/* Main line */}
            <path
              d={path}
              fill="none"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              className="transition-all duration-300"
            />
            {/* Start dot */}
            <circle cx={leftPos.x} cy={leftPos.y} r="5" fill={strokeColor} />
            {/* End dot */}
            <circle cx={rightPos.x} cy={rightPos.y} r="5" fill={strokeColor} />
          </g>
        )
      }
    })

    return lines
  }

  // Count how many left items are connected to each right item
  const getRightConnections = (rightId: string) => {
    return Object.values(matches).filter(id => id === rightId).length
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h3 className="text-xl font-bold text-gray-900">{question}</h3>
        <p className="text-sm text-gray-500">
          Нажмите на элемент слева, затем на соответствующий элемент справа
        </p>
      </div>

      {/* Matching area */}
      <div
        ref={containerRef}
        className="relative rounded-2xl p-4 sm:p-8"
      >
        {/* SVG for connection lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: "visible", zIndex: 5 }}
        >
          {renderLines()}
        </svg>

        {/* Column Labels */}
        <div className="grid grid-cols-[1fr,80px,1fr] sm:grid-cols-[1fr,120px,1fr] gap-2 mb-6">
          <div className="text-center">
            <span className="inline-block px-4 py-2 bg-slate-100 rounded-full text-sm font-semibold text-slate-600">
              {leftLabel}
            </span>
          </div>
          <div />
          <div className="text-center">
            <span className="inline-block px-4 py-2 bg-slate-100 rounded-full text-sm font-semibold text-slate-600">
              {rightLabel}
            </span>
          </div>
        </div>

        {/* Two columns with center spacing */}
        <div className="grid grid-cols-[1fr,80px,1fr] sm:grid-cols-[1fr,120px,1fr] gap-2 items-start">
          {/* Left column */}
          <div className="space-y-4">
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
                    "w-full min-h-[60px] px-4 py-3 rounded-xl text-left transition-all duration-200",
                    "border-2 shadow-sm",
                    "flex items-center gap-3",
                    "break-words hyphens-auto",
                    // Default state
                    !isMatched && !isSelected && "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md",
                    // Selected state
                    isSelected && "bg-indigo-50 border-indigo-500 ring-4 ring-indigo-100 shadow-lg",
                    // Matched state
                    isMatched && !showResult && colors && `${colors.light} ${colors.border}`,
                    // Result states
                    isPairCorrect && "bg-green-50 border-green-500",
                    isPairWrong && "bg-red-50 border-red-500",
                    // Disabled
                    (disabled || showResult) && "cursor-default"
                  )}
                >
                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    {isMatched && colors && !showResult && (
                      <div className={cn("w-3 h-3 rounded-full", colors.bg)} />
                    )}
                    {isPairCorrect && (
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {isPairWrong && (
                      <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">✕</span>
                      </div>
                    )}
                    {!isMatched && !isSelected && (
                      <div className="w-3 h-3 rounded-full border-2 border-gray-300" />
                    )}
                    {isSelected && (
                      <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                    )}
                  </div>

                  <span className={cn(
                    "text-sm sm:text-base font-medium leading-snug",
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

          {/* Center spacing - visual connection area */}
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <div className="hidden sm:flex flex-col items-center gap-2 text-gray-300">
              <ArrowRight className="w-6 h-6" />
            </div>
          </div>

          {/* Right column - centered vertically */}
          <div className="flex flex-col justify-center space-y-4 min-h-[300px]">
            {rightItems.map((item) => {
              const connectedCount = getRightConnections(item.id)
              const isConnected = connectedCount > 0
              const canClick = selectedLeft && !disabled && !showResult

              // Get the first connected left item's color
              const connectedLeftId = Object.keys(matches).find(k => matches[k] === item.id)
              const colorIndex = connectedLeftId ? getColorIndex(connectedLeftId) : -1
              const colors = colorIndex >= 0 ? PAIR_COLORS[colorIndex] : null

              // For result display
              const hasCorrectConnection = showResult && connectedLeftId && correctPairs[connectedLeftId] === item.id
              const hasWrongConnection = showResult && connectedLeftId && correctPairs[connectedLeftId] !== item.id

              return (
                <button
                  key={item.id}
                  ref={el => { rightRefs.current[item.id] = el }}
                  onClick={() => handleRightClick(item.id)}
                  disabled={disabled || showResult || !selectedLeft}
                  className={cn(
                    "w-full min-h-[70px] px-4 py-4 rounded-xl text-left transition-all duration-200",
                    "border-2 shadow-sm",
                    "flex items-center gap-3",
                    "break-words hyphens-auto",
                    // Default state
                    !isConnected && !canClick && "bg-white border-gray-200",
                    !isConnected && canClick && "bg-white border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md cursor-pointer",
                    // Connected state
                    isConnected && !showResult && colors && `${colors.light} ${colors.border}`,
                    // Result states
                    hasCorrectConnection && "bg-green-50 border-green-500",
                    hasWrongConnection && "bg-red-50 border-red-500",
                    // Disabled
                    (disabled || showResult) && "cursor-default"
                  )}
                >
                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    {isConnected && colors && !showResult && (
                      <div className="relative">
                        <div className={cn("w-3 h-3 rounded-full", colors.bg)} />
                        {connectedCount > 1 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-gray-700 text-white text-xs rounded-full flex items-center justify-center">
                            {connectedCount}
                          </span>
                        )}
                      </div>
                    )}
                    {hasCorrectConnection && (
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {hasWrongConnection && (
                      <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">✕</span>
                      </div>
                    )}
                    {!isConnected && (
                      <div className="w-3 h-3 rounded-full border-2 border-gray-300" />
                    )}
                  </div>

                  <span className={cn(
                    "text-base sm:text-lg font-semibold leading-snug",
                    hasCorrectConnection && "text-green-700",
                    hasWrongConnection && "text-red-700",
                    !showResult && "text-gray-800"
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
      <div className="flex items-center justify-center gap-3">
        <div className="flex gap-1.5">
          {leftItems.map((item, idx) => (
            <div
              key={item.id}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-300",
                matches[item.id]
                  ? showResult
                    ? correctPairs[item.id] === matches[item.id]
                      ? "bg-green-500 scale-110"
                      : "bg-red-500 scale-110"
                    : PAIR_COLORS[idx % PAIR_COLORS.length].bg
                  : "bg-gray-200"
              )}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-gray-500">
          {Object.keys(matches).length} из {leftItems.length}
        </span>
      </div>

      {/* Result feedback */}
      {showResult && (
        <div
          className={cn(
            "p-5 rounded-2xl text-center",
            isCorrect
              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200"
              : "bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200"
          )}
        >
          <p className={cn(
            "font-bold text-lg",
            isCorrect ? "text-green-700" : "text-red-700"
          )}>
            {isCorrect
              ? "Отлично! Все пары соединены правильно!"
              : "Есть ошибки. Попробуйте ещё раз."}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-4">
        {!showResult && (
          <button
            onClick={handleCheck}
            disabled={!allMatched || disabled}
            className={cn(
              "px-10 py-4 rounded-xl font-bold text-white transition-all duration-200",
              allMatched && !disabled
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                : "bg-gray-300 cursor-not-allowed"
            )}
          >
            Проверить
          </button>
        )}

        {showResult && !isCorrect && (
          <button
            onClick={handleRetry}
            className="px-10 py-4 rounded-xl font-bold bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Попробовать снова
          </button>
        )}
      </div>
    </div>
  )
}
