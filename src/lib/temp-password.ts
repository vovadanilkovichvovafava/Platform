import { randomInt } from "crypto"

/**
 * Генерация временного пароля для сброса администратором.
 *
 * Пароль читаемый (диктуется/копируется человеком), но одноразовый: после входа
 * пользователя заставляют сменить его через модалку (см. mustChangePassword).
 * Исключены неоднозначные символы (0/O, 1/l/I) — чтобы не путать при передаче.
 */
const WORDS = [
  "Astra", "Nebula", "Orbit", "Pulsar", "Quasar", "Comet", "Photon", "Vega",
  "Lyra", "Nova", "Solar", "Lunar", "Delta", "Prism", "Cobalt", "Ember",
] as const

const DIGITS = "23456789"
const SYMBOLS = "!@#$%&*"

/** Возвращает случайный читаемый пароль вида `Orbit-Vega-73!` (длина ~13-16). */
export function generateTempPassword(): string {
  const word1 = WORDS[randomInt(WORDS.length)]
  const word2 = WORDS[randomInt(WORDS.length)]
  const digits = DIGITS[randomInt(DIGITS.length)] + DIGITS[randomInt(DIGITS.length)]
  const symbol = SYMBOLS[randomInt(SYMBOLS.length)]
  return `${word1}-${word2}-${digits}${symbol}`
}
