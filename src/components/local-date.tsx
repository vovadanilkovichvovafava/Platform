"use client"

import { useEffect, useState } from "react"

interface LocalDateProps {
  date: string
  format?: "long" | "short"
}

const FORMATS: Record<"long" | "short", Intl.DateTimeFormatOptions> = {
  long: {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  short: {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  },
}

export function LocalDate({ date, format = "short" }: LocalDateProps) {
  const [text, setText] = useState("")

  useEffect(() => {
    setText(new Date(date).toLocaleDateString("ru-RU", FORMATS[format]))
  }, [date, format])

  // Non-breaking space during SSR to preserve layout
  return <span>{text || "\u00A0"}</span>
}
