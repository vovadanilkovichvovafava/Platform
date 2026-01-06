import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import fs from "fs"
import path from "path"

interface MarketingModule {
  id: number
  title: string
  description: string
  type: string
  content?: string
  theory?: string
  practice?: string
}

interface MarketingCourse {
  course: {
    slug: string
    title: string
    description: string
    icon: string
    totalModules: number
  }
  modules: MarketingModule[]
}

// Transliterate Cyrillic to Latin
const translitMap: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
}

function transliterate(str: string): string {
  return str.toLowerCase().split('').map(char => translitMap[char] || char).join('')
}

function generateSlug(prefix: string, title: string): string {
  const slugBase = transliterate(title)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40)
  return `${prefix}-${slugBase}`
}

// Exercises for each module
function getModuleExercises(moduleId: number): Array<{
  type: "SINGLE_CHOICE" | "MATCHING" | "ORDERING" | "CASE_ANALYSIS"
  question: string
  options: string[]
  correctAnswer: number
  data: Record<string, unknown> | null
}> {
  const exercises: Record<number, Array<{
    type: "SINGLE_CHOICE" | "MATCHING" | "ORDERING" | "CASE_ANALYSIS"
    question: string
    options: string[]
    correctAnswer: number
    data: Record<string, unknown> | null
  }>> = {
    // Module 1: Фундамент - метрики и воронки
    1: [
      {
        type: "MATCHING",
        question: "Сопоставьте метрики с их определениями",
        options: [],
        correctAnswer: 0,
        data: {
          leftLabel: "Метрика",
          rightLabel: "Определение",
          leftItems: [
            { id: "l1", text: "ROI" },
            { id: "l2", text: "CPA" },
            { id: "l3", text: "CTR" },
            { id: "l4", text: "LTV" },
          ],
          rightItems: [
            { id: "r1", text: "Возврат инвестиций" },
            { id: "r2", text: "Стоимость целевого действия" },
            { id: "r3", text: "Процент кликов от показов" },
            { id: "r4", text: "Пожизненная ценность клиента" },
          ],
          correctPairs: { l1: "r1", l2: "r2", l3: "r3", l4: "r4" },
        },
      },
      {
        type: "SINGLE_CHOICE",
        question: "Потрачено 10,000$ на рекламу, получено 500 кликов и 25 покупок со средним чеком 200$. Чему равен ROAS?",
        options: ["0.5", "1.0", "0.25", "2.0"],
        correctAnswer: 0,
        data: null,
      },
      {
        type: "ORDERING",
        question: "Расположите этапы воронки продаж в правильном порядке",
        options: [],
        correctAnswer: 0,
        data: {
          items: [
            { id: "s1", text: "Показ рекламы" },
            { id: "s2", text: "Клик по объявлению" },
            { id: "s3", text: "Просмотр товара" },
            { id: "s4", text: "Добавление в корзину" },
            { id: "s5", text: "Покупка" },
          ],
          correctOrder: ["s1", "s2", "s3", "s4", "s5"],
        },
      },
    ],

    // Module 2: Источники трафика
    2: [
      {
        type: "MATCHING",
        question: "Сопоставьте платформы с их основными особенностями",
        options: [],
        correctAnswer: 0,
        data: {
          leftLabel: "Платформа",
          rightLabel: "Особенность",
          leftItems: [
            { id: "l1", text: "Google Ads" },
            { id: "l2", text: "Facebook Ads" },
            { id: "l3", text: "TikTok Ads" },
            { id: "l4", text: "LinkedIn Ads" },
          ],
          rightItems: [
            { id: "r1", text: "Поисковая реклама по запросам" },
            { id: "r2", text: "Таргетинг по интересам и поведению" },
            { id: "r3", text: "Короткие вирусные видео" },
            { id: "r4", text: "B2B аудитория и профессионалы" },
          ],
          correctPairs: { l1: "r1", l2: "r2", l3: "r3", l4: "r4" },
        },
      },
      {
        type: "SINGLE_CHOICE",
        question: "Какой тип аудитории уже знает о продукте и готов к покупке?",
        options: ["Холодная", "Теплая", "Горячая", "Нейтральная"],
        correctAnswer: 2,
        data: null,
      },
      {
        type: "CASE_ANALYSIS",
        question: "Проанализируйте ситуацию и выберите правильные решения",
        options: [],
        correctAnswer: 0,
        data: {
          caseLabel: "Кейс: Выбор платформы",
          caseContent: "У вас B2B продукт для HR-специалистов. Бюджет ограничен — $5,000/месяц. Нужно получить качественные лиды от HR-директоров крупных компаний. Какие решения правильные?",
          options: [
            { id: "o1", text: "Использовать LinkedIn Ads с таргетингом по должностям", isCorrect: true, explanation: "LinkedIn идеален для B2B и позволяет таргетировать по должностям" },
            { id: "o2", text: "Запустить массовую рекламу в TikTok", isCorrect: false, explanation: "TikTok не подходит для B2B продуктов" },
            { id: "o3", text: "Использовать Google Ads по профессиональным запросам", isCorrect: true, explanation: "Поисковая реклама поможет найти тех, кто уже ищет решение" },
            { id: "o4", text: "Сделать ретаргетинг посетителей сайта", isCorrect: true, explanation: "Ретаргетинг увеличит конверсию теплой аудитории" },
          ],
          minCorrectRequired: 2,
        },
      },
    ],

    // Module 3: Креативы и психология
    3: [
      {
        type: "MATCHING",
        question: "Сопоставьте триггеры с примерами их использования",
        options: [],
        correctAnswer: 0,
        data: {
          leftLabel: "Триггер",
          rightLabel: "Пример",
          leftItems: [
            { id: "l1", text: "FOMO" },
            { id: "l2", text: "Социальное доказательство" },
            { id: "l3", text: "Авторитет" },
            { id: "l4", text: "Дефицит" },
          ],
          rightItems: [
            { id: "r1", text: "Осталось только 3 места!" },
            { id: "r2", text: "10,000 клиентов уже используют" },
            { id: "r3", text: "Рекомендовано экспертами" },
            { id: "r4", text: "Скидка заканчивается сегодня!" },
          ],
          correctPairs: { l1: "r4", l2: "r2", l3: "r3", l4: "r1" },
        },
      },
      {
        type: "ORDERING",
        question: "Расположите элементы формулы AIDA в правильном порядке",
        options: [],
        correctAnswer: 0,
        data: {
          items: [
            { id: "s1", text: "Attention (Внимание)" },
            { id: "s2", text: "Interest (Интерес)" },
            { id: "s3", text: "Desire (Желание)" },
            { id: "s4", text: "Action (Действие)" },
          ],
          correctOrder: ["s1", "s2", "s3", "s4"],
        },
      },
      {
        type: "SINGLE_CHOICE",
        question: "Какой тип заголовка использует боль клиента?",
        options: [
          "Получите скидку 50% сегодня!",
          "Устали терять клиентов из-за плохого сервиса?",
          "Лучший продукт года по версии Forbes",
          "10,000 компаний уже с нами"
        ],
        correctAnswer: 1,
        data: null,
      },
    ],

    // Module 4: Лендинги
    4: [
      {
        type: "ORDERING",
        question: "Расположите блоки эффективного лендинга в правильном порядке",
        options: [],
        correctAnswer: 0,
        data: {
          items: [
            { id: "s1", text: "Заголовок с УТП" },
            { id: "s2", text: "Преимущества и выгоды" },
            { id: "s3", text: "Социальные доказательства" },
            { id: "s4", text: "Работа с возражениями" },
            { id: "s5", text: "Призыв к действию (CTA)" },
          ],
          correctOrder: ["s1", "s2", "s3", "s4", "s5"],
        },
      },
      {
        type: "SINGLE_CHOICE",
        question: "Что должно быть видно на первом экране лендинга без прокрутки?",
        options: [
          "Только логотип",
          "УТП, заголовок и CTA-кнопка",
          "Полный список всех функций",
          "Только отзывы клиентов"
        ],
        correctAnswer: 1,
        data: null,
      },
      {
        type: "CASE_ANALYSIS",
        question: "Аудит лендинга: найдите проблемы",
        options: [],
        correctAnswer: 0,
        data: {
          caseLabel: "Кейс: Проблемный лендинг",
          caseContent: "Лендинг имеет следующие характеристики:\n- Заголовок: 'Добро пожаловать на наш сайт'\n- 15 полей в форме заказа\n- Нет отзывов и кейсов\n- CTA-кнопка серого цвета с текстом 'Отправить'\n- Скорость загрузки 8 секунд\n\nКакие проблемы критичны?",
          options: [
            { id: "o1", text: "Заголовок не содержит УТП", isCorrect: true, explanation: "Заголовок должен сразу показывать ценность" },
            { id: "o2", text: "Слишком много полей в форме", isCorrect: true, explanation: "Много полей снижает конверсию на 50%+" },
            { id: "o3", text: "Нет социальных доказательств", isCorrect: true, explanation: "Отзывы повышают доверие и конверсию" },
            { id: "o4", text: "Медленная загрузка страницы", isCorrect: true, explanation: "Каждая секунда задержки = -7% конверсии" },
          ],
          minCorrectRequired: 3,
        },
      },
    ],

    // Module 5: Аналитика
    5: [
      {
        type: "MATCHING",
        question: "Сопоставьте инструменты аналитики с их назначением",
        options: [],
        correctAnswer: 0,
        data: {
          leftLabel: "Инструмент",
          rightLabel: "Назначение",
          leftItems: [
            { id: "l1", text: "Google Analytics" },
            { id: "l2", text: "Facebook Pixel" },
            { id: "l3", text: "UTM-метки" },
            { id: "l4", text: "Постбэк" },
          ],
          rightItems: [
            { id: "r1", text: "Анализ поведения на сайте" },
            { id: "r2", text: "Отслеживание конверсий из FB" },
            { id: "r3", text: "Разметка источников трафика" },
            { id: "r4", text: "Передача данных о конверсиях" },
          ],
          correctPairs: { l1: "r1", l2: "r2", l3: "r3", l4: "r4" },
        },
      },
      {
        type: "SINGLE_CHOICE",
        question: "CTR высокий (8%), но CR низкая (0.5%). Где скорее всего проблема?",
        options: [
          "В креативе объявления",
          "На лендинге или в оффере",
          "В настройках таргетинга",
          "В бюджете кампании"
        ],
        correctAnswer: 1,
        data: null,
      },
      {
        type: "ORDERING",
        question: "Расположите параметры UTM-метки в порядке важности",
        options: [],
        correctAnswer: 0,
        data: {
          items: [
            { id: "s1", text: "utm_source (источник)" },
            { id: "s2", text: "utm_medium (тип трафика)" },
            { id: "s3", text: "utm_campaign (кампания)" },
            { id: "s4", text: "utm_content (вариант)" },
            { id: "s5", text: "utm_term (ключевое слово)" },
          ],
          correctOrder: ["s1", "s2", "s3", "s4", "s5"],
        },
      },
    ],

    // Module 6: Оптимизация и тестирование
    6: [
      {
        type: "SINGLE_CHOICE",
        question: "При A/B тесте вариант A показал 5% конверсии (100 из 2000), вариант B - 6% (120 из 2000). Можно ли делать выводы?",
        options: [
          "Да, B однозначно лучше",
          "Нет, нужно больше данных для статистической значимости",
          "Да, A лучше",
          "Тест провален, нужно начать заново"
        ],
        correctAnswer: 1,
        data: null,
      },
      {
        type: "ORDERING",
        question: "Расположите элементы для тестирования по приоритету влияния на конверсию",
        options: [],
        correctAnswer: 0,
        data: {
          items: [
            { id: "s1", text: "Оффер / Цена" },
            { id: "s2", text: "Заголовок" },
            { id: "s3", text: "CTA-кнопка" },
            { id: "s4", text: "Изображения" },
            { id: "s5", text: "Цвет элементов" },
          ],
          correctOrder: ["s1", "s2", "s3", "s4", "s5"],
        },
      },
      {
        type: "CASE_ANALYSIS",
        question: "Оптимизация убыточной кампании",
        options: [],
        correctAnswer: 0,
        data: {
          caseLabel: "Кейс: Спасение кампании",
          caseContent: "Данные за месяц:\n- Бюджет: $5,000\n- Клики: 2,500 (CPC = $2)\n- Конверсии: 25 (CR = 1%)\n- Выручка: $2,500 (чек $100)\n- ROI: -50%\n\nЧто нужно сделать?",
          options: [
            { id: "o1", text: "Увеличить бюджет в 2 раза", isCorrect: false, explanation: "При отрицательном ROI увеличение бюджета увеличит убытки" },
            { id: "o2", text: "Проанализировать и улучшить лендинг", isCorrect: true, explanation: "CR 1% очень низкая, нужно работать над конверсией" },
            { id: "o3", text: "Протестировать новые креативы", isCorrect: true, explanation: "Возможно проблема в привлекаемой аудитории" },
            { id: "o4", text: "Сузить таргетинг на более качественную аудиторию", isCorrect: true, explanation: "Лучше меньше, но качественнее" },
          ],
          minCorrectRequired: 2,
        },
      },
    ],

    // Module 7: Стратегическое мышление
    7: [
      {
        type: "SINGLE_CHOICE",
        question: "LTV клиента = $400, маржинальность 60%. Какой максимальный CPA можно себе позволить при целевом ROI 100%?",
        options: ["$120", "$200", "$240", "$400"],
        correctAnswer: 0,
        data: null,
      },
      {
        type: "MATCHING",
        question: "Сопоставьте метрики с отделами, для которых они важны",
        options: [],
        correctAnswer: 0,
        data: {
          leftLabel: "Метрика",
          rightLabel: "Отдел",
          leftItems: [
            { id: "l1", text: "ROI / ROAS" },
            { id: "l2", text: "Количество лидов" },
            { id: "l3", text: "Стоимость клиента (CAC)" },
            { id: "l4", text: "Узнаваемость бренда" },
          ],
          rightItems: [
            { id: "r1", text: "Финансовый директор" },
            { id: "r2", text: "Отдел продаж" },
            { id: "r3", text: "CEO / Инвесторы" },
            { id: "r4", text: "Бренд-менеджер" },
          ],
          correctPairs: { l1: "r1", l2: "r2", l3: "r3", l4: "r4" },
        },
      },
      {
        type: "CASE_ANALYSIS",
        question: "Планирование квартального бюджета",
        options: [],
        correctAnswer: 0,
        data: {
          caseLabel: "Кейс: Распределение бюджета",
          caseContent: "Квартальный бюджет: $30,000\nЦель: 300 продаж\nТекущий CPA: $150\n\nКаналы:\n- Google Ads: CPA $120, потенциал 150 продаж\n- Facebook: CPA $180, потенциал 200 продаж\n- TikTok: CPA $100, но нестабильно, потенциал 50 продаж\n\nКак распределить бюджет?",
          options: [
            { id: "o1", text: "Всё в Google Ads — самый стабильный CPA", isCorrect: false, explanation: "Потенциал Google всего 150 продаж, не хватит для цели" },
            { id: "o2", text: "Google (60%) + Facebook (30%) + TikTok (10%)", isCorrect: true, explanation: "Диверсификация с приоритетом на эффективные каналы" },
            { id: "o3", text: "Всё в TikTok — самый дешевый CPA", isCorrect: false, explanation: "Нестабильный канал с малым потенциалом" },
            { id: "o4", text: "Начать с теста всех каналов по 33%", isCorrect: true, explanation: "Сначала тест, потом перераспределение по результатам" },
          ],
          minCorrectRequired: 1,
        },
      },
    ],
  }

  return exercises[moduleId] || []
}

