# Анализ функциональности импорта контента

## 1. Почему была убрана старая информация о парсинге (советы о формате)

### Что было удалено:

В коммите `a191b0d` (feat: Улучшенный UX импорта с превью и двухэтапным процессом) были удалены следующие элементы:

1. **Кнопки выбора формата файла** (txt, md, json, xml)
2. **Примеры форматов** (`sampleFormats` объект с шаблонами для каждого формата)
3. **Кнопка "Скачать пример"** (`downloadSample()` функция)
4. **Иконки форматов** (`formatIcons` маппинг)
5. **Блок отображения примера формата**

### Причины удаления:

| До | После |
|-----|-------|
| Пользователь выбирал формат вручную | Система автоматически определяет формат |
| Нужно было изучать примеры форматов | Загружай любой файл - система разберётся |
| Много кликов для импорта | Двухэтапный процесс: загрузка → превью → сохранение |
| Ручной выбор = ошибки | Умный детектор (`smart-detector.ts`) анализирует структуру |

### Технические причины:

1. **SmartDetector** (`/src/lib/import/smart-detector.ts`) теперь автоматически определяет:
   - Формат файла по расширению и содержимому
   - Структуру контента (заголовки, маркеры)
   - Уровень вложенности (trails → modules → questions)

2. **AI-парсер** может обработать даже свободный текст без форматирования

3. **Двухэтапный процесс** даёт пользователю возможность проверить результат ПЕРЕД сохранением

---

## 2. Работает ли проверка доступности AI по кнопке "Проверить"

### Да, кнопка "Проверить" работает корректно!

**Расположение в UI:** `/src/app/admin/content/page.tsx` (строки 1167-1176)

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={checkAIStatus}
  className="text-purple-600 hover:text-purple-700"
>
  <Zap className="h-4 w-4 mr-1" />
  Проверить
</Button>
```

### Как работает:

1. **Клиентская часть** (`checkAIStatus` функция, строки 379-396):
   ```typescript
   const checkAIStatus = async () => {
     setAiStatus({ available: false, checking: true })
     try {
       const res = await fetch("/api/admin/import?action=check-ai")
       const data = await res.json()
       setAiStatus({
         available: data.available,
         error: data.error,
         checking: false,
       })
     } catch {
       setAiStatus({
         available: false,
         error: "Ошибка проверки AI",
         checking: false,
       })
     }
   }
   ```

2. **Серверная часть** (`/src/app/api/admin/import/route.ts`, строки 114-146):
   - GET запрос с `?action=check-ai`
   - Вызывает `checkAIAvailability(config)` из ai-parser.ts

3. **Функция проверки** (`/src/lib/import/parsers/ai-parser.ts`, строки 65-108):
   - Проверяет наличие настроек (enabled, apiEndpoint, apiKey)
   - Отправляет тестовый запрос к AI API
   - Возвращает `{ available: boolean, error?: string, model?: string }`

### Визуальное отображение:

| Состояние | Отображение |
|-----------|-------------|
| Проверка... | "Проверка..." (текст) |
| Доступен | ✓ Зелёная галочка + "Доступен" |
| Недоступен | Кнопка "Проверить" (фиолетовая) |

---

## 3. Уведомления об ошибках в форме импорта

### Где находятся уведомления:

**Файл:** `/src/app/admin/content/page.tsx`

### Типы уведомлений:

#### 1. Ошибка парсинга (красный блок) - строки 1092-1118:
```tsx
{parseError && (
  <div className="p-4 rounded-lg mb-4 bg-red-50 border border-red-200">
    <div className="flex items-start gap-2">
      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
      <div className="flex-1">
        <span className="text-red-700">{parseError}</span>
        {/* Кнопка "Попробовать с AI" если AI доступен */}
      </div>
    </div>
  </div>
)}
```

#### 2. Успешный парсинг (зелёный блок) - строки 1185-1198:
```tsx
<div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
  <CheckCircle className="h-5 w-5 text-green-600" />
  <span className="text-green-700 font-medium">Контент успешно распознан</span>
  <span className="text-green-600 text-sm">
    ({parseMethod === "ai" ? "AI" : parseMethod === "hybrid" ? "Гибридный" : "Авто"})
  </span>
  <span className="text-sm text-green-600">
    Уверенность: {structureConfidence}%
  </span>
