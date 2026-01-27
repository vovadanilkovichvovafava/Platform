"use client"

import { useState, useEffect, useCallback } from "react"
import { safeJsonParse } from "@/lib/utils"
import type {
  QuestionType,
  QuestionEditorState,
  ModuleFromAPI,
  MatchingData,
  OrderingData,
  CaseAnalysisData,
  QuestionData,
  EditorMode,
} from "@/types/content"
import {
  getDefaultMatchingData,
  getDefaultOrderingData,
  getDefaultCaseAnalysisData,
} from "@/types/content"

interface UseModuleEditorOptions {
  moduleId: string
  mode: EditorMode
}

interface ModuleEditorState {
  module: ModuleFromAPI | null
  loading: boolean
  saving: boolean
  error: string
  success: string
  // Form fields
  title: string
  description: string
  content: string
  requirements: string
  points: number
  duration: string
  requiresSubmission: boolean
  questions: QuestionEditorState[]
}

export function useModuleEditor({ moduleId, mode }: UseModuleEditorOptions) {
  const [state, setState] = useState<ModuleEditorState>({
    module: null,
    loading: true,
    saving: false,
    error: "",
    success: "",
    title: "",
    description: "",
    content: "",
    requirements: "",
    points: 0,
    duration: "",
    requiresSubmission: false,
    questions: [],
  })

  const setField = useCallback(<K extends keyof ModuleEditorState>(
    field: K,
    value: ModuleEditorState[K]
  ) => {
    setState((prev) => ({ ...prev, [field]: value }))
  }, [])

  const setTitle = useCallback((value: string) => setField("title", value), [setField])
  const setDescription = useCallback((value: string) => setField("description", value), [setField])
  const setContent = useCallback((value: string) => setField("content", value), [setField])
  const setRequirements = useCallback((value: string) => setField("requirements", value), [setField])
  const setPoints = useCallback((value: number) => setField("points", value), [setField])
  const setDuration = useCallback((value: string) => setField("duration", value), [setField])
  const setRequiresSubmission = useCallback((value: boolean) => setField("requiresSubmission", value), [setField])
  const setQuestions = useCallback((value: QuestionEditorState[]) => setField("questions", value), [setField])

  const clearError = useCallback(() => setField("error", ""), [setField])
  const clearSuccess = useCallback(() => setField("success", ""), [setField])

  // Helper to get default data for question type
  const getDefaultData = useCallback((type: QuestionType): QuestionData => {
    switch (type) {
      case "MATCHING":
        return getDefaultMatchingData()
      case "ORDERING":
        return getDefaultOrderingData()
      case "CASE_ANALYSIS":
        return getDefaultCaseAnalysisData()
      default:
        return null
    }
  }, [])

  // Parse question from API format to editor format
  const parseQuestion = useCallback((q: ModuleFromAPI["questions"][0]): QuestionEditorState => {
    const questionType = (q.type as QuestionType) || "SINGLE_CHOICE"
    let questionData: QuestionData = q.data ? safeJsonParse(q.data, null) : null

    // Ensure default data for complex types
    if (questionType === "MATCHING" && (!questionData || !("leftItems" in questionData))) {
      questionData = getDefaultMatchingData()
    } else if (questionType === "ORDERING" && (!questionData || !("correctOrder" in questionData))) {
      questionData = getDefaultOrderingData()
    } else if (questionType === "CASE_ANALYSIS" && (!questionData || !("caseContent" in questionData))) {
      questionData = getDefaultCaseAnalysisData()
    }

    return {
      id: q.id,
      type: questionType,
      question: q.question,
      options: safeJsonParse<string[]>(q.options, []),
      correctAnswer: q.correctAnswer,
      data: questionData,
    }
  }, [])

  // Fetch module data
  const fetchModule = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: "" }))

      const res = await fetch(`/api/admin/modules/${moduleId}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to fetch module")
      }

      const data: ModuleFromAPI = await res.json()

      setState((prev) => ({
        ...prev,
        module: data,
        loading: false,
        title: data.title,
        description: data.description || "",
        content: data.content || "",
        requirements: data.requirements || "",
        points: data.points,
        duration: data.duration || "",
        requiresSubmission: data.requiresSubmission || false,
        questions: data.questions.map(parseQuestion),
      }))
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Ошибка загрузки модуля",
      }))
    }
  }, [moduleId, parseQuestion])

  // Save module
  const saveModule = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, saving: true, error: "", success: "" }))

      // Save module basic info
      const moduleRes = await fetch(`/api/admin/modules/${moduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.title,
          description: state.description,
          content: state.content,
          requirements: state.requirements,
          points: state.points,
          duration: state.duration,
          requiresSubmission: state.requiresSubmission,
        }),
      })

      if (!moduleRes.ok) {
        const data = await moduleRes.json()
        throw new Error(data.error || "Failed to save module")
      }

      // Save questions
      for (const q of state.questions) {
        const questionData = {
          moduleId,
          type: q.type,
          question: q.question,
          options: q.type === "SINGLE_CHOICE" ? q.options : [],
          correctAnswer: q.correctAnswer,
          data: q.data,
        }

        if (q.isNew) {
          await fetch("/api/admin/questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(questionData),
          })
        } else if (q.id) {
          await fetch(`/api/admin/questions/${q.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(questionData),
          })
        }
      }

      setState((prev) => ({ ...prev, saving: false, success: "Сохранено!" }))
      setTimeout(() => setState((prev) => ({ ...prev, success: "" })), 3000)

      // Refresh to get updated IDs
      fetchModule()
    } catch (err) {
      setState((prev) => ({
        ...prev,
        saving: false,
        error: err instanceof Error ? err.message : "Ошибка сохранения",
      }))
    }
  }, [moduleId, state, fetchModule])

  // Question manipulation
  const addQuestion = useCallback((type: QuestionType = "SINGLE_CHOICE") => {
    const newQuestion: QuestionEditorState = {
      type,
      question: "",
      options: type === "SINGLE_CHOICE" ? ["", "", "", ""] : [],
      correctAnswer: 0,
      data: getDefaultData(type),
      isNew: true,
    }
    setState((prev) => ({ ...prev, questions: [...prev.questions, newQuestion] }))
  }, [getDefaultData])

  const updateQuestion = useCallback((index: number, field: string, value: unknown) => {
    setState((prev) => {
      const updated = [...prev.questions]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, questions: updated }
    })
  }, [])

  const updateQuestionData = useCallback((
    index: number,
    newData: Partial<MatchingData | OrderingData | CaseAnalysisData>
  ) => {
    setState((prev) => {
      const updated = [...prev.questions]
      updated[index] = {
        ...updated[index],
        data: { ...updated[index].data, ...newData } as QuestionData,
      }
      return { ...prev, questions: updated }
    })
  }, [])

  const updateOption = useCallback((qIndex: number, oIndex: number, value: string) => {
    setState((prev) => {
      const updated = [...prev.questions]
      const options = [...updated[qIndex].options]
      options[oIndex] = value
      updated[qIndex] = { ...updated[qIndex], options }
      return { ...prev, questions: updated }
    })
  }, [])

  const deleteQuestion = useCallback(async (index: number) => {
    const q = state.questions[index]
    if (q.id) {
      try {
        await fetch(`/api/admin/questions/${q.id}`, { method: "DELETE" })
      } catch {
        setState((prev) => ({ ...prev, error: "Ошибка удаления вопроса" }))
        return
      }
    }
    setState((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }))
  }, [state.questions])

  // Initial fetch
  useEffect(() => {
    fetchModule()
  }, [fetchModule])

  return {
    // State
    module: state.module,
    loading: state.loading,
    saving: state.saving,
    error: state.error,
    success: state.success,

    // Form fields
    title: state.title,
    description: state.description,
    content: state.content,
    requirements: state.requirements,
    points: state.points,
    duration: state.duration,
    requiresSubmission: state.requiresSubmission,
    questions: state.questions,

    // Setters
    setTitle,
    setDescription,
    setContent,
    setRequirements,
    setPoints,
    setDuration,
    setRequiresSubmission,
    setQuestions,

    // Actions
    fetchModule,
    saveModule,
    clearError,
    clearSuccess,

    // Question actions
    addQuestion,
    updateQuestion,
    updateQuestionData,
    updateOption,
    deleteQuestion,

    // Computed
    isProject: state.module?.type === "PROJECT",
    mode,
  }
}
