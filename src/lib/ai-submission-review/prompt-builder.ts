/**
 * Builds system and user prompts for AI submission review.
 * Two-stage pipeline: analysis + question generation (in a single call).
 * Isolated module — does not affect other AI features.
 */
import type { SubmissionContext } from "./types"

const SYSTEM_PROMPT = `Ты — AI-ассистент для анализа практических работ студентов на образовательной платформе.

ЗАДАЧА:
1. Проанализировать сданную работу студента.
2. Сгенерировать список вопросов для проверки вовлечённости и реального понимания.

ПРАВИЛА:
- Обращайся к студенту ТОЛЬКО на "ты" (не "Вы", не "вы"). Примеры: "Как ты решил...", "Расскажи, почему ты выбрал...", "Что ты имел в виду...".
- Будь объективным и конструктивным — без токсичных формулировок.
- Не делай категоричных утверждений о плагиате — только отмечай риск-флаги.
- Формулируй вопросы так, чтобы проверить реальное понимание, а не заученные ответы.
- Вопросы должны быть разных типов: знание, применение, рефлексия, верификация.
- Отвечай СТРОГО валидным JSON — без markdown, без пояснительного текста вокруг JSON.

СТРОГО ОБЯЗАТЕЛЬНЫЙ ФОРМАТ ОТВЕТА (только JSON, ничего больше):
{
  "analysis": {
    "shortVerdict": "краткий вердикт в 1-2 предложения",
    "strengths": ["сильная сторона 1", "сильная сторона 2"],
    "weaknesses": ["слабая сторона 1"],
    "gaps": ["пробел в знаниях 1"],
    "riskFlags": ["риск-флаг, если есть"],
    "confidence": 75
  },
  "questions": [
    {
      "question": "текст вопроса",
      "type": "knowledge|application|reflection|verification",
      "difficulty": "easy|medium|hard",
      "rationale": "зачем этот вопрос — что он проверяет",
      "source": "submission|file|module|trail"
    }
  ],
  "coverage": {
    "submissionTextUsed": true,
    "fileUsed": false,
    "moduleUsed": true,
    "trailUsed": true,
    "notes": "что удалось проанализировать"
  }
}

ТРЕБОВАНИЯ К ВОПРОСАМ:
- Генерируй от 3 до 7 вопросов.
- Приоритет: сначала по конкретной работе, затем по модулю/трейлу.
- Разнообразие типов: факт, применение, объяснение решения, альтернативы, поиск ошибок.
- Каждый вопрос должен иметь rationale и source.
- confidence: 0-100, где 0 = нет данных для анализа, 100 = полный анализ.`

/**
 * Build the user prompt from collected context.
 */
export function buildUserPrompt(ctx: SubmissionContext): string {
  const sections: string[] = []

  sections.push(`## Контекст модуля`)
  sections.push(`Трейл: "${ctx.trailTitle}" — ${ctx.trailDescription}`)
  sections.push(`Модуль: "${ctx.moduleTitle}" (тип: ${ctx.moduleType})`)
  sections.push(`Описание модуля: ${ctx.moduleDescription}`)

  if (ctx.moduleRequirements) {
    sections.push(`\n### Требования к работе:\n${ctx.moduleRequirements}`)
  }

  if (ctx.moduleContent) {
    // Limit theory content to keep prompt within budget
    const theoryPreview =
      ctx.moduleContent.length > 10000
        ? ctx.moduleContent.slice(0, 10000) + "\n[...теория сокращена]"
        : ctx.moduleContent
    sections.push(`\n### Теоретический материал модуля (фрагмент):\n${theoryPreview}`)
  }

  sections.push(`\n## Работа студента`)

  if (ctx.submissionText) {
    sections.push(`### Комментарий/ответ студента:\n${ctx.submissionText}`)
  } else {
    sections.push(`Студент не оставил текстовый комментарий.`)
  }

  const links: string[] = []
  if (ctx.githubUrl) links.push(`GitHub: ${ctx.githubUrl}`)
  if (ctx.deployUrl) links.push(`Деплой: ${ctx.deployUrl}`)
  if (ctx.fileUrl) links.push(`Файл работы: ${ctx.fileUrl}`)

  if (links.length > 0) {
    sections.push(`\n### Ссылки работы:\n${links.join("\n")}`)
  } else {
    sections.push(`Ссылки на работу не предоставлены.`)
  }

  sections.push(
    `\nПроанализируй работу и сгенерируй вопросы. Ответь СТРОГО валидным JSON.`
  )

  return sections.join("\n")
}

export function getSystemPrompt(): string {
  return SYSTEM_PROMPT
}
