export type QuestionType = "SINGLE_CHOICE" | "MATCHING" | "ORDERING" | "CASE_ANALYSIS" | "TRUE_FALSE" | "FILL_BLANK"

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

export interface TrueFalseData {
  statements: {
    id: string
    text: string
    isTrue: boolean
    explanation?: string
  }[]
}

export interface FillBlankData {
  textWithBlanks: string
  blanks: {
    id: string
    correctAnswer: string
    options: string[]
  }[]
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

export interface AdjacentModule {
  id: string
  title: string
  slug: string
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
    modules: AdjacentModule[]
  }
  questions: Question[]
  prevModule: AdjacentModule | null
  nextModule: AdjacentModule | null
}

export interface QuestionFormData {
  id?: string
  type: QuestionType
  question: string
  options: string[]
  correctAnswer: number
  data: MatchingData | OrderingData | CaseAnalysisData | TrueFalseData | FillBlankData | null
  isNew?: boolean
}

export interface ModuleEditorProps {
  moduleId: string
  backUrl: string
  readOnly?: boolean
}