</div>
```

#### 3. Предупреждения (жёлтый блок) - строки 1201-1213:
```tsx
{parsedData.warnings && parsedData.warnings.length > 0 && (
  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
    <div className="flex items-center gap-2 text-yellow-700 font-medium mb-2">
      <AlertTriangle className="h-4 w-4" />
      Предупреждения
    </div>
    <ul className="text-sm text-yellow-600 space-y-1">
      {parsedData.warnings.slice(0, 5).map((w, i) => (
        <li key={i}>• {w}</li>
      ))}
    </ul>
  </div>
)}
```

#### 4. Toast-уведомления (всплывающие):
```typescript
showToast("Контент успешно добавлен", "success")  // Зелёный
showToast("Ошибка сохранения", "error")           // Красный
showToast("Ошибка проверки AI", "warning")        // Жёлтый
```

---

## 4. Кнопка "Перегенерировать"

### Да, кнопка "Перегенерировать" существует!

**Расположение:** `/src/app/admin/content/page.tsx`

### Два места появления:

#### 1. В ошибке парсинга (строки 1098-1114):
Появляется если:
- `parseError` - есть ошибка
- `uploadedFile` - файл загружен
- `aiStatus.available` - AI доступен

```tsx
{uploadedFile && aiStatus.available && (
  <Button onClick={handleRegenerate}>
    <Sparkles className="h-4 w-4 mr-2" />
    Попробовать с AI
  </Button>
)}
```

#### 2. В панели действий (строки 1286-1300):
Появляется когда данные уже распарсены и AI доступен:

```tsx
{aiStatus.available && (
  <Button
    variant="outline"
    onClick={handleRegenerate}
    disabled={regenerating || saving}
    className="text-purple-700 border-purple-300 hover:bg-purple-50"
  >
    {regenerating ? (
      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
    ) : (
      <Sparkles className="h-4 w-4 mr-2" />
    )}
    Перегенерировать
  </Button>
)}
```

### Как работает функция `handleRegenerate` (строки 331-369):

```typescript
const handleRegenerate = async () => {
  const formData = new FormData()
  formData.append("file", uploadedFile)
  formData.append("useAI", "true")
  formData.append("forceAI", "true") // ПРИНУДИТЕЛЬНО использует AI парсер

  const res = await fetch("/api/admin/import", {
    method: "POST",
    body: formData,
  })
  // Обновляет parsedData с новыми результатами
}
```

### Важно: флаг `forceAI`

- При перегенерации отправляется `forceAI: true`
- Это заставляет сервер использовать **только AI парсер** (через `hybridImport`)
- Игнорируются обычные парсеры (txt, md, json, xml)

---

## Промпт для AI парсинга

**Файл:** `/src/lib/import/parsers/ai-parser.ts`

### Системный промпт (строки 10-48):

```
Ты - AI-ассистент для парсинга образовательного контента.
Твоя задача - преобразовать текст в структурированный формат курса.

