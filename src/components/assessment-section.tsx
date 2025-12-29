"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, HelpCircle, RotateCcw } from "lucide-react"
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
  const [showResult, setShowResult] = useState(false)
  const [lastResult, setLastResult] = useState<{
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
  const currentAttempts = existingAttempt?.attempts || 0
  const remainingAttempts = 3 - currentAttempts
  const isQuestionFinished = existingAttempt?.isCorrect || currentAttempts >= 3

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
        setLastResult({
          isCorrect: false,
          message: error.error || "Ошибка при отправке ответа",
          earnedScore: 0,
          attempts: currentAttempts,
        })
        setShowResult(true)
        return
      }

      const data = await response.json()
      setLastResult(data)
      setShowResult(true)

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
      setLastResult({
        isCorrect: false,
        message: "Ошибка сети. Попробуйте снова.",
        earnedScore: 0,
        attempts: currentAttempts,
      })
      setShowResult(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTryAgain = () => {
    setSelectedAnswer(null)
    setShowResult(false)
    setLastResult(null)
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer(null)
      setShowResult(false)
      setLastResult(null)
    }
  }

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
      setSelectedAnswer(null)
      setShowResult(false)
      setLastResult(null)
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

  // Check if we should allow retry (wrong answer but attempts left)
  const canRetry = showResult && lastResult && !lastResult.isCorrect && (lastResult.attempts || 0) < 3

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
                    setShowResult(false)
                    setLastResult(null)
                  }}
                />
              )
            })}
          </div>

          {/* Question */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                Вопрос {currentQuestion + 1} из {questions.length}
              </span>
              {!isQuestionFinished && (
                <span className="text-sm text-gray-500">
                  Попыток: {remainingAttempts} из 3
                </span>
              )}
            </div>
            <h3 className="text-lg font-medium mb-4">{question?.question}</h3>

            {/* Previously finished question (not current result) */}
            {isQuestionFinished && !showResult && (
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
                // Determine button styling
                let buttonClass = "w-full justify-start text-left h-auto py-3 px-4 whitespace-normal transition-all"
                let isDisabled = isQuestionFinished || isSubmitting

                // Show correct/incorrect after submit
                if (showResult && lastResult) {
                  isDisabled = true
                  if (lastResult.correctAnswer !== undefined && idx === lastResult.correctAnswer) {
                    buttonClass += " bg-green-100 border-green-500 border-2 text-green-700"
                  } else if (idx === selectedAnswer && !lastResult.isCorrect) {
                    buttonClass += " bg-red-100 border-red-500 border-2 text-red-700"
                  } else if (idx === selectedAnswer && lastResult.isCorrect) {
                    buttonClass += " bg-green-100 border-green-500 border-2 text-green-700"
                  }
                } else if (selectedAnswer === idx) {
                  // Selected but not yet submitted - prominent highlight
                  buttonClass += " border-blue-600 border-2 bg-blue-100 ring-2 ring-blue-300 ring-offset-1"
                }

                return (
                  <Button
                    key={idx}
                    variant="outline"
                    className={buttonClass}
                    onClick={() => !isDisabled && setSelectedAnswer(idx)}
                    disabled={isDisabled}
                  >
                    <span className="font-medium mr-2 shrink-0">{String.fromCharCode(65 + idx)}.</span>
                    <span className="text-left">{option}</span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Result message */}
          {showResult && lastResult && (
            <div className={`mb-4 p-4 rounded-lg ${lastResult.isCorrect ? "bg-green-50" : "bg-orange-50"}`}>
              <div className="flex items-center gap-2">
                {lastResult.isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-orange-600" />
                )}
                <span className={lastResult.isCorrect ? "text-green-700" : "text-orange-700"}>
                  {lastResult.message}
                </span>
              </div>
              {canRetry && (
                <p className="text-sm text-orange-600 mt-2">
                  Осталось попыток: {3 - (lastResult.attempts || 0)}
                </p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handlePrev} disabled={currentQuestion === 0}>
              Назад
            </Button>

            <div className="flex gap-2">
              {/* Try Again button - when wrong but has attempts left */}
              {canRetry && (
                <Button
                  onClick={handleTryAgain}
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Попробовать снова
                </Button>
              )}

              {/* Submit button - when not finished and not showing result */}
              {!isQuestionFinished && !showResult && (
                <Button
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null || isSubmitting}
                  className="bg-[#0176D3] hover:bg-[#0161B3]"
                >
                  {isSubmitting ? "Проверка..." : "Ответить"}
                </Button>
              )}

              {/* Next button - when question is finished OR correct answer */}
              {(isQuestionFinished || (showResult && lastResult?.isCorrect)) &&
               currentQuestion < questions.length - 1 && (
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
