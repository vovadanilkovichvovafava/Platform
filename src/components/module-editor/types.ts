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

export interface Question {
  id: string
  type: QuestionType
  question: string
  options: string
  correctAnswer: number
  data: string | null
  order: number
}

export interface Module {
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
  trail: {
    id: string
    title: string
    slug: string
  }
  questions: Question[]
}

export interface QuestionFormData {
  id?: string
  type: QuestionType
  question: string
  options: string[]
  correctAnswer: number
  data: MatchingData | OrderingData | CaseAnalysisData | null
  isNew?: boolean
}

export interface ModuleEditorProps {
  moduleId: string
  backUrl: string
}