// Project modules
function getProjectModules() {
  return [
    {
      slug: "marketing-project-junior",
      title: "Проект Junior: Анализ рекламной кампании",
      description: "Проанализируй существующую рекламную кампанию и предложи улучшения",
      type: "PROJECT" as const,
      level: "Junior",
      points: 200,
      duration: "2-3 часа",
      order: 10,
      content: `# Проект Junior: Анализ рекламной кампании

## Задание

Найди любую рекламную кампанию в интернете (Google, Facebook, Instagram) и проведи её полный анализ.

## Что нужно сделать

### 1. Найти и задокументировать кампанию
- Сделай скриншоты объявлений (минимум 3 разных)
- Запиши на какой лендинг ведет реклама
- Определи целевую аудиторию

### 2. Анализ креативов
- Какие триггеры использованы?
- Какая формула (AIDA, PAS, BAB)?
- Что цепляет, что нет?

### 3. Анализ лендинга
- Оцени по чек-листу (заголовок, УТП, CTA, социальные доказательства)
- Найди минимум 5 проблем
- Предложи решения

### 4. Гипотезы улучшений
- Напиши 3 новых варианта заголовка
- Предложи 2 новых креатива (опиши текст + визуал)
- Как бы ты улучшил воронку?

## Формат сдачи

Google Документ или PDF со всеми скриншотами и анализом.

## Критерии оценки
- Глубина анализа
- Обоснованность выводов
- Качество предложенных улучшений`,
      requirements: `## Требования к проекту

1. Документ 3-5 страниц с анализом
2. Минимум 5 скриншотов
3. Конкретные метрики и цифры (если доступны)
4. Обоснованные рекомендации`,
    },
    {
      slug: "marketing-project-middle",
      title: "Проект Middle: Медиаплан для продукта",
      description: "Создай полный медиаплан для запуска рекламной кампании",
      type: "PROJECT" as const,
      level: "Middle",
      points: 300,
      duration: "4-6 часов",
      order: 11,
      content: `# Проект Middle: Медиаплан для продукта

## Задание

Создай медиаплан для запуска рекламной кампании онлайн-курса по программированию.

## Вводные данные

- **Продукт:** Онлайн-курс "Python с нуля" (цена $200)
- **Бюджет:** $10,000 на месяц
- **Цель:** 100 продаж
- **Целевая аудитория:** 25-40 лет, хотят сменить профессию в IT
- **Гео:** Россия, Украина, Беларусь, Казахстан

## Что нужно сделать

### 1. Анализ аудитории
- Портрет целевой аудитории (3 сегмента)
- Боли и потребности каждого сегмента
- Где искать эту аудиторию

### 2. Стратегия каналов
- Какие каналы использовать и почему
- Распределение бюджета по каналам
- Ожидаемые метрики (CPC, CTR, CR)

### 3. Креативная стратегия
- 5 вариантов заголовков для каждого сегмента
- Описание 3 креативов (текст + визуал)
- Стратегия для холодной/теплой/горячей аудитории

### 4. Воронка и лендинг
- Структура лендинга (все блоки)
- Текст для первого экрана
- Стратегия ретаргетинга

### 5. Юнит-экономика
- Расчет максимального CPA
- Прогноз ROI
- План масштабирования при успехе

## Формат сдачи

Презентация (Google Slides / PDF) + таблица с медиапланом (Google Sheets)`,
      requirements: `## Требования к проекту

1. Презентация 10-15 слайдов
2. Таблица с бюджетом и прогнозом метрик
3. Детальное обоснование каждого решения
4. Реалистичные цифры и расчеты`,
    },
    {
      slug: "marketing-project-senior",
      title: "Проект Senior: Маркетинговая стратегия",
      description: "Разработай полную маркетинговую стратегию для стартапа",
      type: "PROJECT" as const,
      level: "Senior",
      points: 500,
      duration: "8-12 часов",
      order: 12,
      content: `# Проект Senior: Маркетинговая стратегия для стартапа

## Задание

Разработай полную маркетинговую стратегию для запуска нового B2B SaaS продукта.

## Вводные данные

- **Продукт:** CRM-система для малого бизнеса
- **Цена:** $50/месяц (годовая подписка $500)
- **Бюджет на 6 месяцев:** $60,000
- **Цель:** 500 платящих клиентов к концу 6 месяца
- **Конкуренты:** Bitrix24, AmoCRM, Pipedrive
- **Гео:** СНГ

## Что нужно сделать

### 1. Исследование рынка
- Анализ конкурентов (SWOT для каждого)
- Позиционирование продукта
- Уникальное торговое предложение

### 2. Стратегия по этапам (6 месяцев)
- Месяц 1-2: Тестирование каналов
- Месяц 3-4: Масштабирование
- Месяц 5-6: Оптимизация и рост

### 3. Канальная стратегия
- Платные каналы (с бюджетом и KPI)
- Контент-маркетинг (план публикаций)
- Email-маркетинг (воронка писем)
- Партнерства и интеграции

### 4. Креативная платформа
- Ключевые сообщения для каждой аудитории
- Визуальный стиль
- 10 вариантов объявлений

### 5. Аналитика и отчетность
- Какие метрики отслеживать
- Дашборд для руководства
- Триггеры для принятия решений

### 6. Риски и план B
- Что если не работает Google Ads?
- Что если CPA выше плана?
- Антикризисный план

### 7. Юнит-экономика и финансы
- Расчет LTV и CAC
- Прогноз по месяцам
- Точка безубыточности

## Формат сдачи

1. Стратегический документ (Google Docs, 15-25 страниц)
2. Презентация для руководства (10 слайдов)
3. Финансовая модель (Google Sheets)
4. Медиаплан на 6 месяцев`,
      requirements: `## Требования к проекту

1. Полная стратегия со всеми разделами
2. Реалистичные расчеты и прогнозы
3. Конкретный план действий по неделям
4. Финансовая модель в Excel/Sheets
5. Учет рисков и альтернативных сценариев`,
    },
  ]
}

