"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Trash2,
  Check,
  GripVertical,
  Link2,
  ListOrdered,
  Search,
  CircleDot,
} from "lucide-react"
import type {
  QuestionType,
  QuestionEditorState,
  MatchingData,
  OrderingData,
  CaseAnalysisData,
  QuestionData,
} from "@/types/content"

interface QuestionEditorProps {
  question: QuestionEditorState
  index: number
  onUpdate: (index: number, field: string, value: unknown) => void
  onUpdateData: (index: number, newData: Partial<MatchingData | OrderingData | CaseAnalysisData>) => void
  onUpdateOption: (qIndex: number, oIndex: number, value: string) => void
  onDelete: (index: number) => void
}

const questionTypeLabels: Record<QuestionType, { label: string; icon: typeof CircleDot }> = {
  SINGLE_CHOICE: { label: "Один правильный ответ", icon: CircleDot },
  MATCHING: { label: "Сопоставление", icon: Link2 },
  ORDERING: { label: "Порядок действий", icon: ListOrdered },
  CASE_ANALYSIS: { label: "Анализ кейса", icon: Search },
}

export function QuestionEditor({
  question: q,
  index: qIndex,
  onUpdate,
  onUpdateData,
  onUpdateOption,
  onDelete,
}: QuestionEditorProps) {
  const TypeIcon = questionTypeLabels[q.type].icon

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-start gap-2">
        <GripVertical className="h-5 w-5 text-gray-400 mt-2 shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Вопрос {qIndex + 1}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <TypeIcon className="h-3 w-3" />
                {questionTypeLabels[q.type].label}
              </span>
            </div>
            {q.isNew && (
              <Badge variant="secondary" className="text-xs">
                Новый
              </Badge>
            )}
          </div>
          <textarea
            value={q.question}
            onChange={(e) => onUpdate(qIndex, "question", e.target.value)}
            className="w-full p-2 text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Текст вопроса..."
          />
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-red-500 hover:text-red-700 shrink-0"
          onClick={() => onDelete(qIndex)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* SINGLE_CHOICE Editor */}
      {q.type === "SINGLE_CHOICE" && (
        <SingleChoiceEditor
          options={q.options}
          correctAnswer={q.correctAnswer}
          qIndex={qIndex}
          onUpdate={onUpdate}
          onUpdateOption={onUpdateOption}
        />
      )}

      {/* MATCHING Editor */}
      {q.type === "MATCHING" && q.data && "leftItems" in q.data && (
        <MatchingEditor
          data={q.data as MatchingData}
          qIndex={qIndex}
          onUpdateData={onUpdateData}
        />
      )}

      {/* ORDERING Editor */}
      {q.type === "ORDERING" && q.data && "correctOrder" in q.data && (
        <OrderingEditor
          data={q.data as OrderingData}
          qIndex={qIndex}
          onUpdateData={onUpdateData}
        />
      )}

      {/* CASE_ANALYSIS Editor */}
      {q.type === "CASE_ANALYSIS" && q.data && "caseContent" in q.data && (
        <CaseAnalysisEditor
          data={q.data as CaseAnalysisData}
          qIndex={qIndex}
          onUpdateData={onUpdateData}
        />
      )}
    </div>
  )
}

// Sub-components for different question types

