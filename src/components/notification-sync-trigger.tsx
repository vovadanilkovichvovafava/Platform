"use client"

import { useEffect } from "react"

/**
 * Невидимый компонент-триггер для синхронизации колокольчика уведомлений.
 *
 * Размещается на страницах, где серверная часть автоматически помечает
 * уведомления как прочитанные (teacher/reviews/[id], my-work и т.д.).
 * При монтировании отправляет событие "notifications-sync", чтобы
 * NotificationBell мгновенно обновил счётчик, не дожидаясь 10-секундного поллинга.
 */
export function NotificationSyncTrigger() {
  useEffect(() => {
    window.dispatchEvent(new Event("notifications-sync"))
  }, [])

  return null
}
