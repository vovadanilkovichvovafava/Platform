import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// One-time migration to add new interactive practice modules
export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Только админ" }, { status: 403 })
    }

    // Find Vibe Coder trail
    const vibeCoder = await prisma.trail.findUnique({
      where: { slug: "vibe-coder" },
    })

    if (!vibeCoder) {
      return NextResponse.json({ error: "Trail vibe-coder не найден" }, { status: 404 })
    }

    // Check if modules already exist
    const existingModule = await prisma.module.findFirst({
      where: { slug: { startsWith: "vibe-roles-practice" } },
    })

    if (existingModule) {
      return NextResponse.json({ message: "Модули уже существуют", skipped: true })
    }

    // Get current max order
    const maxOrder = await prisma.module.aggregate({
      where: { trailId: vibeCoder.id },
      _max: { order: true },
    })
    let order = (maxOrder._max.order || 0) + 1

    // Create 3 new practice modules
    const newModules = [
      {
        slug: `vibe-roles-practice-${Date.now()}`,
        title: "Роли в Vibe Coding",
        description: "Сопоставьте роли AI и разработчика с их задачами",
        type: "PRACTICE",
        level: "Beginner",
        points: 60,
        duration: "10 мин",
        order: order++,
        content: `# Роли в Vibe Coding

В Vibe Coding каждый участник процесса выполняет свою роль. Разработчик и AI работают в команде, но у каждого свои задачи.

## Роль AI
- Генерация кода по описанию
- Рутинные операции (форматирование, рефакторинг)
- Предложение решений и паттернов
- Ответы на технические вопросы

## Роль разработчика
- Формулировка задач и требований
- Проверка качества и безопасности кода
- Архитектурные решения
- Финальная ответственность за результат

## Задание
Соедините каждую задачу с правильной ролью.`,
        trailId: vibeCoder.id,
        questionType: "MATCHING",
        questionText: "Соедините каждую задачу с правильной ролью",
        questionData: {
          leftItems: [
            { id: "l1", text: "Генерация кода по описанию" },
            { id: "l2", text: "Проверка безопасности кода" },
            { id: "l3", text: "Рутинный рефакторинг" },
            { id: "l4", text: "Архитектурные решения" },
            { id: "l5", text: "Предложение паттернов" },
            { id: "l6", text: "Финальная ответственность" },
          ],
          rightItems: [
            { id: "r1", text: "🤖 AI" },
            { id: "r2", text: "👨‍💻 Разработчик" },
          ],
          correctPairs: {
            l1: "r1",
            l2: "r2",
            l3: "r1",
            l4: "r2",
            l5: "r1",
            l6: "r2",
          },
        },
      },
      {
        slug: `vibe-workflow-practice-${Date.now()}`,
        title: "Порядок работы с AI",
        description: "Расставьте шаги работы с AI в правильном порядке",
        type: "PRACTICE",
        level: "Beginner",
        points: 60,
        duration: "10 мин",
        order: order++,
        content: `# Порядок работы с AI

Эффективная работа с AI требует правильной последовательности действий. Если пропустить шаги или изменить порядок — результат будет хуже.

## Ключевые этапы

1. **Подготовка** — чётко сформулируйте, что вам нужно
2. **Контекст** — предоставьте AI всю необходимую информацию
3. **Генерация** — получите код от AI
4. **Проверка** — проанализируйте результат на ошибки
5. **Тестирование** — убедитесь, что код работает
6. **Интеграция** — добавьте код в проект

## Задание
Расставьте шаги в правильном порядке.`,
        trailId: vibeCoder.id,
        questionType: "ORDERING",
        questionText: "Расставьте шаги работы с AI в правильном порядке",
        questionData: {
          items: [
            { id: "s1", text: "Сформулировать чёткую задачу" },
            { id: "s2", text: "Добавить контекст и ограничения" },
            { id: "s3", text: "Получить код от AI" },
            { id: "s4", text: "Проверить код на ошибки и безопасность" },
            { id: "s5", text: "Протестировать работу кода" },
            { id: "s6", text: "Интегрировать в проект" },
          ],
          correctOrder: ["s1", "s2", "s3", "s4", "s5", "s6"],
        },
      },
      {
        slug: `vibe-prompt-analysis-${Date.now()}`,
        title: "Анализ промптов",
        description: "Найдите ошибки в плохих промптах",
        type: "PRACTICE",
        level: "Intermediate",
        points: 75,
        duration: "15 мин",
        order: order++,
        content: `# Анализ промптов

Качество промпта напрямую влияет на результат. Плохой промпт → плохой код. Научитесь видеть проблемы в промптах.

## Признаки плохого промпта

- Слишком короткий или расплывчатый
- Нет контекста (какой проект, какие технологии)
- Нет ограничений (без библиотек, с TypeScript и т.д.)
- Нет чёткой задачи
- Нет роли для AI

## Пример плохого промпта

> "сделай форму"

Что не так:
- Какую форму? Регистрации? Входа? Обратной связи?
- На чём? React? Vue? Vanilla JS?
- Какие поля? Какая валидация?
- Куда отправлять данные?

## Задание
Проанализируйте промпт и найдите все проблемы.`,
        trailId: vibeCoder.id,
        questionType: "CASE_ANALYSIS",
        questionText: "Найдите все проблемы в этом промпте",
        questionData: {
          caseContent: "напиши мне приложение",
          caseLabel: "Промпт",
          options: [
            {
              id: "o1",
              text: "Нет контекста — непонятно, какое приложение нужно",
              isCorrect: true,
              explanation: "AI не знает, нужно веб, мобильное или десктоп приложение",
            },
            {
              id: "o2",
              text: "Нет указания технологий — непонятно, на чём писать",
              isCorrect: true,
              explanation: "React? Vue? Python? Swift? Без этого AI выберет сам",
            },
            {
              id: "o3",
              text: "Нет функциональных требований — что приложение должно делать?",
              isCorrect: true,
              explanation: "Калькулятор? Чат? Магазин? Нужно описать функционал",
            },
            {
              id: "o4",
              text: "Нет роли для AI — он не знает, как себя вести",
              isCorrect: true,
              explanation: "Роль помогает AI понять уровень ответа (джуниор vs сеньор)",
            },
            {
              id: "o5",
              text: "Слишком много деталей перегружают AI",
              isCorrect: false,
              explanation: "Наоборот, в этом промпте не хватает деталей",
            },
            {
              id: "o6",
              text: "Промпт написан на русском, а надо на английском",
              isCorrect: false,
              explanation: "Современные AI отлично понимают русский язык",
            },
          ],
          minCorrectRequired: 3,
        },
      },
    ]

    const createdModules = []

    for (const mod of newModules) {
      const { questionType, questionText, questionData, ...moduleData } = mod

      // Create module
      const createdModule = await prisma.module.create({
        data: moduleData,
      })

      // Create question for this module
      await prisma.question.create({
        data: {
          moduleId: createdModule.id,
          type: questionType,
          question: questionText,
          options: JSON.stringify([]),
          correctAnswer: 0,
          data: JSON.stringify(questionData),
          order: 1,
        },
      })

      createdModules.push(createdModule.title)
    }

    return NextResponse.json({
      success: true,
      message: "Модули успешно добавлены",
      modules: createdModules,
    })
  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json({ error: "Ошибка миграции" }, { status: 500 })
  }
}

