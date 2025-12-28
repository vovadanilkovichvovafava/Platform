"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, HelpCircle, Lock } from "lucide-react"
import Link from "next/link"

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

interface AssessmentSectionProps {
  questions: Question[]
  initialAttempts: QuestionAttempt[]
  moduleId: string
  moduleSlug: string
  trailSlug: string
  modulePoints: number
  isCompleted: boolean
}

export function AssessmentSection({
  questions,
  initialAttempts,
  moduleId,
  moduleSlug,
  trailSlug,
  modulePoints,
  isCompleted: initialCompleted,
}: AssessmentSectionProps) {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(initialCompleted)
  const [result, setResult] = useState<{
    isCorrect: boolean
    message: string
    earnedScore: number
    attempts: number
    correctAnswer?: number
  } | null>(null)

  const [attemptData, setAttemptData] = useState<Record<string, QuestionAttempt>>(
    Object.fromEntries((initialAttempts || []).map((a) => [a.questionId, a]))
  )

  // Sync with props on mount and when initialAttempts change
  useEffect(() => {
    setAttemptData(
      Object.fromEntries((initialAttempts || []).map((a) => [a.questionId, a]))
    )
  }, [initialAttempts])

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Нет вопросов для этого модуля</p>
        </CardContent>
      </Card>
    )
  }

  const question = questions[currentQuestion]
  const existingAttempt = attemptData[question?.id]
  const isAnswered = existingAttempt?.isCorrect || (existingAttempt?.attempts ?? 0) >= 3

  // Calculate progress
  const totalQuestions = questions.length
  const answeredQuestions = Object.values(attemptData).filter(
    (a) => a.isCorrect || a.attempts >= 3
  ).length
  const allQuestionsAnswered = answeredQuestions === totalQuestions
  const totalScore = Object.values(attemptData).reduce((sum, a) => sum + (a.earnedScore || 0), 0)

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

      if (!response.ok) {
        const error = await response.json()
        setResult({
          isCorrect: false,
          message: error.error || "Ошибка при отправке ответа",
          earnedScore: 0,
          attempts: existingAttempt?.attempts || 0,
        })
        return
      }

      const data = await response.json()
      setResult(data)

      // Update local attempt data
      setAttemptData((prev) => ({
        ...prev,
        [question.id]: {
          questionId: question.id,
          isCorrect: data.isCorrect,
          attempts: data.attempts || 1,
          earnedScore: data.earnedScore || 0,
        },
      }))
    } catch (error) {
      console.error("Error submitting answer:", error)
      setResult({
        isCorrect: false,
        message: "Ошибка сети. Попробуйте снова.",
        earnedScore: 0,
        attempts: existingAttempt?.attempts || 0,
      })
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

  const handleComplete = async () => {
    if (!allQuestionsAnswered || isCompleting) return

    setIsCompleting(true)
    try {
      const response = await fetch("/api/modules/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId }),
      })

      if (response.ok) {
        setIsCompleted(true)
        router.refresh()
      }
    } catch (error) {
      console.error("Error completing module:", error)
    } finally {
      setIsCompleting(false)
    }
  }

  // Get score percentage color
  const getScoreColor = (attempts: number) => {
    if (attempts === 1) return "text-green-600"
    if (attempts === 2) return "text-yellow-600"
    return "text-orange-600"
  }

  if (isCompleted) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Оценка пройдена!</h3>
          <p className="text-gray-600 text-sm mb-4">
            Вы набрали {totalScore} XP
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/trails/${trailSlug}`}>К заданиям</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quiz Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Проверка знаний
            </CardTitle>
            <div className="text-sm text-gray-500">
              {answeredQuestions} / {totalQuestions} вопросов
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
                  className={`h-2 flex-1 rounded-full ${bgColor} cursor-pointer transition-colors`}
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
            <h3 className="text-lg font-medium mb-4">{question?.question}</h3>

            {/* Previously answered */}
            {isAnswered && !result && (
              <div className={`mb-4 p-3 rounded-lg ${existingAttempt?.isCorrect ? "bg-green-50" : "bg-red-50"}`}>
                <div className="flex items-center gap-2">
                  {existingAttempt?.isCorrect ? (
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
              {question?.options.map((option, idx) => {
                let buttonClass = "w-full justify-start text-left h-auto py-3 px-4"

                if (result) {
                  if (result.correctAnswer !== undefined && idx === result.correctAnswer) {
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

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handlePrev} disabled={currentQuestion === 0}>
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
                <Button onClick={handleNext}>Следующий вопрос</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Card */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Progress */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Прогресс теста</span>
                <span className="font-medium">{answeredQuestions}/{totalQuestions}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#0176D3] h-2 rounded-full transition-all"
                  style={{ width: `${(answeredQuestions / totalQuestions) * 100}%` }}
                />
              </div>
              {totalScore > 0 && (
                <p className="text-sm text-[#0176D3] mt-2">Набрано: {totalScore} XP</p>
              )}
            </div>

            {/* Complete Button */}
            <Button
              onClick={handleComplete}
              className="w-full bg-[#2E844A] hover:bg-[#256E3D] disabled:opacity-50"
              disabled={!allQuestionsAnswered || isCompleting}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isCompleting ? "Сохранение..." : "Завершить оценку"}
            </Button>
            {!allQuestionsAnswered && (
              <p className="text-xs text-orange-600 text-center">
                Ответьте на все вопросы для завершения
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
