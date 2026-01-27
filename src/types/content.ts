/**
 * Shared types for content editing (admin and teacher)
 */

export type QuestionType = "SINGLE_CHOICE" | "MATCHING" | "ORDERING" | "CASE_ANALYSIS"

export interface MatchingData {
  leftLabel: string
  rightLabel: string
  leftItems: { id: string; text: string }[]
  rightItems: { id: string; text: string }[]
  correctPairs: Record<string, string>
}

export interface OrderingData {
  items: { id: string; text: string }[]
  correctOrder: string[]
}

export interface CaseAnalysisData {
  caseContent: string
  caseLabel: string
  options: { id: string; text: string; isCorrect: boolean; explanation: string }[]
  minCorrectRequired: number
}

export type QuestionData = MatchingData | OrderingData | CaseAnalysisData | null

export interface QuestionFromAPI {
  id: string
  type: string
  question: string
  options: string
  correctAnswer: number
  data: string | null
  order: number
}

export interface QuestionEditorState {
  id?: string
  type: QuestionType
  question: string
  options: string[]
  correctAnswer: number
  data: QuestionData
  isNew?: boolean
}

export interface ModuleFromAPI {
  id: string
  slug: string
  title: string
  description: string
  content: string | null
  requirements: string | null
  type: "THEORY" | "PRACTICE" | "PROJECT"
  level: string
  points: number
  duration: string
  order: number
  requiresSubmission: boolean
  trailId: string
  trail: {
    id: string
    title: string
    slug: string
  }
  questions: QuestionFromAPI[]
}

export interface TrailFromAPI {
  id: string
  slug: string
  title: string
  subtitle: string
  description: string
  icon: string
  color: string
  duration: string
  isPublished: boolean
  modules: ModuleListItem[]
}

export interface ModuleListItem {
  id: string
  slug: string
  title: string
  description: string
  type: "THEORY" | "PRACTICE" | "PROJECT"
  level: string
  points: number
  duration: string
  order: number
  _count: {
    questions: number
  }
}

// Editor mode determines permissions and UI variations
export type EditorMode = "admin" | "teacher"

export interface ModuleEditorConfig {
  mode: EditorMode
  backUrl: string
  canEditTrail?: boolean
  canDeleteModule?: boolean
}

// Default question data factories
export function getDefaultMatchingData(): MatchingData {
  return {
    leftLabel: "Термин",
    rightLabel: "Определение",
    leftItems: [
      { id: "l1", text: "" },
      { id: "l2", text: "" },
      { id: "l3", text: "" },
    ],
    rightItems: [
      { id: "r1", text: "" },
      { id: "r2", text: "" },
      { id: "r3", text: "" },
    ],
    correctPairs: { l1: "r1", l2: "r2", l3: "r3" },
  }
}

export function getDefaultOrderingData(): OrderingData {
  return {
    items: [
      { id: "s1", text: "" },
      { id: "s2", text: "" },
      { id: "s3", text: "" },
    ],
    correctOrder: ["s1", "s2", "s3"],
  }
}

export function getDefaultCaseAnalysisData(): CaseAnalysisData {
  return {
    caseContent: "",
    caseLabel: "Кейс для анализа",
    options: [
      { id: "o1", text: "", isCorrect: false, explanation: "" },
      { id: "o2", text: "", isCorrect: false, explanation: "" },
      { id: "o3", text: "", isCorrect: false, explanation: "" },
    ],
    minCorrectRequired: 2,
  }
}

export function getDefaultDataForType(type: QuestionType): QuestionData {
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
}
