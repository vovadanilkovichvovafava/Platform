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
