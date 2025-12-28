"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react"

interface Question {
  id: string
  question: string
  options: string[]
  order: number
}

interface QuestionAttempt {
  questionId: string
  isCorrect: boolean
  attempts: number
  earnedScore: number
}

interface QuizSectionProps {
  questions: Question[]
  attempts: QuestionAttempt[]
  moduleSlug: string
}

export function QuizSection({ questions, attempts, moduleSlug }: QuizSectionProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    isCorrect: boolean
    message: string
    earnedScore: number
    attempts: number
    correctAnswer?: number
  } | null>(null)
  const [attemptData, setAttemptData] = useState<Record<string, QuestionAttempt>>(
    Object.fromEntries(attempts.map((a) => [a.questionId, a]))
  )

  if (questions.length === 0) {
    return null
  }

  const question = questions[currentQuestion]
  const existingAttempt = attemptData[question.id]
  const isAnswered = existingAttempt?.isCorrect || existingAttempt?.attempts >= 3

  const handleSubmit = async () => {
    if (selectedAnswer === null || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/questions/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          selectedAnswer,
        }),
      })

      const data = await response.json()
      setResult(data)

      // Update local attempt data
      setAttemptData((prev) => ({
        ...prev,
        [question.id]: {
          questionId: question.id,
          isCorrect: data.isCorrect,
          attempts: data.attempts,
          earnedScore: data.earnedScore,
        },
      }))
    } catch (error) {
      console.error("Error submitting answer:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer(null)
      setResult(null)
    }
  }

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
      setSelectedAnswer(null)
      setResult(null)
    }
  }

  // Calculate total score
  const totalScore = Object.values(attemptData).reduce((sum, a) => sum + (a.earnedScore || 0), 0)
  const answeredCount = Object.values(attemptData).filter((a) => a.isCorrect || a.attempts >= 3).length

  // Get score percentage color
  const getScoreColor = (attempts: number) => {
    if (attempts === 1) return "text-green-600"
    if (attempts === 2) return "text-yellow-600"
    return "text-orange-600"
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Проверка знаний
          </CardTitle>
          <div className="text-sm text-gray-500">
            {answeredCount} / {questions.length} вопросов
          </div>
        </div>
        {totalScore > 0 && (
          <div className="text-sm font-medium text-[#0176D3]">
            Заработано: {totalScore} XP
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Progress indicators */}
        <div className="flex gap-1 mb-6">
          {questions.map((q, idx) => {
            const attempt = attemptData[q.id]
            let bgColor = "bg-gray-200"
            if (attempt?.isCorrect) bgColor = "bg-green-500"
            else if (attempt?.attempts >= 3) bgColor = "bg-red-300"
            else if (idx === currentQuestion) bgColor = "bg-blue-500"

            return (
              <div
                key={q.id}
                className={`h-2 flex-1 rounded-full ${bgColor} cursor-pointer`}
                onClick={() => {
                  setCurrentQuestion(idx)
                  setSelectedAnswer(null)
                  setResult(null)
                }}
              />
            )
          })}
        </div>

        {/* Question */}
        <div className="mb-6">
          <div className="text-sm text-gray-500 mb-2">
            Вопрос {currentQuestion + 1} из {questions.length}
          </div>
          <h3 className="text-lg font-medium mb-4">{question.question}</h3>

          {/* Previously answered */}
          {isAnswered && !result && (
            <div className={`mb-4 p-3 rounded-lg ${existingAttempt.isCorrect ? "bg-green-50" : "bg-red-50"}`}>
              <div className="flex items-center gap-2">
                {existingAttempt.isCorrect ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-green-700">
                      Правильно!
                      <span className={`ml-2 ${getScoreColor(existingAttempt.attempts)}`}>
                        +{existingAttempt.earnedScore} XP
                        {existingAttempt.attempts === 1 && " (100%)"}
                        {existingAttempt.attempts === 2 && " (65%)"}
                        {existingAttempt.attempts === 3 && " (35%)"}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-red-700">Попытки исчерпаны (0 XP)</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, idx) => {
              let buttonClass = "w-full justify-start text-left h-auto py-3 px-4"

              if (result) {
                if (idx === result.correctAnswer) {
                  buttonClass += " bg-green-100 border-green-500 text-green-700"
                } else if (idx === selectedAnswer && !result.isCorrect) {
                  buttonClass += " bg-red-100 border-red-500 text-red-700"
                } else if (idx === selectedAnswer && result.isCorrect) {
                  buttonClass += " bg-green-100 border-green-500 text-green-700"
                }
              } else if (selectedAnswer === idx) {
                buttonClass += " border-blue-500 bg-blue-50"
              }

              const isDisabled = isAnswered || isSubmitting || result !== null

              return (
                <Button
                  key={idx}
                  variant="outline"
                  className={buttonClass}
                  onClick={() => !isDisabled && setSelectedAnswer(idx)}
                  disabled={isDisabled}
                >
                  <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                  {option}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Result message */}
        {result && (
          <div className={`mb-4 p-4 rounded-lg ${result.isCorrect ? "bg-green-50" : "bg-orange-50"}`}>
            <div className="flex items-center gap-2">
              {result.isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-orange-600" />
              )}
              <span className={result.isCorrect ? "text-green-700" : "text-orange-700"}>
                {result.message}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentQuestion === 0}
          >
            Назад
          </Button>

          <div className="flex gap-2">
            {!isAnswered && !result && (
              <Button
                onClick={handleSubmit}
                disabled={selectedAnswer === null || isSubmitting}
                className="bg-[#0176D3] hover:bg-[#0161B3]"
              >
                {isSubmitting ? "Проверка..." : "Ответить"}
              </Button>
            )}

            {(result || isAnswered) && currentQuestion < questions.length - 1 && (
              <Button onClick={handleNext}>
                Следующий вопрос
              </Button>
            )}

            {(result || isAnswered) && currentQuestion === questions.length - 1 && (
              <Badge variant="secondary" className="py-2 px-4">
                Все вопросы пройдены!
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
