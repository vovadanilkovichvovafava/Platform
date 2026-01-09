"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

interface ActivityDetail {
  type: "module" | "submission"
  title: string
}

interface ActivityDay {
  date: string
  actions: number
  details?: ActivityDetail[]
}

interface ActivityCalendarProps {
  activityDays: ActivityDay[]
}

const MONTHS_RU = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"
]

const WEEKDAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

function getActivityLevel(actions: number): number {
  if (actions === 0) return 0
  if (actions <= 2) return 1
  if (actions <= 5) return 2
  if (actions <= 10) return 3
  return 4
}

function getActivityColor(level: number): string {
  switch (level) {
    case 0: return "bg-gray-100"
    case 1: return "bg-green-200"
    case 2: return "bg-green-400"
    case 3: return "bg-green-500"
    case 4: return "bg-green-600"
    default: return "bg-gray-100"
  }
}

export function ActivityCalendar({ activityDays }: ActivityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<{ date: string; details: ActivityDetail[] } | null>(null)

  // Create maps for quick lookup
  const activityMap = new Map<string, number>()
  const detailsMap = new Map<string, ActivityDetail[]>()

  activityDays.forEach(day => {
    const dateKey = new Date(day.date).toISOString().split("T")[0]
    activityMap.set(dateKey, day.actions)
    if (day.details) {
      detailsMap.set(dateKey, day.details)
    }
  })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()

  let startDayOfWeek = firstDay.getDay() - 1
  if (startDayOfWeek < 0) startDayOfWeek = 6

  let monthlyActiveDays = 0
  let monthlyActions = 0
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const actions = activityMap.get(dateStr) || 0
    if (actions > 0) {
      monthlyActiveDays++
      monthlyActions += actions
    }
  }

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToCurrentMonth = () => setCurrentDate(new Date())

  const calendarDays: { day: number | null; actions: number; dateStr: string; details?: ActivityDetail[] }[] = []

  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push({ day: null, actions: 0, dateStr: "" })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const actions = activityMap.get(dateStr) || 0
    const details = detailsMap.get(dateStr)
    calendarDays.push({ day, actions, dateStr, details })
  }

  const isCurrentMonth = new Date().getMonth() === month && new Date().getFullYear() === year
  const today = new Date().getDate()

  const handleDayClick = (cell: { actions: number; dateStr: string; details?: ActivityDetail[] }) => {
    if (cell.actions > 0 && cell.details && cell.details.length > 0) {
      setSelectedDay({ date: cell.dateStr, details: cell.details })
    }
  }

  return (
    <div className="bg-white rounded-lg border p-3 max-w-[280px] relative">
      {/* Popup for selected day */}
      {selectedDay && (
        <div className="absolute inset-0 bg-white rounded-lg p-3 z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">
              {new Date(selectedDay.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
            </span>
            <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-gray-100 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {selectedDay.details.map((detail, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11px]">
                <span className={`
                  px-1.5 py-0.5 rounded text-white flex-shrink-0
                  ${detail.type === "module" ? "bg-blue-500" : "bg-green-500"}
                `}>
                  {detail.type === "module" ? "М" : "Р"}
                </span>
                <span className="text-gray-700 leading-tight">{detail.title}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t text-[9px] text-gray-400">
            М — модуль • Р — работа
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={goToPrevMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div className="text-center">
          <button onClick={goToCurrentMonth} className="text-sm font-semibold text-gray-900 hover:text-purple-600 transition-colors">
            {MONTHS_RU[month]} {year}
          </button>
          <p className="text-[10px] text-gray-500">
            {monthlyActiveDays} дн. • {monthlyActions} действ.
          </p>
        </div>
        <button onClick={goToNextMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {WEEKDAYS_RU.map((day) => (
          <div key={day} className="text-center text-[9px] text-gray-400 font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((cell, idx) => {
          if (cell.day === null) {
            return <div key={`empty-${idx}`} className="w-[34px] h-[34px]" />
          }

          const level = getActivityLevel(cell.actions)
          const isToday = isCurrentMonth && cell.day === today
          const hasDetails = cell.details && cell.details.length > 0

          return (
            <div
              key={cell.dateStr}
              onClick={() => handleDayClick(cell)}
              className={`
                w-[34px] h-[34px] rounded flex items-center justify-center text-[10px]
                ${getActivityColor(level)}
                ${isToday ? "ring-1 ring-purple-500" : ""}
                ${level > 0 ? "text-white font-medium" : "text-gray-400"}
                ${hasDetails ? "cursor-pointer hover:ring-2 hover:ring-purple-300" : "cursor-default"}
              `}
              title={hasDetails ? "Нажми чтобы посмотреть детали" : `${cell.actions} действий`}
            >
              {cell.day}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-1 mt-2 text-[9px] text-gray-500">
        <span>Мало</span>
        {[0, 1, 2, 3, 4].map(l => (
          <div key={l} className={`w-2 h-2 rounded-sm ${getActivityColor(l)}`} />
        ))}
        <span>Много</span>
      </div>
    </div>
  )
}
