import { describe, it, expect, beforeEach } from "vitest"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

describe("Rate Limiter", () => {
  const testConfig = { windowMs: 1000, maxRequests: 3 }

  beforeEach(() => {
    // Каждый тест начинается с чистого состояния через уникальный идентификатор
  })

  it("должен разрешать запросы в пределах лимита", () => {
    const id = `test-${Date.now()}-allow`

    const result1 = checkRateLimit(id, testConfig)
    expect(result1.allowed).toBe(true)
    expect(result1.remaining).toBe(2)

    const result2 = checkRateLimit(id, testConfig)
    expect(result2.allowed).toBe(true)
    expect(result2.remaining).toBe(1)

    const result3 = checkRateLimit(id, testConfig)
    expect(result3.allowed).toBe(true)
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
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.resetIn).toBeGreaterThan(0)
  })

  it("должен иметь предустановленные конфигурации", () => {
    expect(RATE_LIMITS.auth).toEqual({ windowMs: 60000, maxRequests: 5 })
    expect(RATE_LIMITS.api).toEqual({ windowMs: 60000, maxRequests: 60 })
    expect(RATE_LIMITS.submissions).toEqual({ windowMs: 3600000, maxRequests: 10 })
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
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })
})
