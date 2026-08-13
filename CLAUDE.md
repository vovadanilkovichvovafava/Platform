# CLAUDE.md

Контекст проекта для Claude Code. Обновлять при изменении архитектуры.

## Что это

**R&D Academy** — LMS-платформа Промсвязьбанка для обучения и оценки стажёров.
Студенты проходят trails (курсы) из модулей, отвечают на вопросы, сдают проектные
работы; преподаватели проверяют работы; HR смотрит аналитику по кандидатам.

Стек: **Next.js 16 (App Router) · React 19 · TypeScript · Prisma 5 · PostgreSQL ·
NextAuth (JWT, credentials) · Tailwind 4 · shadcn/Radix · Vitest**

## Команды

```bash
npm run dev            # разработка
npm run build          # prisma generate + next build
npm start              # прод-запуск (миграции + сид + сервер)
npm test               # vitest run
npm run lint
npm run db:push        # синк схемы без миграции
npm run db:seed        # заполнение демо-данными
```

## Язык

**Весь UI, сообщения об ошибках и коммиты — на русском.** Код, типы, имена
переменных и большинство комментариев — на английском. Это установившаяся
конвенция, не отступать от неё.

## Роли

Поле `User.role` — обычная строка (не enum): `STUDENT`, `TEACHER`, `HR`,
`CO_ADMIN`, `ADMIN`.

Хелперы в `src/lib/admin-access.ts`:
- `isAdmin` — только `ADMIN`
- `isAnyAdmin` — `ADMIN` + `CO_ADMIN` (HR исключён — это доступ на запись)
- `isHR` — только `HR` (read-only аналитика кандидатов + инвайты)
- `isPrivileged` — `TEACHER` + `CO_ADMIN` + `ADMIN` (контент и проверка работ)

Защита маршрутов — `src/middleware.ts`:
- `/teacher/*` → TEACHER, CO_ADMIN, ADMIN, HR (HR только чтение)
- `/admin/*` → CO_ADMIN, ADMIN, HR; HR заблокирован на `/admin/users`,
  `/admin/access`, `/admin/content`, `/admin/history`
- `/content*` → TEACHER, CO_ADMIN, ADMIN (без HR)
- Публичные: `/`, `/login`, `/register`, `/trails*`, `/api/auth*`,
  `/api/telegram*` (свой секрет в заголовке), `/api/external*` (Bearer-токен)
- `/leaderboard` отключён фича-флагом (отдаёт 404)

Поверх ролей — доступ к конкретным trail: `AdminTrailAccess` (CO_ADMIN),
`TrailTeacher`/`teacherVisibility` (TEACHER), `StudentTrailAccess` (STUDENT),
плюс парольная защита trail.

## Структура

```
src/app/          страницы (App Router) + /api роуты
src/components/   UI-компоненты (ui/ — shadcn-примитивы)
src/lib/          бизнес-логика (см. ниже)
src/__tests__/    тесты Vitest
prisma/           schema.prisma, migrations/, seed.ts
scripts/          start.js (прод-запуск), docker-entrypoint.sh
```

### Ключевые модули `src/lib/`

| Модуль | Назначение |
|---|---|
| `auth.ts` | NextAuth credentials + JWT; роль ре-синкается из БД на каждом запросе, удалённый пользователь инвалидируется |
| `admin-access.ts` | хелперы проверки ролей |
| `trail-access.ts` | **единый источник истины** по видимости trail (пароль > публичный > скрытый) |
| `trail-password.ts` | пароли trail (bcrypt), rate-limit, аудит попыток |
| `trail-policy.ts` | доступ админов/со-админов к trail, TTL парольного доступа 4 часа |
| `achievements.ts` | статический каталог ~65 бейджей |
| `check-achievements.ts` | подсчёт условий и выдача `UserAchievement` |
| `achievement-service.ts` | `processAchievementEvent` — точка входа по событиям |
| `levels.ts` | 8 уровней + 5 рангов, XP за модули (THEORY 50 / PRACTICE 75 / PROJECT 100) |
| `activity.ts` | `recordActivity` — дневная активность и пересчёт `currentStreak` |
| `import/` | импорт курсов из txt/md/json/xml/html/docx/doc + AI-фолбэк |
| `ai-submission-review/` | автоанализ работ через Claude API |
| `google-docs-scanner/` | разбор Google-Docs ссылок в работах (публичные эндпоинты, без ключа) |
| `telegram.ts` | уведомления преподавателям, deep-link привязки, проверка вебхука |
| `feature-flags.ts` | флаги **захардкожены в файле**, не в env |
| `external-auth.ts` | Bearer-авторизация для `/api/external/*` (HR-интеграция) |
| `api-response.ts` | единый формат ответов и `handleApiError` |

## Конвенции API

Успех: `{ data, message? }` через `successResponse()`.
Ошибка: `{ error, type, details? }` через `errorResponse()`, тип из
`VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | RATE_LIMITED |
CONFLICT | INTERNAL_ERROR`.

`handleApiError()` в catch-блоках: Zod → 400, Prisma `P2002` → 409,
`P2025` → 404, иначе 500 с обезличенным сообщением.

Тело запроса валидируется Zod в начале хендлера. Логи — с префиксом
(`[Telegram]`, `[AI-SubmissionReview]`), **секреты не логируются**.

Гварды: `getServerSession(authOptions)` → проверка роли хелперами → при
необходимости `guardTrailPassword` / `canViewTrail`. В серверных компонентах —
`redirect()` / `notFound()`.

## Модель данных (основное)

`User` — центральная сущность (XP, streak, Telegram, роль).
`Trail` → `Module` → `Unit` / `Question` / `ModuleContentBlock`.
Прогресс: `Enrollment`, `ModuleProgress`, `UnitProgress`, `TaskProgress`
(уровни Junior/Middle/Senior на trail).
Работы: `Submission` → `Review` (проверка преподавателем), `AiSubmissionReview`,
`GoogleDocsScan` — все 1:1.
Прочее: `Certificate`, `UserAchievement`, `Notification`, `Invite` (+`InviteTrail`,
`InviteTag`), `StudentTrailStatus` (статус кандидата, **студенту не виден**),
`UserActivity`, `AuditLog`, `TrailFolder`, `NavbarPreset`.

## Деплой

Сейчас: Railway + Supabase. Готовится перенос на внутреннюю платформу
**Сатурн** — подробный runbook в **`SATURN_MIGRATION.md`**.

Собран `Dockerfile` (standalone-сборка), `docker-compose.yml` (app + PostgreSQL
без внешних сервисов), health-эндпоинт `/api/health`.

### Про что легко забыть

- **Загруженные медиафайлы лежат на локальном диске** (`public/uploads/media/`).
  Без persistent volume теряются при рестарте.
- **`scripts/start.js` по умолчанию делает `prisma db push --accept-data-loss`.**
  Управляется `DB_MIGRATE_MODE`; на бою должно быть `deploy`.
- **Автосид срабатывает на пустой БД** — восстанавливать дамп до первого старта.
- Внешние хосты (Anthropic, Telegram, Google Docs, Unsplash, Iconify) в закрытом
  контуре недоступны — соответствующие функции отключаются.

## Известные проблемы

- `src/__tests__/rate-limit.test.ts` ожидает `submissions.maxRequests: 10`,
  в коде `50` — тест падает на `main`.
