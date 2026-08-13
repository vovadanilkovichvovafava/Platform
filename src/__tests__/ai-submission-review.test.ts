/**
 * Tests for AI Submission Review question filtering and prompt building.
 */
import { describe, it, expect } from "vitest"
import {
  normalizeText,
  extractKeywords,
  isLikelyAnsweredByText,
  isTrivialQuestion,
  isDuplicateOfPrevious,
  filterQuestions,
} from "@/lib/ai-submission-review/question-filter"
import { buildUserPrompt } from "@/lib/ai-submission-review/prompt-builder"
import type { AiReviewQuestion } from "@/lib/ai-submission-review/types"
import type { SubmissionContext } from "@/lib/ai-submission-review/types"

// ---------------------------------------------------------------------------
// Helper to create a question object
// ---------------------------------------------------------------------------
function makeQuestion(text: string, type: AiReviewQuestion["type"] = "application"): AiReviewQuestion {
  return {
    question: text,
    type,
    difficulty: "medium",
    rationale: "test",
    source: "submission",
  }
}

// ---------------------------------------------------------------------------
// normalizeText
// ---------------------------------------------------------------------------
describe("normalizeText", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeText("Привет, Мир!")).toBe("привет мир")
  })

  it("collapses multiple spaces", () => {
    expect(normalizeText("  слово   ещё  ")).toBe("слово ещё")
  })

  it("handles empty string", () => {
    expect(normalizeText("")).toBe("")
  })
})

