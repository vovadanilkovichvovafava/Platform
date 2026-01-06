import { describe, it, expect } from "vitest"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

describe("Rate Limiter", () => {
  const testConfig = { limit: 3, windowMs: 1000 }

  it("должен разрешать запросы в пределах лимита", () => {
    const id = `test-${Date.now()}-allow`

    const result1 = checkRateLimit(id, testConfig)
    expect(result1.success).toBe(true)
    expect(result1.remaining).toBe(2)

    const result2 = checkRateLimit(id, testConfig)
    expect(result2.success).toBe(true)
    expect(result2.remaining).toBe(1)

    const result3 = checkRateLimit(id, testConfig)
    expect(result3.success).toBe(true)
    expect(result3.remaining).toBe(0)
  })

  it("должен блокировать запросы при превышении лимита", () => {
    const id = `test-${Date.now()}-block`

    // Исчерпываем лимит
    checkRateLimit(id, testConfig)
    checkRateLimit(id, testConfig)
    checkRateLimit(id, testConfig)

    // Следующий запрос должен быть заблокирован
    const result = checkRateLimit(id, testConfig)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.resetIn).toBeGreaterThan(0)
  })

  it("должен иметь предустановленные конфигурации", () => {
    expect(RATE_LIMITS.auth).toBeDefined()
    expect(RATE_LIMITS.register).toBeDefined()
    expect(RATE_LIMITS.answer).toBeDefined()
    expect(RATE_LIMITS.submissions).toBeDefined()
    expect(RATE_LIMITS.api).toBeDefined()
  })

  it("должен различать разных пользователей", () => {
    const user1 = `user1-${Date.now()}`
    const user2 = `user2-${Date.now()}`

    // Исчерпываем лимит для user1
    checkRateLimit(user1, testConfig)
    checkRateLimit(user1, testConfig)
    checkRateLimit(user1, testConfig)

    // user2 должен иметь свой отдельный лимит
    const result = checkRateLimit(user2, testConfig)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(2)
  })
})