// GET - Check status
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Только админ" }, { status: 403 })
    }

    const existingModule = await prisma.module.findFirst({
      where: {
        OR: [
          { slug: { startsWith: "vibe-roles-practice" } },
          { title: "Роли в Vibe Coding" },
        ]
      },
    })

    return NextResponse.json({
      migrated: !!existingModule,
      module: existingModule?.title || null,
    })
  } catch (error) {
    console.error("Check error:", error)
    return NextResponse.json({ error: "Ошибка проверки" }, { status: 500 })
  }
}

// PATCH - Update existing exercise data (fix emojis, etc.)
export async function PATCH() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Только админ" }, { status: 403 })
    }

    // Find the matching exercise module
    const matchingModule = await prisma.module.findFirst({
      where: { title: "Роли в Vibe Coding" },
      include: { questions: true },
    })

    if (!matchingModule) {
      return NextResponse.json({ error: "Модуль не найден" }, { status: 404 })
    }

    // Update question data without emojis, with labels
    const updatedData = {
      leftLabel: "Задачи",
      rightLabel: "Исполнитель",
      leftItems: [
        { id: "l1", text: "Генерация кода по описанию" },
        { id: "l2", text: "Проверка безопасности кода" },
        { id: "l3", text: "Рутинный рефакторинг" },
        { id: "l4", text: "Архитектурные решения" },
        { id: "l5", text: "Предложение паттернов" },
        { id: "l6", text: "Финальная ответственность" },
      ],
      rightItems: [
        { id: "r1", text: "AI" },
        { id: "r2", text: "Разработчик" },
      ],
      correctPairs: {
        l1: "r1",
        l2: "r2",
        l3: "r1",
        l4: "r2",
        l5: "r1",
        l6: "r2",
      },
    }

    // Update the question
    if (matchingModule.questions.length > 0) {
      await prisma.question.update({
        where: { id: matchingModule.questions[0].id },
        data: { data: JSON.stringify(updatedData) },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Данные обновлены",
    })
  } catch (error) {
    console.error("Update error:", error)
    return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 })
  }
}
