"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { GripVertical, ChevronUp, ChevronDown, Check, RotateCcw } from "lucide-react"

interface OrderingItem {
  id: string
  text: string
}

interface OrderingExerciseProps {
  question: string
  items: OrderingItem[]
  correctOrder: string[]
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
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    setItems((prev) => {
      const newItems = [...prev]
      const [removed] = newItems.splice(fromIndex, 1)
      newItems.splice(toIndex, 0, removed)
      return newItems
    })
  }, [])

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    if (disabled || showResult) return
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", index.toString())
  }, [disabled, showResult])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null) return
    setDragOverIndex(index)
  }, [draggedIndex])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null) return
    moveItem(draggedIndex, toIndex)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [draggedIndex, moveItem])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0 || disabled || showResult) return
    moveItem(index, index - 1)
  }, [disabled, showResult, moveItem])

  const handleMoveDown = useCallback((index: number) => {
    if (index === items.length - 1 || disabled || showResult) return
    moveItem(index, index + 1)
  }, [disabled, showResult, items.length, moveItem])

  const handleCheck = useCallback(() => {
    const newAttempts = attempts + 1
    setAttempts(newAttempts)

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
    setItems((prev) => [...prev].sort(() => Math.random() - 0.5))
  }, [])

  // Get position status for result display
  const getPositionStatus = (item: OrderingItem, index: number) => {
    if (!showResult) return null
    return correctOrder[index] === item.id ? "correct" : "wrong"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-gray-900">{question}</h3>
        <p className="text-sm text-gray-500">
          Перетащите элементы или используйте стрелки, чтобы расставить их в правильном порядке
        </p>
      </div>

      {/* Ordering area */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
        <div className="space-y-2">
          {items.map((item, index) => {
            const status = getPositionStatus(item, index)
            const isDragging = draggedIndex === index
            const isDragOver = dragOverIndex === index && draggedIndex !== index

            return (
              <div
                key={item.id}
                draggable={!disabled && !showResult}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                  "bg-white shadow-sm",
                  // Default state
                  !showResult && !isDragging && !isDragOver && "border-gray-200 hover:border-gray-300 hover:shadow-md",
                  // Dragging state
                  isDragging && "opacity-50 scale-95 border-indigo-300",
                  // Drag over state
                  isDragOver && "border-indigo-500 bg-indigo-50 scale-[1.02] shadow-lg",
                  // Result states
                  status === "correct" && "border-green-500 bg-green-50",
                  status === "wrong" && "border-red-500 bg-red-50",
                  // Cursor
                  !disabled && !showResult && "cursor-grab active:cursor-grabbing"
                )}
              >
                {/* Drag handle */}
                {!showResult && (
                  <div className="text-gray-400 hover:text-gray-600 transition-colors">
                    <GripVertical className="w-5 h-5" />
                  </div>
                )}

                {/* Position number */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                    "transition-all duration-200",
                    !showResult && "bg-gray-100 text-gray-600",
                    status === "correct" && "bg-green-500 text-white",
                    status === "wrong" && "bg-red-500 text-white"
                  )}
                >
                  {status === "correct" ? (
                    <Check className="w-5 h-5" />
                  ) : status === "wrong" ? (
                    <span className="text-lg">✕</span>
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Text */}
                <span
                  className={cn(
                    "flex-1 font-medium",
                    !showResult && "text-gray-700",
                    status === "correct" && "text-green-700",
                    status === "wrong" && "text-red-700"
                  )}
                >
                  {item.text}
                </span>

                {/* Arrow buttons */}
                {!disabled && !showResult && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        index === 0
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === items.length - 1}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        index === items.length - 1
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Show correct position if wrong */}
                {status === "wrong" && (
                  <div className="text-xs text-red-500 font-medium bg-red-100 px-2 py-1 rounded-full">
                    → {correctOrder.indexOf(item.id) + 1}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {items.map((item, index) => {
          const status = getPositionStatus(item, index)
          return (
            <div
              key={item.id}
              className={cn(
                "w-8 h-2 rounded-full transition-all",
                !showResult && "bg-gray-200",
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
              ? "Отлично! Порядок правильный!"
              : "Порядок неправильный. Красные числа показывают правильные позиции."}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        {!showResult && (
          <button
            onClick={handleCheck}
            disabled={disabled}
            className={cn(
              "px-8 py-3 rounded-xl font-semibold text-white transition-all",
              "shadow-lg hover:shadow-xl hover:-translate-y-0.5",
              !disabled
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
