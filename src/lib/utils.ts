import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Russian pluralization for nouns
 * @param count - the number
 * @param forms - [one, few, many] e.g. ["сертификат", "сертификата", "сертификатов"]
 * @returns correctly declined form
 *
 * Examples:
 * - pluralizeRu(1, ["сертификат", "сертификата", "сертификатов"]) → "сертификат"
 * - pluralizeRu(2, ["сертификат", "сертификата", "сертификатов"]) → "сертификата"
 * - pluralizeRu(5, ["сертификат", "сертификата", "сертификатов"]) → "сертификатов"
 * - pluralizeRu(21, ["сертификат", "сертификата", "сертификатов"]) → "сертификат"
 */
export function pluralizeRu(count: number, forms: [string, string, string]): string {
  const absCount = Math.abs(count)
  const mod10 = absCount % 10
  const mod100 = absCount % 100

  if (mod10 === 1 && mod100 !== 11) {
    return forms[0] // one: 1, 21, 31, 101...
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return forms[1] // few: 2, 3, 4, 22, 23, 24...
  }
  return forms[2] // many: 0, 5-20, 25-30, 100, 111...
}

/**
 * Safely parse JSON with fallback value
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    console.error("Failed to parse JSON:", json.slice(0, 100))
    return fallback
  }
}
