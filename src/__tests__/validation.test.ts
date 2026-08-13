import { describe, it, expect } from "vitest"
import { z } from "zod"

// Копии схем валидации для тестирования
const registerSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Пароль должен быть минимум 6 символов"),
  name: z.string().min(2, "Имя должно быть минимум 2 символа"),
})

const submissionSchema = z.object({
  moduleId: z.string().min(1),
  githubUrl: z
    .string()
    .url()
    .refine(
      (url) => url.startsWith("https://github.com/"),
      "GitHub URL должен начинаться с https://github.com/"
    )
    .optional()
    .or(z.literal("")),
  deployUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal("")),
  comment: z.string().max(2000, "Комментарий слишком длинный").optional(),
})

const answerSchema = z.object({
  questionId: z.string().min(1, "ID вопроса обязателен"),
  selectedAnswer: z.number().min(0, "Ответ должен быть числом"),
})

describe("Валидация регистрации", () => {
  it("должна пропускать валидные данные", () => {
    const validData = {
      email: "test@example.com",
      password: "password123",
      name: "Иван Иванов",
    }
    expect(() => registerSchema.parse(validData)).not.toThrow()
  })

  it("должна отклонять некорректный email", () => {
    const invalidData = {
      email: "invalid-email",
      password: "password123",
      name: "Иван",
    }
    const result = registerSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("должна отклонять короткий пароль", () => {
    const invalidData = {
      email: "test@example.com",
      password: "123",
      name: "Иван",
    }
    const result = registerSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Пароль должен быть минимум 6 символов")
    }
  })

  it("должна отклонять короткое имя", () => {
    const invalidData = {
      email: "test@example.com",
      password: "password123",
      name: "И",
    }
    const result = registerSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Имя должно быть минимум 2 символа")
    }
  })
})

describe("Валидация отправки работ", () => {
  it("должна пропускать валидные данные с GitHub URL", () => {
    const validData = {
      moduleId: "module-123",
      githubUrl: "https://github.com/user/repo",
      comment: "Моя работа",
    }
    expect(() => submissionSchema.parse(validData)).not.toThrow()
  })

  it("должна отклонять не-GitHub URL", () => {
    const invalidData = {
      moduleId: "module-123",
      githubUrl: "https://gitlab.com/user/repo",
    }
    const result = submissionSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("должна разрешать пустой githubUrl", () => {
    const validData = {
      moduleId: "module-123",
      githubUrl: "",
      deployUrl: "https://my-app.vercel.app",
    }
    expect(() => submissionSchema.parse(validData)).not.toThrow()
  })

  it("должна отклонять слишком длинный комментарий", () => {
    const invalidData = {
      moduleId: "module-123",
      githubUrl: "",
      comment: "a".repeat(2001),
    }
    const result = submissionSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe("Валидация ответов на вопросы", () => {
  it("должна пропускать валидные данные", () => {
    const validData = {
      questionId: "question-123",
      selectedAnswer: 2,
    }
    expect(() => answerSchema.parse(validData)).not.toThrow()
  })

  it("должна отклонять отрицательный ответ", () => {
    const invalidData = {
      questionId: "question-123",
      selectedAnswer: -1,
    }
    const result = answerSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("должна отклонять пустой questionId", () => {
    const invalidData = {
      questionId: "",
      selectedAnswer: 0,
    }
    const result = answerSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})