// GET - Check existing Marketing trail
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Только админ" }, { status: 403 })
    }

    const trail = await prisma.trail.findFirst({
      where: {
        OR: [
          { title: { contains: "маркетинг", mode: "insensitive" } },
          { title: { contains: "Marketing", mode: "insensitive" } },
          { slug: { contains: "marketing" } },
        ],
      },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: { questions: true },
        },
      },
    })

    return NextResponse.json({
      found: !!trail,
      trail: trail ? {
        id: trail.id,
        title: trail.title,
        slug: trail.slug,
        modulesCount: trail.modules.length,
        modules: trail.modules.map((m) => ({
          id: m.id,
          title: m.title,
          type: m.type,
          order: m.order,
          questionsCount: m.questions.length,
        })),
      } : null,
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Ошибка" }, { status: 500 })
  }
}

// POST - Create new Marketing trail with all modules and exercises
export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Только админ" }, { status: 403 })
    }

    // Read marketing course data from JSON file
    const jsonPath = path.join(process.cwd(), "marketing-course.json")

    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ error: "Файл marketing-course.json не найден" }, { status: 404 })
    }

    const courseData: MarketingCourse = JSON.parse(fs.readFileSync(jsonPath, "utf-8"))

    // Check if trail already exists
    const existingTrail = await prisma.trail.findFirst({
      where: {
        OR: [
          { slug: "marketing" },
          { title: { contains: "маркетинг", mode: "insensitive" } },
        ],
      },
    })

    if (existingTrail) {
      return NextResponse.json({
        error: "Trail маркетинга уже существует. Сначала удалите его через DELETE.",
        trailId: existingTrail.id
      }, { status: 400 })
    }

    // Create new trail
    const trail = await prisma.trail.create({
      data: {
        slug: "marketing",
        title: "Digital Marketing",
        subtitle: "Маркетинг для фармеров",
        description: courseData.course.description,
        icon: "Target",
        color: "#8B5CF6",
        duration: "8 недель",
        isPublished: true,
      },
    })

    const results: string[] = []
    let totalQuestions = 0

    // Create theory/practice modules from JSON
    for (const mod of courseData.modules) {
      let moduleContent = ""
      if (mod.type === "intro" && mod.content) {
        moduleContent = mod.content
      } else if (mod.theory && mod.practice) {
        moduleContent = `${mod.theory}\n\n---\n\n${mod.practice}`
      }

      let moduleType: "THEORY" | "PRACTICE" | "PROJECT" = "THEORY"
      if (mod.type === "intro") {
        moduleType = "THEORY"
      } else if (mod.practice) {
        moduleType = "PRACTICE"
      }

      const slug = generateSlug(`marketing-${mod.id}`, mod.title)

      const module = await prisma.module.create({
        data: {
          trailId: trail.id,
          slug,
          title: mod.title,
          description: mod.description,
          content: moduleContent,
          type: moduleType,
          level: "Middle",
          points: mod.id === 0 ? 50 : 100,
          duration: mod.id === 0 ? "15 мин" : "2-3 часа",
          order: mod.id,
          requiresSubmission: moduleType === "PRACTICE", // PRACTICE modules require file submission
        },
      })

      // Add exercises for this module
      const exercises = getModuleExercises(mod.id)
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i]
        await prisma.question.create({
          data: {
            moduleId: module.id,
            type: ex.type,
            question: ex.question,
            options: JSON.stringify(ex.options),
            correctAnswer: ex.correctAnswer,
            data: ex.data ? JSON.stringify(ex.data) : null,
            order: i,
          },
        })
        totalQuestions++
      }

      results.push(`✅ Модуль ${mod.id}: ${mod.title} (${exercises.length} заданий)`)
    }

    // Create project modules
    const projects = getProjectModules()
    for (const project of projects) {
      const module = await prisma.module.create({
        data: {
          trailId: trail.id,
          slug: project.slug,
          title: project.title,
          description: project.description,
          content: project.content,
          requirements: project.requirements,
          type: project.type,
          level: project.level,
          points: project.points,
          duration: project.duration,
          order: project.order,
        },
      })

      results.push(`✅ Проект ${project.level}: ${project.title}`)
    }

    return NextResponse.json({
      success: true,
      trailId: trail.id,
      trailSlug: trail.slug,
      modulesCreated: courseData.modules.length + projects.length,
      questionsCreated: totalQuestions,
      results,
    })
  } catch (error) {
    console.error("Error creating marketing trail:", error)
    return NextResponse.json({
      error: "Ошибка создания trail",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// DELETE - Remove Marketing trail
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Только админ" }, { status: 403 })
    }

    const trail = await prisma.trail.findFirst({
      where: {
        OR: [
          { slug: "marketing" },
          { title: { contains: "маркетинг", mode: "insensitive" } },
          { title: { contains: "Marketing", mode: "insensitive" } },
        ],
      },
    })

    if (!trail) {
      return NextResponse.json({ error: "Trail не найден" }, { status: 404 })
    }

    // Delete all related data
    await prisma.question.deleteMany({
      where: { module: { trailId: trail.id } },
    })
    await prisma.moduleProgress.deleteMany({
      where: { module: { trailId: trail.id } },
    })
    await prisma.submission.deleteMany({
      where: { module: { trailId: trail.id } },
    })
    await prisma.module.deleteMany({
      where: { trailId: trail.id },
    })
    await prisma.enrollment.deleteMany({
      where: { trailId: trail.id },
    })
    await prisma.trailTeacher.deleteMany({
      where: { trailId: trail.id },
    })
    await prisma.taskProgress.deleteMany({
      where: { trailId: trail.id },
    })
    await prisma.trail.delete({
      where: { id: trail.id },
    })

    return NextResponse.json({ success: true, deleted: trail.title })
  } catch (error) {
    console.error("Error deleting marketing trail:", error)
    return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 })
  }
}
