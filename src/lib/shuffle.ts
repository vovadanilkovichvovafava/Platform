/**
 * Детерминированный shuffle для рандомизации вопросов и ответов
 * Использует mulberry32 PRNG + Fisher-Yates shuffle
 *
 * Seed основан на userId + questionId для воспроизводимости:
 * - Один и тот же студент видит одинаковый порядок для одного вопроса
 * - Разные студенты видят разный порядок
 * - Порядок стабилен при перезагрузке страницы
 */

/**
 * Простой хеш функция для строки (djb2)
 * Преобразует строку в 32-битное число
 */
export function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) + hash) ^ char // hash * 33 ^ char
  }
  return hash >>> 0 // Преобразуем в unsigned 32-bit
}

/**
 * Mulberry32 - простой и быстрый PRNG
 * Возвращает функцию, которая генерирует числа [0, 1)
 */
export function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

/**
 * Fisher-Yates shuffle с детерминированным PRNG
 * Перемешивает массив на месте и возвращает его
 */
export function shuffleArray<T>(array: T[], random: () => number): T[] {
  const result = [...array] // Создаём копию
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Генерирует seed для рандомизации на основе userId и questionId
 * Используется для воспроизводимого порядка вопросов/ответов
 */
export function generateQuestionSeed(userId: string, questionId: string): number {
  return hashString(`${userId}:${questionId}`)
}

/**
 * Генерирует seed для рандомизации порядка вопросов в модуле
 * Используется для воспроизводимого порядка вопросов
 */
export function generateModuleSeed(userId: string, moduleId: string): number {
  return hashString(`${userId}:module:${moduleId}`)
}

/**
 * Основная функция для детерминированного shuffle
 * @param items - массив для перемешивания
 * @param seed - числовой seed для PRNG
 * @returns перемешанный массив
 */
export function deterministicShuffle<T>(items: T[], seed: number): T[] {
  const random = mulberry32(seed)
  return shuffleArray(items, random)
}

/**
 * Перемешивает options для SINGLE_CHOICE вопроса
 * Возвращает перемешанные options и mapping старых индексов к новым
 */
export function shuffleSingleChoiceOptions(
  options: string[],
  correctAnswer: number,
  seed: number
): { shuffledOptions: string[]; newCorrectIndex: number; indexMapping: number[] } {
  // Создаём массив с индексами
  const indexedOptions = options.map((opt, idx) => ({ opt, originalIndex: idx }))

  // Shuffle
  const random = mulberry32(seed)
  const shuffled = shuffleArray(indexedOptions, random)

  // Находим новый индекс правильного ответа
  const newCorrectIndex = shuffled.findIndex(item => item.originalIndex === correctAnswer)

  // Создаём mapping: indexMapping[newIndex] = oldIndex
  const indexMapping = shuffled.map(item => item.originalIndex)

  return {
    shuffledOptions: shuffled.map(item => item.opt),
    newCorrectIndex,
    indexMapping
  }
}

/**
 * Перемешивает items для MATCHING вопроса
 * Сохраняет корректные пары через id
 */
export function shuffleMatchingItems<T extends { id: string }>(
  leftItems: T[],
  rightItems: T[],
  seed: number
): { shuffledLeft: T[]; shuffledRight: T[] } {
  const random = mulberry32(seed)

  // Перемешиваем обе стороны независимо
  const shuffledLeft = shuffleArray(leftItems, random)
  const shuffledRight = shuffleArray(rightItems, random)

  return { shuffledLeft, shuffledRight }
}

/**
 * Перемешивает items для ORDERING вопроса
 * correctOrder остаётся неизменным (содержит id)
 */
export function shuffleOrderingItems<T extends { id: string }>(
  items: T[],
  seed: number
): T[] {
  const random = mulberry32(seed)
  return shuffleArray(items, random)
}

/**
 * Перемешивает statements для TRUE_FALSE вопроса
 */
export function shuffleTrueFalseStatements<T extends { id: string }>(
  statements: T[],
  seed: number
): T[] {
  const random = mulberry32(seed)
  return shuffleArray(statements, random)
}

/**
 * Перемешивает options для FILL_BLANK вопроса
 * Каждый blank получает свой sub-seed для независимого перемешивания
 */
export function shuffleFillBlankOptions(
  blanks: { id: string; correctAnswer: string; options: string[] }[],
  seed: number
): { id: string; correctAnswer: string; options: string[] }[] {
  return blanks.map((blank, idx) => {
    // Создаём уникальный seed для каждого blank
    const blankSeed = seed + hashString(blank.id) + idx
    const random = mulberry32(blankSeed)

    return {
      ...blank,
      options: shuffleArray(blank.options, random)
    }
  })
}

/**
 * Перемешивает options для CASE_ANALYSIS вопроса
 */
export function shuffleCaseAnalysisOptions<T extends { id: string }>(
  options: T[],
  seed: number
): T[] {
  const random = mulberry32(seed)
  return shuffleArray(options, random)
}
