import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Clean existing data
  await prisma.questionAttempt.deleteMany()
  await prisma.question.deleteMany()
  await prisma.taskProgress.deleteMany()
  await prisma.review.deleteMany()
  await prisma.submission.deleteMany()
  await prisma.unitProgress.deleteMany()
  await prisma.moduleProgress.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.unit.deleteMany()
  await prisma.module.deleteMany()
  await prisma.trail.deleteMany()
  await prisma.invite.deleteMany()
  await prisma.user.deleteMany()

  // Create admin user
  const adminPassword = await bcrypt.hash("vova_dev/", 10)
  const admin = await prisma.user.create({
    data: {
      email: "vova.danilkovich.vova@gmail.com",
      password: adminPassword,
      name: "Vova Admin",
      role: "ADMIN",
      totalXP: 0,
      currentStreak: 0,
    },
  })

  // Create initial invite codes
  await prisma.invite.createMany({
    data: [
      { code: "PROMETHEUS2024", maxUses: 100, createdById: admin.id },
      { code: "VIBE-CODER-VIP", maxUses: 50, createdById: admin.id },
    ],
  })

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
      invitedBy: admin.id,
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
      invitedBy: admin.id,
    },
  })

  console.log("Created users:", { admin: admin.email, teacher: teacher.email, student: student.email })

  // =====================
  // TRAIL 1: VIBE CODER
  // =====================
  const vibeCoder = await prisma.trail.create({
    data: {
      slug: "vibe-coder",
      title: "Vibe Coder",
      subtitle: "Разработка продуктов с использованием AI-инструментов",
      description: "Научись создавать полноценные приложения с помощью Claude, Cursor, ChatGPT. Ключевые компетенции: промптинг, архитектура, деплой, отладка, документирование.",
      icon: "Code",
      color: "#6366f1",
      duration: "~ 3 часа",
      order: 1,
    },
  })

  const vibeCoderModules = [
    {
      slug: "vibe-intro",
      title: "Введение в Vibe Coding",
      description: "Что такое Vibe Coding и как AI меняет разработку",
      type: "THEORY",
      level: "Beginner",
      points: 50,
      duration: "15 мин",
      order: 1,
      content: `# Введение в Vibe Coding

## Что такое Vibe Coding?

Vibe Coding — это современный подход к разработке, где вы описываете свои идеи AI-ассистенту, который помогает превратить их в работающий код.

## Ключевые компетенции

- **Промптинг и работа с AI** — умение формулировать задачи для AI
- **Понимание архитектуры** — знание как устроены современные приложения
- **Деплой и DevOps** — публикация приложений в интернет
- **Отладка и тестирование** — поиск и исправление ошибок
- **Документирование** — описание кода и решений

## Инструменты Vibe Coder

- **Claude** — AI-ассистент для написания кода
- **Cursor** — AI-powered IDE
- **ChatGPT** — генерация и объяснение кода
- **v0.dev** — генерация UI компонентов
- **Railway/Vercel** — платформы для деплоя`,
    },
    {
      slug: "vibe-prompting",
      title: "Основы промптинга",
      description: "Как эффективно общаться с AI для получения качественного кода",
      type: "PRACTICE",
      level: "Beginner",
      points: 75,
      duration: "30 мин",
      order: 2,
      content: `# Основы промптинга

## Структура эффективного промпта

### 1. Контекст
"Я создаю веб-приложение на Next.js 14 с TypeScript и Prisma."

### 2. Задача
"Создай API endpoint для регистрации пользователя."

### 3. Требования
- Валидация email и пароля
- Хеширование пароля с bcrypt
- Возврат JWT токена

### 4. Примеры
Приведите примеры желаемого результата.

## Практические советы

- Будьте конкретны в описании задачи
- Разбивайте сложные задачи на шаги
- Просите объяснения если что-то непонятно
- Итерируйте и уточняйте результат`,
    },
    {
      slug: "vibe-architecture",
      title: "Архитектура веб-приложений",
      description: "Понимание структуры современных приложений",
      type: "THEORY",
      level: "Intermediate",
      points: 100,
      duration: "45 мин",
      order: 3,
      content: `# Архитектура веб-приложений

## Типичный стек

### Frontend
- React/Next.js, TypeScript, Tailwind CSS, Shadcn/ui

### Backend
- Next.js API Routes, Prisma ORM, NextAuth.js

### База данных
- PostgreSQL + Supabase/Railway

### Инфраструктура
- Vercel/Railway для деплоя, GitHub для версий

## Паттерны

### Server vs Client Components
- Server — рендер на сервере, доступ к БД
- Client — интерактивность в браузере`,
    },
    {
      slug: "vibe-project-junior",
      title: "Проект Junior: Финансовый трекер",
      description: "Приложение для учёта личных доходов и расходов",
      type: "PROJECT",
      level: "Junior",
      points: 200,
      duration: "1-2 дня",
      order: 4,
      requirements: `# Персональный финансовый трекер

## Функциональные требования

- Добавление транзакций: сумма, категория, дата, описание
- Разделение на доходы и расходы
- Фильтрация по дате и категории
- Статистика: баланс, расходы по категориям (графики)
- Экспорт данных в CSV
- Хранение в базе данных

## Формат
Веб-приложение ИЛИ Telegram бот

## Время: 1-2 дня

## Что сдать
1. Ссылка на работающее приложение
2. Ссылка на GitHub репозиторий

## Критерии оценки
- Работоспособность — 40%
- Качество кода — 30%
- UX — 20%
- Визуализация — 10%`,
    },
    {
      slug: "vibe-project-middle",
      title: "Проект Middle: Task Manager SaaS",
      description: "SaaS-платформа для управления задачами команды",
      type: "PROJECT",
      level: "Middle",
      points: 300,
      duration: "2 дня",
      order: 5,
      requirements: `# SaaS-платформа для управления задачами

## Функциональные требования

- Регистрация и авторизация (email + пароль)
- Создание проектов с участниками
- Задачи: название, описание, исполнитель, дедлайн, приоритет
- Статусы: To Do → In Progress → Review → Done
- Kanban-доска с drag-and-drop
- Уведомления о дедлайнах
- Аналитика: задачи по статусам, просроченные

## Технические требования

- Любой стек (рекомендуется Next.js + Prisma + PostgreSQL)
- Деплой на публичный URL
- GitHub с README

## Время: 2 дня

## Критерии оценки
- Полнота функционала — 30%
- Архитектура и код — 30%
- UX/UI — 25%
- Документация — 15%`,
    },
    {
      slug: "vibe-project-senior",
      title: "Проект Senior: Мини-Zapier",
      description: "Платформа автоматизации рабочих процессов",
      type: "PROJECT",
      level: "Senior",
      points: 500,
      duration: "2 дня",
      order: 6,
      requirements: `# Платформа автоматизации (мини-Zapier)

## Функциональные требования

- Визуальный редактор workflow (drag-and-drop)
- 3 типа триггеров: Webhook, Расписание (cron), Email
- 5 типов действий: HTTP запрос, Email, Telegram, БД, Трансформация данных
- Логирование шагов выполнения
- Обработка ошибок: retry, уведомления, пауза
- Дашборд: список workflows, история, статистика

## Технические требования

- Очередь задач (Bull или аналог)
- Изоляция выполнения workflows
- REST API + Swagger документация

## Время: 2 дня

## Критерии оценки
- End-to-end работоспособность — 25%
- Архитектура — 30%
- Визуальный редактор — 20%
- Обработка ошибок — 15%
- Документация — 10%`,
    },
  ]

  // Create modules and questions for Vibe Coder
  const vibeCoderQuestions: Record<string, Array<{ question: string; options: string[]; correctAnswer: number }>> = {
    "vibe-intro": [
      { question: "Что такое Vibe Coding?", options: ["Программирование под музыку", "Подход к разработке с использованием AI-ассистентов", "Язык программирования", "Метод тестирования"], correctAnswer: 1 },
      { question: "Какой инструмент НЕ используется в Vibe Coding?", options: ["Claude", "Cursor", "Visual Basic 6", "ChatGPT"], correctAnswer: 2 },
      { question: "Что НЕ входит в ключевые компетенции Vibe Coder?", options: ["Промптинг", "Понимание архитектуры", "Ручное написание ассемблера", "Деплой и DevOps"], correctAnswer: 2 },
    ],
    "vibe-prompting": [
      { question: "Какой элемент НЕ входит в структуру эффективного промпта?", options: ["Контекст", "Задача", "Ваше настроение", "Требования"], correctAnswer: 2 },
      { question: "Что лучше делать при сложной задаче для AI?", options: ["Писать один большой промпт", "Разбивать на шаги", "Не использовать примеры", "Избегать контекста"], correctAnswer: 1 },
      { question: "Как правильно описать задачу AI?", options: ["Абстрактно и кратко", "Конкретно с примерами", "Только код без объяснений", "Только на английском"], correctAnswer: 1 },
    ],
    "vibe-architecture": [
      { question: "Что такое Server Components в Next.js?", options: ["Компоненты для серверной комнаты", "Компоненты, рендерящиеся на сервере с доступом к БД", "Компоненты только для API", "Устаревшая технология"], correctAnswer: 1 },
      { question: "Какой ORM рекомендуется для Next.js?", options: ["Sequelize", "Prisma", "Mongoose", "TypeORM"], correctAnswer: 1 },
      { question: "Для чего нужен Tailwind CSS?", options: ["Для работы с базой данных", "Для utility-first стилизации", "Для тестирования", "Для деплоя"], correctAnswer: 1 },
    ],
  }

  for (const module of vibeCoderModules) {
    const createdModule = await prisma.module.create({ data: { ...module, trailId: vibeCoder.id } })

    // Add questions for theory/practice modules
    const questions = vibeCoderQuestions[module.slug]
    if (questions) {
      for (let i = 0; i < questions.length; i++) {
        await prisma.question.create({
          data: {
            moduleId: createdModule.id,
            question: questions[i].question,
            options: JSON.stringify(questions[i].options),
            correctAnswer: questions[i].correctAnswer,
            order: i + 1,
          },
        })
      }
    }
  }

  // =====================
  // TRAIL 2: МАРКЕТОЛОГ
  // =====================
  const marketer = await prisma.trail.create({
    data: {
      slug: "marketer",
      title: "Маркетолог",
      subtitle: "Создание конверсионных воронок и лендингов",
      description: "Научись создавать продающие воронки, писать конверсионные тексты. Ключевые компетенции: конверсионная логика, понимание ЦА, копирайтинг, A/B мышление.",
      icon: "Target",
      color: "#ec4899",
      duration: "~ 3 часа",
      order: 2,
    },
  })

  const marketerModules = [
    {
      slug: "marketing-intro",
      title: "Основы конверсионного маркетинга",
      description: "Что такое конверсия и воронки продаж",
      type: "THEORY",
      level: "Beginner",
      points: 50,
      duration: "20 мин",
      order: 1,
      content: `# Основы конверсионного маркетинга

## Что такое конверсия?

Конверсия — процент посетителей, совершающих целевое действие.

## Воронка продаж (AIDA)

- **Attention** — привлечь внимание
- **Interest** — вызвать интерес
- **Desire** — создать желание
- **Action** — побудить к действию

## Ключевые компетенции

- Конверсионная логика
- Понимание ЦА
- Копирайтинг
- Визуальный дизайн
- A/B мышление`,
    },
    {
      slug: "marketing-audience",
      title: "Анализ целевой аудитории",
      description: "Как определить и сегментировать аудиторию",
      type: "PRACTICE",
      level: "Intermediate",
      points: 75,
      duration: "30 мин",
      order: 2,
      content: `# Анализ целевой аудитории

## Jobs To Be Done

Клиенты не покупают продукты — они "нанимают" их для работы.
Пример: покупают не дрель, а дырку в стене.

## Создание персон

### Демографика
Возраст, пол, география, профессия, доход

### Психографика
Ценности, страхи, мотивации

### Поведение
Где ищет информацию, как принимает решения`,
    },
    {
      slug: "marketing-copywriting",
      title: "Копирайтинг для лендингов",
      description: "Как писать тексты, которые продают",
      type: "PRACTICE",
      level: "Intermediate",
      points: 100,
      duration: "45 мин",
      order: 3,
      content: `# Копирайтинг для лендингов

## Структура лендинга

1. **Hero** — УТП + CTA
2. **Проблема/Решение**
3. **Преимущества** (3-5 фич)
4. **Социальные доказательства**
5. **FAQ**
6. **Финальный CTA**

## Формулы заголовков

- Как [результат] без [боли]
- [Число] способов [решить проблему]
- Почему [результат] проще, чем вы думаете`,
    },
    {
      slug: "marketing-project-junior",
      title: "Проект Junior: Лендинг для приложения",
      description: "Конверсионный лендинг для мобильного фитнес-приложения",
      type: "PROJECT",
      level: "Junior",
      points: 200,
      duration: "1-2 дня",
      order: 4,
      requirements: `# Лендинг для мобильного приложения

## Бриф

**Продукт:** Фитнес-трекер с AI-тренером
**ЦА:** Люди 25-45 лет, хотят похудеть/набрать форму
**Цель:** Скачивание из App Store / Google Play

## Требования

- Hero-секция с УТП и CTA
- "Как это работает" (3-4 шага)
- Преимущества с иконками
- Отзывы (3-4 штуки)
- FAQ (5-6 вопросов)
- Кнопки App Store / Google Play
- Мобильный адаптив

## Критерии
- Конверсионность — 40%
- Визуал — 30%
- Копирайтинг — 20%
- Техника — 10%`,
    },
    {
      slug: "marketing-project-middle",
      title: "Проект Middle: Воронка для SaaS",
      description: "Полная конверсионная воронка для B2B продукта",
      type: "PROJECT",
      level: "Middle",
      points: 300,
      duration: "2 дня",
      order: 5,
      requirements: `# Конверсионная воронка для SaaS

## Бриф

**Продукт:** B2B платформа email-маркетинга
**ЦА:** Маркетологи, владельцы малого бизнеса
**Цель:** Регистрация на 14-дневный trial

## Требования

### Прелендинг (один из)
- Кейс клиента с цифрами
- Калькулятор ROI
- Квиз "Подходит ли вам email-маркетинг?"

### Лендинг
- Hero с УТП
- Фичи (3-5), Pricing (3 тарифа)
- Отзывы, FAQ, CTA

### Thank you page
- Шаги онбординга

### Документация
- Анализ ЦА и болей
- Логика конверсии

## Критерии
- Конверсионная логика — 35%
- Понимание ЦА — 25%
- Визуал и UX — 25%
- Техника — 15%`,
    },
    {
      slug: "marketing-project-senior",
      title: "Проект Senior: Мультисегментная кампания",
      description: "Персонализированные воронки для 3 сегментов",
      type: "PROJECT",
      level: "Senior",
      points: 500,
      duration: "2 дня",
      order: 6,
      requirements: `# Мультисегментная кампания

## Бриф

**Продукт:** Платформа онлайн-образования (программирование)
**Задача:** Привлечь 3 сегмента ЦА

## Сегменты

1. **Новички** — хотят в IT с нуля, боятся сложности
2. **Джуниоры** — хотят вырасти до мидла, увеличить ЗП
3. **Менеджеры** — хотят понимать разработку

## Требования

- 3 воронки (прелендинг + лендинг) под каждый сегмент
- Персонализированные сообщения и визуал
- A/B вариант для одного сегмента
- Интерактивный элемент (квиз/калькулятор)

### Стратегия (документ)
- Анализ сегментов: боли, возражения, триггеры
- Каналы привлечения
- Гипотезы A/B, метрики успеха

## Критерии
- Понимание сегментов — 30%
- Персонализация — 25%
- Конверсионность — 20%
- A/B — 15%
- Техника — 10%`,
    },
  ]

  // Create modules and questions for Marketer
  const marketerQuestions: Record<string, Array<{ question: string; options: string[]; correctAnswer: number }>> = {
    "marketing-intro": [
      { question: "Что такое конверсия?", options: ["Валютный курс", "Процент посетителей, совершающих целевое действие", "Тип рекламы", "Метод SEO"], correctAnswer: 1 },
      { question: "Что означает буква D в модели AIDA?", options: ["Decision", "Desire", "Delivery", "Data"], correctAnswer: 1 },
      { question: "Что НЕ является частью воронки AIDA?", options: ["Attention", "Interest", "Investigation", "Action"], correctAnswer: 2 },
    ],
    "marketing-audience": [
      { question: "Что такое Jobs To Be Done?", options: ["Список вакансий", "Концепция: клиенты 'нанимают' продукты для работы", "Метод управления", "Тип CRM"], correctAnswer: 1 },
      { question: "Что входит в психографику аудитории?", options: ["Возраст и пол", "Ценности и страхи", "Город проживания", "Доход"], correctAnswer: 1 },
      { question: "Для чего создают персоны?", options: ["Для дизайна логотипа", "Для понимания целевой аудитории", "Для SEO", "Для бухгалтерии"], correctAnswer: 1 },
    ],
    "marketing-copywriting": [
      { question: "Что такое УТП?", options: ["Уникальное торговое предложение", "Универсальный текстовый процессор", "Условия торговой площадки", "Ускоренный тест продукта"], correctAnswer: 0 },
      { question: "Что обычно идёт в Hero-секции лендинга?", options: ["FAQ", "УТП и CTA", "Отзывы", "Контакты"], correctAnswer: 1 },
      { question: "Какая формула заголовка эффективна?", options: ["Просто название компании", "Как [результат] без [боли]", "Только цена", "Дата основания"], correctAnswer: 1 },
    ],
  }

  for (const module of marketerModules) {
    const createdModule = await prisma.module.create({ data: { ...module, trailId: marketer.id } })

    const questions = marketerQuestions[module.slug]
    if (questions) {
      for (let i = 0; i < questions.length; i++) {
        await prisma.question.create({
          data: {
            moduleId: createdModule.id,
            question: questions[i].question,
            options: JSON.stringify(questions[i].options),
            correctAnswer: questions[i].correctAnswer,
            order: i + 1,
          },
        })
      }
    }
  }

  // =====================
  // TRAIL 3: UI ДИЗАЙНЕР
  // =====================
  const uiDesigner = await prisma.trail.create({
    data: {
      slug: "ui-designer",
      title: "UI Дизайнер",
      subtitle: "Проектирование интерфейсов и дизайн-систем",
      description: "Научись создавать красивые интерфейсы в Figma. Ключевые компетенции: Auto Layout, Variants, UX-мышление, дизайн-системы, прототипирование.",
      icon: "Palette",
      color: "#14b8a6",
      duration: "~ 3 часа",
      order: 3,
    },
  })

  const uiDesignerModules = [
    {
      slug: "design-intro",
      title: "Основы UI дизайна",
      description: "Принципы визуального дизайна интерфейсов",
      type: "THEORY",
      level: "Beginner",
      points: 50,
      duration: "20 мин",
      order: 1,
      content: `# Основы UI дизайна

## Принципы визуального дизайна

- **Иерархия** — важное выделяется
- **Консистентность** — одинаковые элементы выглядят одинаково
- **Proximity** — связанные элементы группируются
- **Alignment** — выравнивание по сетке
- **Whitespace** — достаточно воздуха между элементами

## Сетка и отступы

- 8px сетка — базовый шаг
- Отступы: 8, 16, 24, 32, 48, 64px
- Макс. ширина: 1200-1440px`,
    },
    {
      slug: "design-figma",
      title: "Figma: Auto Layout и Variants",
      description: "Продвинутые техники работы в Figma",
      type: "PRACTICE",
      level: "Intermediate",
      points: 75,
      duration: "45 мин",
      order: 2,
      content: `# Figma: Auto Layout и Variants

## Auto Layout

- **Direction** — горизонтальное/вертикальное
- **Gap** — расстояние между элементами
- **Padding** — внутренние отступы
- **Hug vs Fill** — размер по содержимому или заполнить

## Variants

Разные состояния компонента:
- State: Default, Hover, Pressed, Disabled
- Size: Small, Medium, Large
- Type: Primary, Secondary, Ghost

## Atomic Design

Atoms → Molecules → Organisms → Templates → Pages`,
    },
    {
      slug: "design-systems",
      title: "Дизайн-системы",
      description: "Как создавать масштабируемые UI Kit",
      type: "PRACTICE",
      level: "Intermediate",
      points: 100,
      duration: "45 мин",
      order: 3,
      content: `# Дизайн-системы

## Design Tokens

- **Цвета** — primary, secondary, neutral, semantic
- **Типографика** — шрифты, размеры, line-height
- **Spacing** — 4, 8, 12, 16, 24, 32, 48, 64
- **Shadows** — sm, md, lg, xl
- **Border Radius** — sm, md, lg, full

## Компоненты

- Кнопки, Инпуты, Селекты
- Карточки, Модалки, Алерты
- Таблицы, Навигация, Табы

## Документация

Для каждого компонента: когда использовать, варианты, Do's/Don'ts`,
    },
    {
      slug: "design-project-junior",
      title: "Проект Junior: Мобильное приложение",
      description: "Дизайн приложения для заказа еды",
      type: "PROJECT",
      level: "Junior",
      points: 200,
      duration: "1-2 дня",
      order: 4,
      requirements: `# Мобильное приложение для заказа еды

## Экраны (минимум 6)

- Онбординг (2-3 слайда)
- Каталог ресторанов с фильтрами
- Страница ресторана с меню
- Корзина
- Оформление заказа
- Отслеживание доставки

## Требования

- UI Kit с базовыми компонентами
- iOS или Android стиль
- Реалистичный контент

## Критерии
- Визуал — 35%
- UX — 35%
- Консистентность — 20%
- UI Kit — 10%`,
    },
    {
      slug: "design-project-middle",
      title: "Проект Middle: B2B Дашборд",
      description: "Дизайн-система для аналитического дашборда",
      type: "PROJECT",
      level: "Middle",
      points: 300,
      duration: "2 дня",
      order: 5,
      requirements: `# Дизайн-система для B2B дашборда

## Экраны (минимум 8)

- Авторизация (логин, регистрация, восстановление)
- Дашборд с виджетами и графиками
- Таблица с сортировкой, фильтрами, пагинацией
- Детальная карточка / отчёт
- Многошаговая форма
- Настройки, Профиль
- Пустые состояния и ошибки

## UI Kit

- Кнопки (все состояния)
- Инпуты, Селекты, Чекбоксы, Toggle
- Таблицы, Карточки, Модалки, Тосты
- Графики (line, bar, pie)

## Требования

- Тёмная И светлая тема
- Desktop + планшет
- Auto Layout и Variants

## Критерии
- Системность — 30%
- Визуал — 25%
- UX — 25%
- Организация файла — 10%
- Адаптивность — 10%`,
    },
    {
      slug: "design-project-senior",
      title: "Проект Senior: Кроссплатформенная система",
      description: "Финтех-приложение для Web и Mobile",
      type: "PROJECT",
      level: "Senior",
      points: 500,
      duration: "2 дня",
      order: 6,
      requirements: `# Кроссплатформенная дизайн-система

## Описание
Финтех-приложение: личные финансы + инвестиции

## Web (минимум 10 экранов)

- Дашборд (баланс, графики, транзакции)
- Счета и карты
- История транзакций
- Аналитика расходов
- Инвестиции: портфель, сделки
- Переводы и платежи
- Настройки и профиль

## Mobile (минимум 8 экранов)

- Упрощённый дашборд
- Быстрые действия
- История транзакций
- Аналитика и Инвестиции (mobile)
- iOS И Android варианты

## Дизайн-система

- Полный UI Kit с Variants
- Документация компонентов
- Токены + кастомные иконки (20+)

## Что сдать
- Figma
- Прототип 1 flow
- Документ с дизайн-принципами

## Критерии
- Масштабируемость — 25%
- Визуал — 20%
- UX — 20%
- Web↔Mobile — 15%
- Документация — 10%
- Прототип — 10%`,
    },
  ]

  // Create modules and questions for UI Designer
  const uiDesignerQuestions: Record<string, Array<{ question: string; options: string[]; correctAnswer: number }>> = {
    "design-intro": [
      { question: "Какой базовый шаг сетки используется в UI?", options: ["4px", "8px", "10px", "12px"], correctAnswer: 1 },
      { question: "Что означает принцип Proximity?", options: ["Цветовая схема", "Связанные элементы группируются", "Большие отступы", "Яркие кнопки"], correctAnswer: 1 },
      { question: "Что НЕ является принципом визуального дизайна?", options: ["Иерархия", "Консистентность", "Максимализм", "Alignment"], correctAnswer: 2 },
    ],
    "design-figma": [
      { question: "Что такое Auto Layout в Figma?", options: ["Автоматическая генерация кода", "Система автоматического размещения элементов", "Плагин для анимаций", "Экспорт в CSS"], correctAnswer: 1 },
      { question: "Для чего нужны Variants в Figma?", options: ["Для экспорта", "Для разных состояний компонента", "Для анимаций", "Для комментариев"], correctAnswer: 1 },
      { question: "Что такое Atomic Design?", options: ["Физика в дизайне", "Методология: Atoms → Molecules → Organisms", "Плагин Figma", "Тип шрифта"], correctAnswer: 1 },
    ],
    "design-systems": [
      { question: "Что такое Design Tokens?", options: ["Криптовалюта для дизайнеров", "Переменные для цветов, шрифтов, отступов", "Тип компонента", "Метод анимации"], correctAnswer: 1 },
      { question: "Какой компонент НЕ входит в типичную дизайн-систему?", options: ["Кнопки", "Инпуты", "Бэкенд код", "Карточки"], correctAnswer: 2 },
      { question: "Что должна содержать документация компонента?", options: ["Только скриншот", "Когда использовать, варианты, Do's/Don'ts", "Только код", "Ничего"], correctAnswer: 1 },
    ],
  }

  for (const module of uiDesignerModules) {
    const createdModule = await prisma.module.create({ data: { ...module, trailId: uiDesigner.id } })

    const questions = uiDesignerQuestions[module.slug]
    if (questions) {
      for (let i = 0; i < questions.length; i++) {
        await prisma.question.create({
          data: {
            moduleId: createdModule.id,
            question: questions[i].question,
            options: JSON.stringify(questions[i].options),
            correctAnswer: questions[i].correctAnswer,
            order: i + 1,
          },
        })
      }
    }
  }

  // =====================
  // TRAIL 4: R&D КРЕАТОР
  // =====================
  const rndCreator = await prisma.trail.create({
    data: {
      slug: "rnd-creator",
      title: "R&D Креатор",
      subtitle: "Генерация идей, исследование рынка, концепции",
      description: "Научись придумывать продуктовые идеи, анализировать рынок. Ключевые компетенции: креативность, аналитика, бизнес-мышление, product sense.",
      icon: "Lightbulb",
      color: "#f59e0b",
      duration: "~ 3 часа",
      order: 4,
    },
  })

  const rndCreatorModules = [
    {
      slug: "rnd-intro",
      title: "Product Thinking",
      description: "Основы продуктового мышления",
      type: "THEORY",
      level: "Beginner",
      points: 50,
      duration: "20 мин",
      order: 1,
      content: `# Product Thinking

## Ключевые вопросы

- Какую проблему решаем?
- Кто страдает от проблемы?
- Насколько она острая?
- Как решаем? Почему лучше альтернатив?
- Как зарабатываем?

## Jobs To Be Done

Клиенты "нанимают" продукты для выполнения работы.
Пример: покупают не дрель, а дырку в стене.

## Компетенции R&D Креатора

- Креативность
- Аналитическое мышление
- Понимание рынка
- Бизнес-мышление
- Product sense`,
    },
    {
      slug: "rnd-competitors",
      title: "Анализ конкурентов",
      description: "Как исследовать конкурентную среду",
      type: "PRACTICE",
      level: "Intermediate",
      points: 75,
      duration: "30 мин",
      order: 2,
      content: `# Анализ конкурентов

## Типы конкурентов

- **Прямые** — та же проблема, тот же способ
- **Косвенные** — та же проблема, другой способ
- **Потенциальные** — могут выйти на рынок

## Что анализировать

### Продукт
Функционал, уникальные фичи, UX

### Бизнес
Монетизация, цены, каналы, команда

### Позиционирование
ЦА, ключевые сообщения

## Инструменты

SimilarWeb, Product Hunt, G2/Capterra, LinkedIn`,
    },
    {
      slug: "rnd-business-model",
      title: "Бизнес-модели и монетизация",
      description: "Как зарабатывать на продукте",
      type: "PRACTICE",
      level: "Intermediate",
      points: 100,
      duration: "45 мин",
      order: 3,
      content: `# Бизнес-модели

## Модели монетизации

- **Подписка** — ежемесячный платёж (Netflix, SaaS)
- **Freemium** — базовое бесплатно (Slack, Notion)
- **Транзакционная** — комиссия (Stripe, Airbnb)
- **Рекламная** — показ рекламы (Google, Facebook)

## Unit-экономика

- **CAC** — стоимость привлечения клиента
- **LTV** — lifetime value клиента
- **Правило:** LTV > 3x CAC
- **ARPU** — средний доход с пользователя

## Точка безубыточности

Fixed Costs / (Price - Variable Cost)`,
    },
    {
      slug: "rnd-project-junior",
      title: "Проект Junior: Анализ AI-ниши",
      description: "Исследование ниши AI-продуктов",
      type: "PROJECT",
      level: "Junior",
      points: 200,
      duration: "1-2 дня",
      order: 4,
      requirements: `# Анализ ниши AI-продуктов

## Ниша (на выбор)

AI для HR / маркетинга / продаж / образования / финансов / здоровья

## Требования

### Исследование
- 5 продуктов в нише
- По каждому: функционал, цены, ЦА, плюсы/минусы
- Сравнительная таблица

### Выводы
- Gaps — чего не хватает рынку
- Идея продукта, закрывающего gap
- Обоснование перспективности

## Формат
Документ 2-3 страницы + таблица

## Критерии
- Глубина исследования — 40%
- Качество выводов — 30%
- Идея — 20%
- Структура — 10%`,
    },
    {
      slug: "rnd-project-middle",
      title: "Проект Middle: Концепция AI-продукта",
      description: "Детальная проработка идеи продукта",
      type: "PROJECT",
      level: "Middle",
      points: 300,
      duration: "2 дня",
      order: 5,
      requirements: `# Концепция AI-продукта

## Требования

### 1. Проблема
- Что решаем? Кто страдает?
- Как решают сейчас? Почему недостаточно?

### 2. Решение
- Что делает продукт?
- Как работает AI?
- В чём уникальность? User flow?

### 3. Конкуренты
- 3+ конкурента, сравнительная таблица
- Как отстраиваемся?

### 4. MVP
- Must have / Nice to have
- Оценка сроков

### 5. Бизнес-модель
- Монетизация, unit-экономика, рынок

### 6. Риски
- Технические, рыночные, регуляторные
- Митигация

## Формат
Документ 3-5 стр. или презентация 15-20 слайдов

## Защита: 15-мин pitch

## Критерии
- Проблема — 25%
- Решение — 25%
- Бизнес — 25%
- Конкуренты — 15%
- Презентация — 10%`,
    },
    {
      slug: "rnd-project-senior",
      title: "Проект Senior: Product Roadmap + GTM",
      description: "Полная проработка до уровня инвестиций",
      type: "PROJECT",
      level: "Senior",
      points: 500,
      duration: "2 дня",
      order: 6,
      requirements: `# Product Roadmap + GTM

## Product

- Детальное описание всех фич
- 3+ User Personas со сценариями
- 15+ User Stories для MVP
- Roadmap 6 месяцев: MVP → v1.0 → v1.5
- Приоритизация (MoSCoW/ICE)

## Прототип

- Кликабельный в Figma
- 5+ ключевых экранов
- 1 полный user flow

## Go-to-Market

- Сегментация ЦА
- Каналы + оценка CAC
- Ценообразование + LTV
- План на первых 100 клиентов

## Финансы

- Unit-экономика
- Прогноз 12 месяцев
- Точка безубыточности

## Что сдать
- Документ 5-10 стр. или презентация 25-30 слайдов
- Прототип Figma
- 15-мин pitch

## Критерии
- Стратегия — 25%
- Детализация — 20%
- Прототип — 20%
- GTM — 15%
- Финансы — 10%
- Pitch — 10%`,
    },
  ]

  // Create modules and questions for R&D Creator
  const rndCreatorQuestions: Record<string, Array<{ question: string; options: string[]; correctAnswer: number }>> = {
    "rnd-intro": [
      { question: "Какой главный вопрос Product Thinking?", options: ["Сколько это стоит?", "Какую проблему решаем?", "Какой цвет логотипа?", "Кто конкуренты?"], correctAnswer: 1 },
      { question: "Что означает Jobs To Be Done?", options: ["Список задач для разработчиков", "Клиенты 'нанимают' продукты для работы", "Метод управления проектами", "KPI для сотрудников"], correctAnswer: 1 },
      { question: "Что НЕ является компетенцией R&D Креатора?", options: ["Креативность", "Написание кода", "Понимание рынка", "Product sense"], correctAnswer: 1 },
    ],
    "rnd-competitors": [
      { question: "Кто такие косвенные конкуренты?", options: ["Партнёры", "Решают ту же проблему другим способом", "Клиенты", "Инвесторы"], correctAnswer: 1 },
      { question: "Какой инструмент используют для анализа трафика конкурентов?", options: ["Figma", "SimilarWeb", "Prisma", "Next.js"], correctAnswer: 1 },
      { question: "Что анализируют в продукте конкурента?", options: ["Только цену", "Функционал, UX, уникальные фичи", "Только дизайн", "Только логотип"], correctAnswer: 1 },
    ],
    "rnd-business-model": [
      { question: "Что такое CAC?", options: ["Тип компании", "Стоимость привлечения клиента", "Вид рекламы", "Метрика скорости"], correctAnswer: 1 },
      { question: "Какое правило связывает LTV и CAC?", options: ["LTV = CAC", "LTV > 3x CAC", "CAC > LTV", "LTV < CAC"], correctAnswer: 1 },
      { question: "Что такое Freemium модель?", options: ["Всё платно", "Базовое бесплатно, премиум платно", "Только реклама", "Подписка"], correctAnswer: 1 },
    ],
  }

  for (const module of rndCreatorModules) {
    const createdModule = await prisma.module.create({ data: { ...module, trailId: rndCreator.id } })

    const questions = rndCreatorQuestions[module.slug]
    if (questions) {
      for (let i = 0; i < questions.length; i++) {
        await prisma.question.create({
          data: {
            moduleId: createdModule.id,
            question: questions[i].question,
            options: JSON.stringify(questions[i].options),
            correctAnswer: questions[i].correctAnswer,
            order: i + 1,
          },
        })
      }
    }
  }

  console.log("Created trails:", [vibeCoder.title, marketer.title, uiDesigner.title, rndCreator.title])

  // Enroll student in Vibe Coder
  await prisma.enrollment.create({
    data: { userId: student.id, trailId: vibeCoder.id },
  })

  const firstModule = await prisma.module.findFirst({
    where: { trailId: vibeCoder.id },
    orderBy: { order: "asc" },
  })

  if (firstModule) {
    await prisma.moduleProgress.create({
      data: {
        userId: student.id,
        moduleId: firstModule.id,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    })
  }

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