Правила:
1. Определи структуру: заголовки -> trail, подзаголовки -> module
2. Если есть вопросы с вариантами ответов - это PRACTICE
3. Если есть задание на создание чего-то - это PROJECT
4. Остальное - THEORY
5. Slug генерируй из названия (транслитерация, lowercase, дефисы)
6. Выбери подходящий emoji для icon
7. Выбери подходящий цвет (#hex)
8. points: THEORY=50, PRACTICE=75, PROJECT=100
9. Сохрани весь контент в формате Markdown
10. Верни ТОЛЬКО валидный JSON без комментариев
```

### Пользовательский промпт:
```
Преобразуй следующий текст в структурированный курс:
---
{content}
---
Верни JSON согласно формату.
```

---

## Итоговая схема работы импорта

```
Пользователь загружает файл
        ↓
[smartImport] - автоопределение формата
        ↓
    ┌───────────────────────────┐
    │ Успех? Нет → parseError   │
    │        → Показать кнопку  │
    │          "Попробовать AI" │
    └───────────────────────────┘
        ↓ Да
[Превью данных]
        ↓
Кнопка "Перегенерировать" (если AI доступен)
        ↓
    forceAI=true → [hybridImport] → AI парсер
        ↓
Кнопка "Добавить" → Сохранение в БД
```

---

## 5. СООТВЕТСТВИЕ ТЗ

### Техническое задание:

> "Кто-то добавляет файл, этот файл отсматривается и генерируется трейл или модуль.
> После сразу же в этом окне появляется этот сгенерированный трейл или модуль который можно посмотреть и оценить норм или не норм.
> Если норм то добавляем, если не норм то перегенерируем.
> Сам формат человек не должен видеть, ему это не нужно знать."

### Чек-лист соответствия:

| Требование | Статус | Реализация |
|------------|--------|------------|
| Добавление файла | ✅ **Сделано** | `<input type="file">` в модалке импорта (строка 1144) |
| Файл отсматривается и парсится | ✅ **Сделано** | `handleImport()` → API `/api/admin/import` → `smartImport()` |
| Генерируется trail/module | ✅ **Сделано** | Парсеры создают структуру `ParsedTrail[]` с `modules[]` |
| Сразу появляется превью | ✅ **Сделано** | Блок `{parsedData && ...}` (строки 1182-1272) |
| Можно оценить норм/не норм | ✅ **Сделано** | Превью показывает trails, modules, вопросы |
| Если норм → добавляем | ✅ **Сделано** | Кнопка "Добавить" → `handleSaveImport()` |
| Если не норм → перегенерируем | ⚠️ **Частично** | Кнопка "Перегенерировать" есть, но требует проверки AI |
| Формат скрыт от пользователя | ✅ **Сделано** | Удалены примеры форматов, выбор формата, подсказки |

---

## 6. НАЙДЕННЫЕ ПРОБЛЕМЫ

### Проблема #1: AI статус не проверяется автоматически

**Описание:** Кнопка "Перегенерировать" появляется ТОЛЬКО если `aiStatus.available === true`.
Но `checkAIStatus()` вызывается ТОЛЬКО при клике на кнопку "Проверить".

**Результат:** При открытии модалки импорта пользователь НЕ видит кнопку "Перегенерировать", пока не нажмёт "Проверить".

**Файл:** `/src/app/admin/content/page.tsx`

**Где проблема:**
```tsx
// Строка 1286-1300 - кнопка появляется только если aiStatus.available
{aiStatus.available && (
  <Button onClick={handleRegenerate}>
    Перегенерировать
  </Button>
)}
```

**Решение:** Добавить автоматическую проверку AI при открытии модалки:
```tsx
useEffect(() => {
  if (showImportModal) {
    checkAIStatus()  // Автопроверка при открытии
  }
}, [showImportModal])
```

---

### Проблема #2: Первый парсинг НЕ использует AI напрямую

**Описание:** При загрузке файла отправляется `useAI: "true"`, но НЕ `forceAI`.
Это значит `smartImport()` сначала пробует обычные парсеры (txt, md, json, xml).
AI используется только как fallback или при явной перегенерации.

**Файл:** `/src/app/admin/content/page.tsx`, строки 266-273

**Где проблема:**
```tsx
const formData = new FormData()
formData.append("file", file)
formData.append("useAI", "true")  // НЕ forceAI!
```

**Вопрос:** Это корректное поведение по ТЗ?
- Если ТЗ требует "файл ВСЕГДА отправлять в нейронку" → нужно добавить `forceAI: true`
- Если сначала пробуем обычный парсинг → текущая реализация ОК

---

### Проблема #3: Нет уведомления об ошибке AI в UI

**Описание:** Если `checkAIAvailability()` возвращает ошибку, она сохраняется в `aiStatus.error`, но НЕ отображается пользователю явно.

**Файл:** `/src/app/admin/content/page.tsx`

**Где проблема:**
```tsx
// aiStatus.error существует, но не показывается в UI
const [aiStatus, setAiStatus] = useState<{
  available: boolean
  error?: string  // ← Эта ошибка не отображается!
  checking: boolean
}>({ ... })
```

**Решение:** Добавить отображение ошибки AI:
```tsx
{aiStatus.error && (
  <div className="text-xs text-red-500 mt-1">
    {aiStatus.error}
  </div>
)}
```

---

## 7. НАСТРОЙКИ ДЛЯ РАБОТЫ С OpenAI API

### Необходимые переменные окружения:

**Файл:** `.env` (на основе `.env.example`)

```bash
# Включить AI парсер
AI_PARSER_ENABLED="true"

# API ключ OpenAI
AI_API_KEY="sk-proj-..."

# Endpoint API
AI_API_ENDPOINT="https://api.openai.com/v1/chat/completions"

# Модель
AI_MODEL="gpt-4o-mini"
```

### Чек-лист готовности к работе с OpenAI:

| Условие | Статус | Где проверить |
|---------|--------|---------------|
| `AI_PARSER_ENABLED="true"` | ⚠️ Проверить `.env` | Должно быть `"true"` |
| `AI_API_KEY` задан | ⚠️ Проверить `.env` | Должен быть валидный ключ |
| `AI_API_ENDPOINT` задан | ✅ По умолчанию OpenAI | `https://api.openai.com/v1/chat/completions` |
| `AI_MODEL` задан | ✅ По умолчанию `gpt-3.5-turbo` | Рекомендуется `gpt-4o-mini` |
| Функция `getAIConfig()` | ✅ Реализована | `/src/lib/import/parsers/ai-parser.ts:301-308` |
| Функция `checkAIAvailability()` | ✅ Реализована | `/src/lib/import/parsers/ai-parser.ts:65-108` |
| Функция `parseWithAI()` | ✅ Реализована | `/src/lib/import/parsers/ai-parser.ts:111-179` |
| Промпт для парсинга | ✅ Есть | `/src/lib/import/parsers/ai-parser.ts:10-56` |

### Как проверить работоспособность:

1. Убедиться что в `.env` все переменные заданы
2. Открыть админку → Контент → Импорт
3. Нажать кнопку "Проверить" рядом с "AI-парсер"
4. Должно появиться: ✓ "Доступен"

---

## 8. РЕЗЮМЕ

### Что сделано правильно:
1. ✅ Flow загрузки файла → превью → сохранение
2. ✅ Кнопка "Перегенерировать" с `forceAI`
3. ✅ Скрыты форматы от пользователя
4. ✅ Промпт для AI парсинга
5. ✅ Валидация результатов AI
6. ✅ Уведомления об успехе/ошибках

### Что нужно доработать:
1. ⚠️ Автопроверка AI при открытии модалки
2. ⚠️ Отображение ошибок AI в UI
3. ❓ Решить: первый парсинг через AI или обычный?
