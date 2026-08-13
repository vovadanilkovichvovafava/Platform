# Перенос R&D Academy на Сатурн

Runbook для миграции с Railway + Supabase на внутреннюю платформу.

Текущий прод: `platform-production-1cf6.up.railway.app`, БД — Supabase (внешний SaaS).

---

## 1. Что должна предоставить платформа

| Ресурс | Требование | Почему |
|---|---|---|
| Контейнер | Node.js 20+, порт из `PORT` (по умолчанию 3000) | образ собирается из `Dockerfile` |
| PostgreSQL | 14+, внутри периметра | сейчас Supabase — **обязательно заменить** |
| Persistent volume | смонтировать в `/app/public/uploads` | **иначе загруженные медиафайлы теряются при каждом рестарте** |
| Health-пробы | `GET /api/health` (liveness), `GET /api/health?db=1` (readiness) | добавлены в этой ветке |
| TLS / домен | внутренний домен → `NEXTAUTH_URL` | иначе сломается авторизация |

### Локальная проверка перед переносом

```bash
cp .env.example .env          # заполнить NEXTAUTH_SECRET
docker compose up --build     # поднимет app + PostgreSQL, без внешних сервисов
curl localhost:3000/api/health?db=1
```

---

## 2. Переменные окружения

Полный список с описаниями — в `.env.example`.

**Обязательные:** `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. `DB_MIGRATE_MODE` оставить `push` (см. 4.3).

> `NEXTAUTH_SECRET` — сгенерировать заново для Сатурна (`openssl rand -base64 32`).
> При смене секрета все текущие сессии инвалидируются — пользователи войдут повторно.

---

## 3. Внешние зависимости — что открывать или отключать

Платформа обращается наружу. В закрытом контуре каждый пункт нужно либо
разрешить на файрволе, либо отключить.

| Хост | Для чего | Если недоступен |
|---|---|---|
| `api.anthropic.com` | AI-импорт контента, AI-анализ работ | `AI_PARSER_ENABLED=false`, `AI_SUBMISSION_REVIEW_ENABLED=false` |
| `api.telegram.org` | уведомления преподавателям | не задавать `TELEGRAM_BOT_TOKEN` |
| `docs.google.com`, `drive.google.com` | сканер Google Docs в работах студентов | `GOOGLE_DOCS_SCAN_ENABLED` в `src/lib/feature-flags.ts` |
| `images.unsplash.com` | обложки (CSP `img-src`, `next.config.ts`) | картинки не загрузятся, вёрстка цела |
| `api.iconify.design` | иконки (CSP `connect-src`) | часть иконок не отрисуется |
| `youtube.com`, `player.vimeo.com` | встроенное видео (CSP `frame-src`) | видеоблоки не проиграются |

**Telegram отдельно:** боту нужен не только исходящий доступ, но и **публично
доступный входящий URL** для вебхука (`/api/telegram/webhook`). Во внутреннем
контуре это обычно невозможно — планируйте функцию как отключённую.

**Фича-флаги** заданы константами в `src/lib/feature-flags.ts` (не через env):
`LEADERBOARD_ENABLED=false`, `GOOGLE_DOCS_SCAN_ENABLED=true`,
`AI_SUBMISSION_REVIEW_ENABLED` — из env. Правится редактированием файла.

---

## 4. Перенос базы данных

### 4.1 Снять дамп с Supabase

```bash
pg_dump "$SUPABASE_DIRECT_URL" --no-owner --no-privileges -Fc -f academy.dump
```

### 4.2 Восстановить на Сатурне

```bash
createdb rnd_academy
pg_restore --no-owner --no-privileges -d "$SATURN_DATABASE_URL" academy.dump
```

### 4.3 ⚠️ В миграциях нет baseline — `migrate deploy` не поднимет базу с нуля

**Это главная особенность проекта, о которую разбивается «правильный» деплой.**

Схема всегда создавалась через `prisma db push`, а 17 миграций в репозитории
добавляют только инкрементальные изменения. Ни одна из них не создаёт базовые
таблицы — проверяется одной командой:

```bash
grep -rl 'CREATE TABLE "User"' prisma/migrations/   # пусто
```

Поэтому на пустой базе `migrate deploy` доходит до второй миграции
(`20260130_add_admin_trail_access`), падает на внешнем ключе к несуществующей
таблице `User`, записывает провал в `_prisma_migrations` — и все последующие
запуски отбиваются ошибкой **P3009**, даже после исправления причины.

**Как поднимать базу сейчас:** режимом `push` (значение по умолчанию) —
`schema.prisma` описывает схему целиком и создаёт её корректно.

**Если база уже застряла в P3009**, снять отметку о провале:

```bash
npx prisma migrate resolve --rolled-back 20260130_add_admin_trail_access
```

либо, если данных ещё нет, просто пересоздать базу и дать `push` отработать
с чистого листа.

**Чтобы в будущем перейти на `deploy`**, нужен baseline — сгенерировать
init-миграцию из текущей схемы и пометить все существующие применёнными:

```bash
mkdir -p prisma/migrations/00000000000000_init
npx prisma migrate diff --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/00000000000000_init/migration.sql

