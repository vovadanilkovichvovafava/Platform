"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react"

interface OrderingItem {
  id: string
  text: string
}

interface OrderingExerciseProps {
  question: string
  items: OrderingItem[] // Items in shuffled order
  correctOrder: string[] // Array of IDs in correct order
  onComplete: (isCorrect: boolean, attempts: number) => void
  disabled?: boolean
}

export function OrderingExercise({
  question,
  items: initialItems,
  correctOrder,
  onComplete,
  disabled = false,
}: OrderingExerciseProps) {
  const [items, setItems] = useState<OrderingItem[]>(initialItems)
  const [attempts, setAttempts] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    setItems((prev) => {
      const newItems = [...prev]
      const [removed] = newItems.splice(fromIndex, 1)
      newItems.splice(toIndex, 0, removed)
      return newItems
    })
  }, [])

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      if (disabled || showResult) return
      setDraggedIndex(index)
      e.dataTransfer.effectAllowed = "move"
    },
    [disabled, showResult]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      if (draggedIndex === null || draggedIndex === index) return
      moveItem(draggedIndex, index)
      setDraggedIndex(index)
    },
    [draggedIndex, moveItem]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
  }, [])

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0 || disabled || showResult) return
      moveItem(index, index - 1)
    },
    [disabled, showResult, moveItem]
  )

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === items.length - 1 || disabled || showResult) return
      moveItem(index, index + 1)
    },
    [disabled, showResult, items.length, moveItem]
  )

  const handleCheck = useCallback(() => {
    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    // Check if order is correct
    const currentOrder = items.map((item) => item.id)
    const allCorrect = correctOrder.every((id, index) => currentOrder[index] === id)

    setIsCorrect(allCorrect)
    setShowResult(true)

    if (allCorrect) {
      onComplete(true, newAttempts)
    }
  }, [attempts, items, correctOrder, onComplete])

  const handleRetry = useCallback(() => {
    setShowResult(false)
    setIsCorrect(false)
    // Shuffle items again
    setItems((prev) => [...prev].sort(() => Math.random() - 0.5))
  }, [])

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">{question}</h3>

      <p className="text-sm text-zinc-400">
        Расположите элементы в правильном порядке. Перетащите элементы или используйте стрелки.
      </p>

      <div className="space-y-2">
        {items.map((item, index) => {
          const isInCorrectPosition = showResult && correctOrder[index] === item.id

          return (
            <div
              key={item.id}
              draggable={!disabled && !showResult}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                draggedIndex === index && "opacity-50",
                showResult && isInCorrectPosition && "border-green-500 bg-green-500/10",
                showResult && !isInCorrectPosition && "border-red-500 bg-red-500/10",
                !showResult && "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500",
                !disabled && !showResult && "cursor-grab active:cursor-grabbing"
              )}
            >
              {/* Drag handle */}
              <div className="text-zinc-500">
                <GripVertical className="w-5 h-5" />
              </div>

              {/* Position number */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  showResult && isInCorrectPosition && "bg-green-500 text-white",
                  showResult && !isInCorrectPosition && "bg-red-500 text-white",
                  !showResult && "bg-zinc-700 text-zinc-300"
                )}
              >
                {index + 1}
              </div>

              {/* Text */}
              <span className="flex-1 text-white">{item.text}</span>

              {/* Arrow buttons for mobile/accessibility */}
              {!disabled && !showResult && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className={cn(
                      "p-1 rounded hover:bg-zinc-700 transition-colors",
                      index === 0 ? "text-zinc-600 cursor-not-allowed" : "text-zinc-400"
                    )}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === items.length - 1}
                    className={cn(
                      "p-1 rounded hover:bg-zinc-700 transition-colors",
                      index === items.length - 1 ? "text-zinc-600 cursor-not-allowed" : "text-zinc-400"
                    )}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
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
              ? "Отлично! Порядок правильный!"
              : "Порядок неправильный. Посмотрите на подсвеченные элементы и попробуйте снова."}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {!showResult && (
          <button
            onClick={handleCheck}
            disabled={disabled}
            className={cn(
              "px-6 py-2 rounded-lg font-medium transition-colors",
              !disabled ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
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
