import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Clean existing data
  await prisma.review.deleteMany()
  await prisma.submission.deleteMany()
  await prisma.unitProgress.deleteMany()
  await prisma.moduleProgress.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.unit.deleteMany()
  await prisma.module.deleteMany()
  await prisma.trail.deleteMany()
  await prisma.user.deleteMany()

  // Create users
  const hashedPassword = await bcrypt.hash("password123", 10)

  const teacher = await prisma.user.create({
    data: {
      email: "teacher@rnd.academy",
      password: hashedPassword,
      name: "Alex Mentor",
      role: "TEACHER",
      totalXP: 0,
      currentStreak: 0,
    },
  })

  const student = await prisma.user.create({
    data: {
      email: "student@rnd.academy",
      password: hashedPassword,
      name: "Max Learner",
      role: "STUDENT",
      totalXP: 125,
      currentStreak: 3,
    },
  })

  console.log("Created users:", { teacher: teacher.email, student: student.email })

  // Create Trails
  const vibeCoder = await prisma.trail.create({
    data: {
      slug: "vibe-coder",
      title: "Vibe Coder",
      subtitle: "Научись создавать приложения с помощью AI",
      description: "Освой современный подход к разработке с использованием AI-инструментов. От промптинга до деплоя полноценных SaaS-приложений.",
      icon: "Code",
      color: "#6366f1",
      duration: "4 недели",
      order: 1,
    },
  })

  const marketer = await prisma.trail.create({
    data: {
      slug: "marketer",
      title: "Маркетолог",
      subtitle: "Создавай конверсионные кампании",
      description: "Научись анализировать аудиторию, создавать продающие тексты и запускать эффективные маркетинговые кампании.",
      icon: "Target",
      color: "#ec4899",
      duration: "3 недели",
      order: 2,
    },
  })

  const uiDesigner = await prisma.trail.create({
    data: {
      slug: "ui-designer",
      title: "UI Дизайнер",
      subtitle: "Проектируй красивые интерфейсы",
      description: "Освой Figma от основ до продвинутых техник. Создавай UI Kit-ы и профессиональные дизайн-системы.",
      icon: "Palette",
      color: "#14b8a6",
      duration: "3 недели",
      order: 3,
    },
  })

  const rndCreator = await prisma.trail.create({
    data: {
      slug: "rnd-creator",
      title: "R&D Креатор",
      subtitle: "Исследуй рынки и создавай продукты",
      description: "Научись продуктовому мышлению, анализу конкурентов и созданию стратегий выхода на рынок.",
      icon: "Lightbulb",
      color: "#f59e0b",
      duration: "3 недели",
      order: 4,
    },
  })

  console.log("Created trails:", [vibeCoder.title, marketer.title, uiDesigner.title, rndCreator.title])

  // Vibe Coder Modules
  const vibeCoderModules = [
    {
      slug: "intro-vibe-coding",
      title: "Введение в Vibe Coding",
      description: "Узнай что такое Vibe Coding и как AI меняет разработку",
      type: "THEORY",
      level: "Beginner",
      points: 50,
      duration: "20 мин",
      order: 1,
      content: `# Введение в Vibe Coding

## Что такое Vibe Coding?

Vibe Coding — это современный подход к разработке программного обеспечения, где вы описываете свои идеи и намерения AI-ассистенту, который помогает превратить их в работающий код.

## Преимущества Vibe Coding

1. **Скорость разработки** — создавайте прототипы за часы, а не дни
2. **Низкий порог входа** — не нужны годы опыта в программировании
3. **Фокус на продукте** — концентрируйтесь на бизнес-логике, а не синтаксисе
4. **Итеративный подход** — быстро тестируйте и улучшайте идеи

## Ключевые инструменты

- **Claude** — AI-ассистент для написания кода
- **Cursor** — AI-powered редактор кода
- **v0.dev** — генерация UI компонентов
- **Railway/Vercel** — платформы для деплоя

## Что вы создадите в этом trail

К концу обучения вы сможете создавать полноценные веб-приложения с базой данных, аутентификацией и красивым интерфейсом.`,
    },
    {
      slug: "prompting-basics",
      title: "Основы промптинга",
      description: "Научись эффективно общаться с AI для получения качественного кода",
      type: "PRACTICE",
      level: "Beginner",
      points: 75,
      duration: "45 мин",
      order: 2,
      content: `# Основы промптинга

## Структура эффективного промпта

### 1. Контекст
Опишите что вы создаете и какие технологии используете.

### 2. Задача
Четко сформулируйте что нужно сделать.

### 3. Требования
Укажите конкретные требования к результату.

### 4. Примеры
Приведите примеры желаемого результата если возможно.

## Практические советы

- Будьте конкретны в описании задачи
- Разбивайте сложные задачи на шаги
- Просите объяснения если что-то непонятно
- Итерируйте и уточняйте результат`,
    },
    {
      slug: "claude-code-workflow",
      title: "Работа с Claude Code",
      description: "Освой рабочий процесс с Claude Code от идеи до реализации",
      type: "PRACTICE",
      level: "Intermediate",
      points: 100,
      duration: "1 час",
      order: 3,
      content: `# Работа с Claude Code

## Установка и настройка

1. Установите Claude Code
2. Настройте окружение разработки
3. Подключите к проекту

## Типичный рабочий процесс

### Планирование
- Опишите функционал
- Определите архитектуру
- Разбейте на задачи

### Разработка
- Создавайте компоненты
- Пишите бизнес-логику
- Добавляйте стили

### Тестирование
- Проверяйте функционал
- Исправляйте баги
- Оптимизируйте код`,
    },
    {
      slug: "railway-deploy",
      title: "Деплой на Railway",
      description: "Научись разворачивать приложения в production",
      type: "PRACTICE",
      level: "Intermediate",
      points: 75,
      duration: "45 мин",
      order: 4,
      content: `# Деплой на Railway

## Что такое Railway?

Railway — это платформа для деплоя приложений с простым интерфейсом и автоматическим масштабированием.

## Шаги деплоя

1. Создайте аккаунт на Railway
2. Подключите GitHub репозиторий
3. Настройте переменные окружения
4. Запустите деплой

## Настройка базы данных

Railway позволяет быстро развернуть PostgreSQL, Redis и другие сервисы.`,
    },
    {
      slug: "project-junior-finance",
      title: "Проект Junior: Финансовый трекер",
      description: "Создай приложение для отслеживания расходов и доходов",
      type: "PROJECT",
      level: "Junior",
      points: 150,
      duration: "2 дня",
      order: 5,
      requirements: `## Требования к проекту

### Функционал
- Регистрация и авторизация пользователей
- Добавление транзакций (доход/расход)
- Категории транзакций
- Дашборд со статистикой
- Фильтрация по датам

### Технологии
- Next.js 14+ (App Router)
- TypeScript
- Prisma + PostgreSQL
- Tailwind CSS

### Критерии оценки
- Работоспособность функционала (0-3)
- Качество кода (0-3)
- UI/UX дизайн (0-2)
- Деплой и документация (0-2)`,
    },
    {
      slug: "project-middle-taskmanager",
      title: "Проект Middle: Task Manager SaaS",
      description: "Создай полноценное SaaS-приложение для управления задачами",
      type: "PROJECT",
      level: "Middle",
      points: 200,
      duration: "2 дня",
      order: 6,
      requirements: `## Требования к проекту

### Функционал
- Multi-tenant архитектура (рабочие пространства)
- Доски и колонки (Kanban)
- Drag & drop задач
- Комментарии и вложения
- Приглашение участников
- Уведомления

### Технологии
- Next.js 14+ (App Router)
- TypeScript
- Prisma + PostgreSQL
- Tailwind CSS + shadcn/ui
- NextAuth.js

### Критерии оценки
- Архитектура и масштабируемость (0-3)
- Полнота функционала (0-3)
- Качество кода (0-2)
- UI/UX и производительность (0-2)`,
    },
  ]

  for (const module of vibeCoderModules) {
    await prisma.module.create({
      data: { ...module, trailId: vibeCoder.id },
    })
  }

  // Marketer Modules
  const marketerModules = [
    {
      slug: "conversion-basics",
      title: "Основы конверсии",
      description: "Изучи принципы конверсии и воронки продаж",
      type: "THEORY",
      level: "Beginner",
      points: 50,
      duration: "30 мин",
      order: 1,
      content: `# Основы конверсии

## Что такое конверсия?

Конверсия — это процент посетителей, которые совершают целевое действие на вашем сайте или в приложении.

## Типы конверсий

- Микроконверсии (подписка, просмотр)
- Макроконверсии (покупка, регистрация)

## Воронка продаж

1. Привлечение (Awareness)
2. Интерес (Interest)
3. Желание (Desire)
4. Действие (Action)`,
    },
    {
      slug: "target-audience",
      title: "Анализ целевой аудитории",
      description: "Научись определять и сегментировать аудиторию",
      type: "PRACTICE",
      level: "Intermediate",
      points: 75,
      duration: "45 мин",
      order: 2,
      content: `# Анализ целевой аудитории

## Jobs To Be Done

Фреймворк для понимания истинных потребностей клиентов.

## Создание персон

- Демографические данные
- Боли и потребности
- Мотивации и страхи
- Каналы коммуникации`,
    },
    {
      slug: "copywriting-landing",
      title: "Копирайтинг для лендингов",
      description: "Освой техники написания продающих текстов",
      type: "PRACTICE",
      level: "Intermediate",
      points: 100,
      duration: "1 час",
      order: 3,
      content: `# Копирайтинг для лендингов

## Формула AIDA

- Attention — привлеки внимание
- Interest — вызови интерес
- Desire — создай желание
- Action — призови к действию

## Заголовки

Заголовок — 80% успеха вашего лендинга. Используйте числа, вопросы, обещания результата.`,
    },
    {
      slug: "project-junior-landing",
      title: "Проект Junior: Лендинг для приложения",
      description: "Создай конверсионный лендинг для мобильного приложения",
      type: "PROJECT",
      level: "Junior",
      points: 150,
      duration: "2 дня",
      order: 4,
      requirements: `## Требования к проекту

### Секции лендинга
- Hero с УТП
- Проблема/Решение
- Преимущества (3-5 штук)
- Как это работает
- Социальные доказательства
- FAQ
- CTA секция

### Критерии оценки
- Качество копирайтинга (0-4)
- Визуальный дизайн (0-3)
- Конверсионные элементы (0-3)`,
    },
    {
      slug: "project-middle-campaign",
      title: "Проект Middle: Мультисегментная кампания",
      description: "Разработай маркетинговую кампанию для разных сегментов аудитории",
      type: "PROJECT",
      level: "Middle",
      points: 200,
      duration: "3 дня",
      order: 5,
      requirements: `## Требования к проекту

### Что нужно сделать
- Анализ 3 сегментов аудитории
- Уникальные УТП для каждого сегмента
- 3 варианта лендингов
- Стратегия A/B тестирования
- Медиаплан

### Критерии оценки
- Глубина анализа аудитории (0-3)
- Качество дифференциации (0-3)
- Стратегическое мышление (0-2)
- Презентация (0-2)`,
    },
  ]

  for (const module of marketerModules) {
    await prisma.module.create({
      data: { ...module, trailId: marketer.id },
    })
  }

  // UI Designer Modules
  const uiDesignerModules = [
    {
      slug: "figma-basics",
      title: "Основы Figma",
      description: "Познакомься с интерфейсом и базовыми инструментами Figma",
      type: "THEORY",
      level: "Beginner",
      points: 50,
      duration: "30 мин",
      order: 1,
      content: `# Основы Figma

## Интерфейс

- Левая панель — слои и страницы
- Правая панель — свойства
- Верхняя панель — инструменты

## Базовые инструменты

- Frame (F) — контейнеры
- Rectangle (R) — прямоугольники
- Text (T) — текст
- Pen (P) — векторные формы`,
    },
    {
      slug: "auto-layout-variants",
      title: "Auto Layout и Variants",
      description: "Освой продвинутые функции для создания адаптивных компонентов",
      type: "PRACTICE",
      level: "Intermediate",
      points: 75,
      duration: "45 мин",
      order: 2,
      content: `# Auto Layout и Variants

## Auto Layout

Позволяет создавать адаптивные контейнеры, которые автоматически подстраиваются под контент.

## Variants

Варианты позволяют создавать разные состояния компонента (hover, active, disabled).`,
    },
    {
      slug: "ui-kit-creation",
      title: "Создание UI Kit",
      description: "Научись создавать переиспользуемую библиотеку компонентов",
      type: "PRACTICE",
      level: "Intermediate",
      points: 100,
      duration: "1 час",
      order: 3,
      content: `# Создание UI Kit

## Структура UI Kit

- Цвета и типографика
- Кнопки и формы
- Карточки и контейнеры
- Навигация
- Иконки`,
    },
    {
      slug: "project-junior-mobile",
      title: "Проект Junior: Мобильное приложение",
      description: "Создай дизайн мобильного приложения с 5+ экранами",
      type: "PROJECT",
      level: "Junior",
      points: 150,
      duration: "2 дня",
      order: 4,
      requirements: `## Требования к проекту

### Экраны
- Онбординг (3 шага)
- Авторизация
- Главный экран
- Профиль
- Детальный экран

### Критерии оценки
- Визуальный дизайн (0-4)
- Консистентность (0-3)
- Юзабилити (0-3)`,
    },
    {
      slug: "project-middle-dashboard",
      title: "Проект Middle: B2B Дашборд",
      description: "Спроектируй сложный дашборд для бизнес-приложения",
      type: "PROJECT",
      level: "Middle",
      points: 200,
      duration: "3 дня",
      order: 5,
      requirements: `## Требования к проекту

### Компоненты дашборда
- Навигация (sidebar + header)
- Виджеты с метриками
- Графики и диаграммы
- Таблицы с фильтрами
- Модальные окна

### Критерии оценки
- Информационная архитектура (0-3)
- Визуальная иерархия (0-3)
- Компонентный подход (0-2)
- Адаптивность (0-2)`,
    },
  ]

  for (const module of uiDesignerModules) {
    await prisma.module.create({
      data: { ...module, trailId: uiDesigner.id },
    })
  }

  // R&D Creator Modules
  const rndCreatorModules = [
    {
      slug: "product-thinking",
      title: "Product Thinking",
      description: "Освой основы продуктового мышления",
      type: "THEORY",
      level: "Beginner",
      points: 50,
      duration: "30 мин",
      order: 1,
      content: `# Product Thinking

## Что такое продуктовое мышление?

Способность думать о продукте с точки зрения пользователя и бизнеса одновременно.

## Ключевые вопросы

- Какую проблему мы решаем?
- Для кого мы это делаем?
- Почему они выберут нас?
- Как мы будем зарабатывать?`,
    },
    {
      slug: "competitor-analysis",
      title: "Анализ конкурентов",
      description: "Научись системно анализировать конкурентную среду",
      type: "PRACTICE",
      level: "Intermediate",
      points: 75,
      duration: "45 мин",
      order: 2,
      content: `# Анализ конкурентов

## Типы конкурентов

- Прямые
- Косвенные
- Потенциальные

## Что анализировать

- Функционал
- Ценообразование
- Позиционирование
- Каналы привлечения`,
    },
    {
      slug: "project-junior-niche",
      title: "Проект Junior: Анализ AI-ниши",
      description: "Проведи исследование ниши в сфере AI-инструментов",
      type: "PROJECT",
      level: "Junior",
      points: 150,
      duration: "2 дня",
      order: 3,
      requirements: `## Требования к проекту

### Что нужно исследовать
- Обзор ниши (размер рынка, тренды)
- Анализ 5+ конкурентов
- SWOT-анализ
- Потенциальные возможности

### Формат
- Notion документ или презентация
- 15-20 слайдов/страниц

### Критерии оценки
- Глубина исследования (0-4)
- Структура и логика (0-3)
- Качество выводов (0-3)`,
    },
    {
      slug: "project-middle-roadmap",
      title: "Проект Middle: Product Roadmap + GTM",
      description: "Разработай продуктовую стратегию и план выхода на рынок",
      type: "PROJECT",
      level: "Middle",
      points: 200,
      duration: "3 дня",
      order: 4,
      requirements: `## Требования к проекту

### Продуктовая часть
- Vision & Strategy
- User Personas
- MVP Scope
- Product Roadmap (3-6 месяцев)

### Go-to-Market
- Позиционирование
- Каналы привлечения
- Pricing strategy
- Launch план

### Критерии оценки
- Стратегическое видение (0-3)
- Реалистичность плана (0-3)
- Глубина GTM (0-2)
- Презентация (0-2)`,
    },
  ]

  for (const module of rndCreatorModules) {
    await prisma.module.create({
      data: { ...module, trailId: rndCreator.id },
    })
  }

  console.log("Created modules for all trails")

  // Enroll student in Vibe Coder trail
  await prisma.enrollment.create({
    data: {
      userId: student.id,
      trailId: vibeCoder.id,
    },
  })

  // Get first two modules of Vibe Coder
  const modules = await prisma.module.findMany({
    where: { trailId: vibeCoder.id },
    orderBy: { order: "asc" },
    take: 2,
  })

  // Set first module as completed
  if (modules[0]) {
    await prisma.moduleProgress.create({
      data: {
        userId: student.id,
        moduleId: modules[0].id,
        status: "COMPLETED",
        startedAt: new Date(Date.now() - 86400000 * 3),
        completedAt: new Date(Date.now() - 86400000 * 2),
      },
    })
  }

  // Set second module as in progress
  if (modules[1]) {
    await prisma.moduleProgress.create({
      data: {
        userId: student.id,
        moduleId: modules[1].id,
        status: "IN_PROGRESS",
        startedAt: new Date(Date.now() - 86400000),
      },
    })
  }

  console.log("Created enrollment and progress for student")

  console.log("Seed completed successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