function SingleChoiceEditor({
  options,
  correctAnswer,
  qIndex,
  onUpdate,
  onUpdateOption,
}: {
  options: string[]
  correctAnswer: number
  qIndex: number
  onUpdate: (index: number, field: string, value: unknown) => void
  onUpdateOption: (qIndex: number, oIndex: number, value: string) => void
}) {
  return (
    <div className="ml-7 space-y-2">
      {options.map((opt, oIndex) => (
        <div key={oIndex} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onUpdate(qIndex, "correctAnswer", oIndex)}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
              correctAnswer === oIndex
                ? "border-green-500 bg-green-500 text-white"
                : "border-gray-300"
            }`}
          >
            {correctAnswer === oIndex && <Check className="h-3 w-3" />}
          </button>
          <Input
            value={opt}
            onChange={(e) => onUpdateOption(qIndex, oIndex, e.target.value)}
            placeholder={`Вариант ${String.fromCharCode(65 + oIndex)}`}
            className="text-sm"
          />
        </div>
      ))}
      <p className="text-xs text-gray-500">
        Нажмите на кружок чтобы отметить правильный ответ
      </p>
    </div>
  )
}

function MatchingEditor({
  data,
  qIndex,
  onUpdateData,
}: {
  data: MatchingData
  qIndex: number
  onUpdateData: (index: number, newData: Partial<QuestionData>) => void
}) {
  return (
    <div className="ml-7 space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            value={data.leftLabel}
            onChange={(e) => onUpdateData(qIndex, { leftLabel: e.target.value })}
            placeholder="Заголовок левой колонки"
            className="text-sm mb-2"
          />
          {data.leftItems.map((item, idx) => (
            <Input
              key={item.id}
              value={item.text}
              onChange={(e) => {
                const newItems = [...data.leftItems]
                newItems[idx] = { ...newItems[idx], text: e.target.value }
                onUpdateData(qIndex, { leftItems: newItems })
              }}
              placeholder={`Элемент ${idx + 1}`}
              className="text-sm mb-1"
            />
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => {
              const newId = `l${data.leftItems.length + 1}`
              onUpdateData(qIndex, {
                leftItems: [...data.leftItems, { id: newId, text: "" }],
              })
            }}
          >
            <Plus className="h-3 w-3 mr-1" /> Элемент
          </Button>
        </div>
        <div>
          <Input
            value={data.rightLabel}
            onChange={(e) => onUpdateData(qIndex, { rightLabel: e.target.value })}
            placeholder="Заголовок правой колонки"
            className="text-sm mb-2"
          />
          {data.rightItems.map((item, idx) => (
            <Input
              key={item.id}
              value={item.text}
              onChange={(e) => {
                const newItems = [...data.rightItems]
                newItems[idx] = { ...newItems[idx], text: e.target.value }
                onUpdateData(qIndex, { rightItems: newItems })
              }}
              placeholder={`Элемент ${idx + 1}`}
              className="text-sm mb-1"
            />
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => {
              const newId = `r${data.rightItems.length + 1}`
              onUpdateData(qIndex, {
                rightItems: [...data.rightItems, { id: newId, text: "" }],
              })
            }}
          >
            <Plus className="h-3 w-3 mr-1" /> Элемент
          </Button>
        </div>
      </div>
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        <p className="font-medium mb-1">Связи (левый → правый):</p>
        {data.leftItems.map((leftItem, idx) => (
          <div key={leftItem.id} className="flex items-center gap-2 mb-1">
            <span className="truncate max-w-[80px]">{leftItem.text || `Л${idx + 1}`}</span>
            <span>→</span>
            <select
              value={data.correctPairs[leftItem.id] || ""}
              onChange={(e) => {
                onUpdateData(qIndex, {
                  correctPairs: { ...data.correctPairs, [leftItem.id]: e.target.value },
                })
              }}
              className="text-xs border rounded px-1 py-0.5"
            >
              <option value="">Выберите</option>
              {data.rightItems.map((rightItem, rIdx) => (
                <option key={rightItem.id} value={rightItem.id}>
                  {rightItem.text || `П${rIdx + 1}`}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrderingEditor({
  data,
  qIndex,
  onUpdateData,
}: {
  data: OrderingData
  qIndex: number
  onUpdateData: (index: number, newData: Partial<QuestionData>) => void
}) {
  return (
    <div className="ml-7 space-y-2">
      <p className="text-xs text-gray-500 mb-2">
        Введите элементы в правильном порядке (сверху вниз)
      </p>
      {data.items.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
            {idx + 1}
          </span>
          <Input
            value={item.text}
            onChange={(e) => {
              const newItems = [...data.items]
              newItems[idx] = { ...newItems[idx], text: e.target.value }
              onUpdateData(qIndex, { items: newItems })
            }}
            placeholder={`Шаг ${idx + 1}`}
            className="text-sm"
          />
        </div>
      ))}
      <Button
        size="sm"
        variant="ghost"
        className="text-xs"
        onClick={() => {
          const newId = `s${data.items.length + 1}`
          onUpdateData(qIndex, {
            items: [...data.items, { id: newId, text: "" }],
            correctOrder: [...data.correctOrder, newId],
          })
        }}
      >
        <Plus className="h-3 w-3 mr-1" /> Шаг
      </Button>
    </div>
  )
}

function CaseAnalysisEditor({
  data,
  qIndex,
  onUpdateData,
}: {
  data: CaseAnalysisData
  qIndex: number
  onUpdateData: (index: number, newData: Partial<QuestionData>) => void
}) {
  return (
    <div className="ml-7 space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Название кейса
        </label>
        <Input
          value={data.caseLabel}
          onChange={(e) => onUpdateData(qIndex, { caseLabel: e.target.value })}
          placeholder="Например: Кейс для анализа"
          className="text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Описание кейса (Markdown)
        </label>
        <textarea
          value={data.caseContent}
          onChange={(e) => onUpdateData(qIndex, { caseContent: e.target.value })}
          className="w-full p-2 text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Опишите ситуацию для анализа..."
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Варианты ответов
        </label>
        {data.options.map((opt, idx) => (
          <div key={opt.id} className="border rounded p-2 mb-2 space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const newOptions = [...data.options]
                  newOptions[idx] = { ...newOptions[idx], isCorrect: !newOptions[idx].isCorrect }
                  onUpdateData(qIndex, { options: newOptions })
                }}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                  opt.isCorrect
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-gray-300"
                }`}
              >
                {opt.isCorrect && <Check className="h-3 w-3" />}
              </button>
              <Input
                value={opt.text}
                onChange={(e) => {
                  const newOptions = [...data.options]
                  newOptions[idx] = { ...newOptions[idx], text: e.target.value }
                  onUpdateData(qIndex, { options: newOptions })
                }}
                placeholder={`Вариант ${idx + 1}`}
                className="text-sm"
              />
            </div>
            <Input
              value={opt.explanation}
              onChange={(e) => {
                const newOptions = [...data.options]
                newOptions[idx] = { ...newOptions[idx], explanation: e.target.value }
                onUpdateData(qIndex, { options: newOptions })
              }}
              placeholder="Объяснение (показывается после ответа)"
              className="text-xs"
            />
          </div>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="text-xs"
          onClick={() => {
            const newId = `o${data.options.length + 1}`
            onUpdateData(qIndex, {
              options: [...data.options, { id: newId, text: "", isCorrect: false, explanation: "" }],
            })
          }}
        >
          <Plus className="h-3 w-3 mr-1" /> Вариант
        </Button>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Минимум правильных для успеха
        </label>
        <Input
          type="number"
          min={1}
          value={data.minCorrectRequired}
          onChange={(e) =>
            onUpdateData(qIndex, { minCorrectRequired: parseInt(e.target.value) || 1 })
          }
          className="text-sm w-20"
        />
      </div>
    </div>
  )
}

// Export question type labels for use in parent components
export { questionTypeLabels }