// ---------------------------------------------------------------------------
// extractKeywords
// ---------------------------------------------------------------------------
describe("extractKeywords", () => {
  it("extracts words longer than 3 chars", () => {
    const kw = extractKeywords("Как ты решил задачу по алгоритмам?")
    expect(kw.has("решил")).toBe(true)
    expect(kw.has("задачу")).toBe(true)
    expect(kw.has("алгоритмам")).toBe(true)
    // "как" and "ты" are <= 3 chars (2 chars each)
    expect(kw.has("как")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isTrivialQuestion
// ---------------------------------------------------------------------------
describe("isTrivialQuestion", () => {
  it("detects yes/no questions (Russian)", () => {
    expect(isTrivialQuestion("Правда ли, что JavaScript однопоточный?")).toBe(true)
    expect(isTrivialQuestion("Верно ли что React использует виртуальный DOM?")).toBe(true)
    expect(isTrivialQuestion("Есть ли у тебя опыт с TypeScript?")).toBe(true)
  })

  it("detects bare definition questions", () => {
    expect(isTrivialQuestion("Что такое REST API?")).toBe(true)
    expect(isTrivialQuestion("Что такое JWT?")).toBe(true)
  })

  it("allows longer what-is questions (more context)", () => {
    expect(
      isTrivialQuestion("Что такое REST API и как он отличается от GraphQL в контексте масштабируемости?")
    ).toBe(false)
  })

  it("allows non-trivial questions", () => {
    expect(
      isTrivialQuestion("Какие преимущества и недостатки у выбранного тобой подхода?")
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isLikelyAnsweredByText
// ---------------------------------------------------------------------------
describe("isLikelyAnsweredByText", () => {
  const studentText =
    "Я использовал React для создания компонентов пользовательского интерфейса. " +
    "Выбрал useState и useEffect для управления состоянием. " +
    "Реализовал адаптивный дизайн с помощью Tailwind CSS."

  it("detects question answered by student text", () => {
    // This question's keywords heavily overlap with student text
    expect(
      isLikelyAnsweredByText(
        "Какие React хуки ты использовал для управления состоянием компонентов?",
        studentText
      )
    ).toBe(true)
  })

  it("allows questions not covered in text", () => {
    expect(
      isLikelyAnsweredByText(
        "Как бы ты оптимизировал производительность при серверном рендеринге?",
        studentText
      )
    ).toBe(false)
  })

  it("returns false for short source text", () => {
    expect(isLikelyAnsweredByText("Какой фреймворк?", "React")).toBe(false)
  })

  it("returns false for empty source text", () => {
    expect(isLikelyAnsweredByText("Любой вопрос?", "")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isDuplicateOfPrevious
// ---------------------------------------------------------------------------
describe("isDuplicateOfPrevious", () => {
  const previousQuestions = [
    "Почему ты выбрал именно этот подход к архитектуре приложения?",
    "Как бы ты улучшил обработку ошибок в своём решении?",
  ]

  it("detects exact duplicate after normalization", () => {
    expect(
      isDuplicateOfPrevious(
        "Почему ты выбрал именно этот подход к архитектуре приложения?",
        previousQuestions
      )
    ).toBe(true)
  })

  it("detects near-duplicate with high keyword overlap", () => {
    expect(
      isDuplicateOfPrevious(
        "Почему ты выбрал именно такой подход к архитектуре приложения?",
        previousQuestions
      )
    ).toBe(true)
  })

  it("allows genuinely different questions", () => {
    expect(
      isDuplicateOfPrevious(
        "Какие тесты ты написал для проверки граничных случаев?",
        previousQuestions
      )
    ).toBe(false)
  })

  it("returns false for empty previous list", () => {
    expect(isDuplicateOfPrevious("Любой вопрос?", [])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// filterQuestions (integration)
// ---------------------------------------------------------------------------
describe("filterQuestions", () => {
  const submissionText =
    "Я реализовал REST API с использованием Express.js и подключил базу данных PostgreSQL через Prisma ORM."

  it("filters out trivial questions", () => {
    const questions = [
      makeQuestion("Что такое REST API?", "knowledge"),
      makeQuestion("Как бы ты реализовал кеширование для уменьшения нагрузки на базу данных?"),
    ]
    const result = filterQuestions(questions, submissionText, "", [])
    expect(result.accepted).toHaveLength(1)
    expect(result.accepted[0].question).toContain("кеширование")
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0].reason).toBe("TRIVIAL")
  })

  it("filters out already-answered questions", () => {
    const questions = [
      makeQuestion("Какую базу данных и ORM ты использовал для реализации REST API Express?"),
      makeQuestion("Как бы ты масштабировал приложение при десятикратном росте трафика?"),
    ]
    const result = filterQuestions(questions, submissionText, "", [])
    // First question heavily overlaps with submissionText keywords
    expect(result.accepted.length).toBeLessThanOrEqual(2)
    // Second question should pass
    expect(result.accepted.some((q) => q.question.includes("масштабировал"))).toBe(true)
  })

  it("filters out duplicates from previous questions", () => {
    const prevQuestions = [
      "Почему ты выбрал Express.js вместо других фреймворков?",
    ]
    const questions = [
      makeQuestion("Почему ты выбрал Express.js вместо других фреймворков?"),
      makeQuestion("Какие альтернативные паттерны проектирования ты рассматривал?"),
    ]
    const result = filterQuestions(questions, submissionText, "", prevQuestions)
    expect(result.accepted).toHaveLength(1)
    expect(result.rejected[0].reason).toBe("DUPLICATE_SURFACE")
  })

  it("filters out empty/short questions", () => {
    const questions = [
      makeQuestion(""),
      makeQuestion("Да?"),
      makeQuestion("Как бы ты обеспечил безопасность API-эндпоинтов от SQL-инъекций?"),
    ]
    const result = filterQuestions(questions, "", "", [])
    expect(result.accepted).toHaveLength(1)
    expect(result.rejected).toHaveLength(2)
  })

  it("filters duplicates within the same batch", () => {
    const questions = [
      makeQuestion("Как бы ты обеспечил безопасность API-эндпоинтов от SQL-инъекций?"),
      makeQuestion("Как бы ты обеспечил безопасность API-эндпоинтов от SQL инъекций?"),
    ]
    const result = filterQuestions(questions, "", "", [])
    expect(result.accepted).toHaveLength(1)
    expect(result.rejected[0].reason).toBe("DUPLICATE_WITHIN_BATCH")
  })

  it("returns correct quality metrics", () => {
    const questions = [
      makeQuestion("Что такое JWT?", "knowledge"),
      makeQuestion("Как бы ты настроил мониторинг производительности?"),
      makeQuestion("Как бы ты настроил мониторинг производительности?"),
    ]
    const result = filterQuestions(questions, "", "", [])
    expect(result.totalCandidates).toBe(3)
    expect(result.accepted).toHaveLength(1)
    expect(result.rejected).toHaveLength(2)
    expect(result.rejectedReasons).toContain("TRIVIAL")
    expect(result.rejectedReasons).toContain("DUPLICATE_WITHIN_BATCH")
  })
})

// ---------------------------------------------------------------------------
// buildUserPrompt
// ---------------------------------------------------------------------------
describe("buildUserPrompt", () => {
  const baseContext: SubmissionContext = {
    submissionText: "Мой ответ на задание",
    fileUrl: null,
    githubUrl: null,
    deployUrl: null,
    moduleTitle: "Введение в TypeScript",
    moduleDescription: "Основы TypeScript",
    moduleType: "practice",
    moduleContent: "TypeScript — это надмножество JavaScript...",
    moduleRequirements: "Реализовать простой проект на TypeScript",
    trailTitle: "Frontend",
    trailDescription: "Курс по frontend-разработке",
    previousQuestions: [],
  }

  it("includes module context in XML tags", () => {
    const prompt = buildUserPrompt(baseContext)
    expect(prompt).toContain("<module_context>")
    expect(prompt).toContain("</module_context>")
    expect(prompt).toContain("Введение в TypeScript")
  })

  it("includes student work in XML tags", () => {
    const prompt = buildUserPrompt(baseContext)
    expect(prompt).toContain("<student_work>")
    expect(prompt).toContain("</student_work>")
    expect(prompt).toContain("Мой ответ на задание")
  })

  it("includes previous questions when present", () => {
    const ctx = {
      ...baseContext,
      previousQuestions: ["Вопрос 1?", "Вопрос 2?"],
    }
    const prompt = buildUserPrompt(ctx)
    expect(prompt).toContain("<previous_questions>")
    expect(prompt).toContain("Вопрос 1?")
    expect(prompt).toContain("Вопрос 2?")
  })

  it("does not include previous_questions section when empty", () => {
    const prompt = buildUserPrompt(baseContext)
    expect(prompt).not.toContain("<previous_questions>")
  })

  it("adds context_warning for link-only submissions", () => {
    const ctx = {
      ...baseContext,
      submissionText: null,
      githubUrl: "https://github.com/example",
    }
    const prompt = buildUserPrompt(ctx)
    expect(prompt).toContain("<context_warning>")
    expect(prompt).toContain("LIMITED_CONTEXT")
  })

  it("does not add context_warning when text is present", () => {
    const prompt = buildUserPrompt(baseContext)
    expect(prompt).not.toContain("<context_warning>")
  })

  it("truncates long module content", () => {
    const ctx = {
      ...baseContext,
      moduleContent: "x".repeat(15000),
    }
    const prompt = buildUserPrompt(ctx)
    expect(prompt).toContain("[...теория сокращена]")
  })
})
