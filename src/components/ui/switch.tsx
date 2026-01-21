"use client"

import * as React from "react"

interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  id?: string
  className?: string
}

export function Switch({
  checked = false,
  onCheckedChange,
  disabled = false,
  id,
  className = "",
}: SwitchProps) {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? "bg-purple-600" : "bg-gray-200"}
        ${className}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0
          transition duration-200 ease-in-out
          ${checked ? "translate-x-5" : "translate-x-0"}
        `}
      />
    </button>
  )
}