for m in $(ls prisma/migrations); do
  npx prisma migrate resolve --applied "$m"
done
```

Проверить, что схема и `schema.prisma` сошлись:

```bash
npx prisma migrate diff \
  --from-url "$SATURN_DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --exit-code        # код 0 = расхождений нет
```

### 4.4 Про режимы миграций

Режим задаётся `DB_MIGRATE_MODE` и по умолчанию — `push` (см. 4.3, почему
`deploy` пока неприменим).

Разница между двумя точками входа:

| | контейнер (`docker-entrypoint.sh`) | Railway (`scripts/start.js`) |
|---|---|---|
| режим по умолчанию | `push` | `push` |
| флаг `--accept-data-loss` | **нет** — разрушающее изменение падает | **да** (унаследовано) |

`--accept-data-loss` может **молча удалить колонки и таблицы**. В контейнере он
намеренно не используется; на Railway сохранён, чтобы не менять поведение
работающего прода, и отключается через `DB_ACCEPT_DATA_LOSS=false`.

---

## 5. Перенос загруженных файлов

Медиа сохраняется на локальный диск в `public/uploads/media/`
(`src/app/api/admin/upload/media/route.ts`), раздаётся через `/api/media/*`.

1. Забрать текущие файлы с Railway-тома.
2. Скопировать в persistent volume Сатурна, смонтированный в `/app/public/uploads`.
3. Проверить владельца: контейнер работает под uid **1001**.

Без persistent volume файлы исчезают при каждом рестарте пода.

---

## 6. Чек-лист переключения

- [ ] Образ собирается: `docker build -t rnd-academy .`
- [ ] `docker compose up` поднимается локально, `/api/health?db=1` → 200
- [ ] Внутренний PostgreSQL создан, дамп восстановлен
- [ ] Учтено отсутствие baseline в миграциях (4.3)
- [ ] Persistent volume смонтирован в `/app/public/uploads`, файлы скопированы
- [ ] Все обязательные env заданы; `NEXTAUTH_URL` = реальный домен
- [ ] `DB_MIGRATE_MODE=push` (не `deploy`, см. 4.3), `FORCE_SEED=false`, `ALLOW_SEED_ON_ERROR=false`
- [ ] Решено по каждой внешней интеграции: открыть хост или отключить
- [ ] Health-пробы настроены в манифесте
- [ ] Проверено вживую: вход, прохождение модуля, отправка работы, проверка преподавателем, выдача сертификата, загрузка медиа
- [ ] Снят финальный дамп со старого прода как точка отката

## 7. Откат

Приложение stateless — откат сводится к переключению трафика обратно на Railway,
пока старая БД жива. Поэтому **не удаляйте Supabase-базу** до истечения
периода наблюдения.

---

## 8. Известные проблемы (на момент подготовки)

1. **В миграциях нет baseline** — `migrate deploy` не поднимает базу с нуля и
   оставляет её в P3009. Подробно в 4.3; до появления init-миграции рабочий
   режим — `push`.
2. **`--accept-data-loss` на Railway** — унаследовано из `scripts/start.js`,
   может молча удалить колонки. В контейнере флаг не используется.
3. **Автосид при пустой БД** — `scripts/start.js` засеет демо-данные, если в
   базе 0 trails/questions/invites. Восстанавливайте дамп **до** первого старта.
4. **Загрузки на локальном диске** — без тома теряются; долгосрочно стоит
   вынести в S3-совместимое хранилище.
5. **Красный тест на main** — `src/__tests__/rate-limit.test.ts` ожидает
   `submissions.maxRequests: 10`, а в `src/lib/rate-limit.ts` стоит `50`.
   Расхождение существует в `main` и требует решения: поправить тест или лимит.
