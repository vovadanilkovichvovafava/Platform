"use client"

import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

const TASK_KEYWORDS = [
  "задание",
  "задача",
  "тз",
  "тех. задание",
  "тех.задание",
  "техническое задание",
  "техзадание",
  "требования",
]

/**
 * Client component that scrolls to the first heading containing
 * task-related keywords when ?scrollTo=task is present in the URL.
 */
export function ScrollToTaskHeading() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("scrollTo") !== "task") return

    // Small delay to let the page render fully
    const timer = setTimeout(() => {
      const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6")

      for (const heading of headings) {
        const text = (heading.textContent || "").toLowerCase().trim()
        const found = TASK_KEYWORDS.some((kw) => text.includes(kw))
        if (found) {
          heading.scrollIntoView({ behavior: "smooth", block: "start" })
          // Highlight briefly
          heading.style.transition = "background-color 0.3s"
          heading.style.backgroundColor = "#fef3c7"
          setTimeout(() => {
            heading.style.backgroundColor = ""
          }, 2000)
          return
        }
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchParams])

  return null
}
