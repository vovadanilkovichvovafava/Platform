"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface ActivityDay {
  date: string // ISO date string
  actions: number
}

interface ActivityCalendarProps {
  activityDays: ActivityDay[]
}

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
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

  // Create a map for quick lookup
  const activityMap = new Map<string, number>()
  activityDays.forEach(day => {
    const dateKey = new Date(day.date).toISOString().split("T")[0]
    activityMap.set(dateKey, day.actions)
  })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and total days
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()

  // Get day of week for first day (0 = Sunday, convert to Monday = 0)
  let startDayOfWeek = firstDay.getDay() - 1
  if (startDayOfWeek < 0) startDayOfWeek = 6

  // Calculate total active days in current month
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

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToCurrentMonth = () => {
    setCurrentDate(new Date())
  }

  // Build calendar grid
  const calendarDays: { day: number | null; actions: number; dateStr: string }[] = []

  // Empty cells before first day
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push({ day: null, actions: 0, dateStr: "" })
  }

  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const actions = activityMap.get(dateStr) || 0
    calendarDays.push({ day, actions, dateStr })
  }

  const isCurrentMonth = new Date().getMonth() === month && new Date().getFullYear() === year
  const today = new Date().getDate()

  return (
    <div className="bg-white rounded-xl border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>

        <div className="text-center">
          <button
            onClick={goToCurrentMonth}
            className="font-semibold text-gray-900 hover:text-purple-600 transition-colors"
          >
            {MONTHS_RU[month]} {year}
          </button>
          <p className="text-xs text-gray-500 mt-0.5">
            {monthlyActiveDays} акт. {monthlyActiveDays === 1 ? "день" : monthlyActiveDays < 5 ? "дня" : "дней"} • {monthlyActions} действий
          </p>
        </div>

        <button
          onClick={goToNextMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_RU.map((day) => (
          <div key={day} className="text-center text-xs text-gray-400 font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cell, idx) => {
          if (cell.day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />
          }

          const level = getActivityLevel(cell.actions)
          const isToday = isCurrentMonth && cell.day === today

          return (
            <div
              key={cell.dateStr}
              className={`
                aspect-square rounded-md flex items-center justify-center text-xs
                ${getActivityColor(level)}
                ${isToday ? "ring-2 ring-purple-500 ring-offset-1" : ""}
                ${level > 0 ? "text-white font-medium" : "text-gray-400"}
                transition-colors cursor-default
              `}
              title={`${cell.day} ${MONTHS_RU[month]}: ${cell.actions} действий`}
            >
              {cell.day}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
        <span>Меньше</span>
        <div className={`w-3 h-3 rounded ${getActivityColor(0)}`} />
        <div className={`w-3 h-3 rounded ${getActivityColor(1)}`} />
        <div className={`w-3 h-3 rounded ${getActivityColor(2)}`} />
        <div className={`w-3 h-3 rounded ${getActivityColor(3)}`} />
        <div className={`w-3 h-3 rounded ${getActivityColor(4)}`} />
        <span>Больше</span>
      </div>
    </div>
  )
}
