"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
  showHome?: boolean
}

export function Breadcrumbs({ items, className, showHome = true }: BreadcrumbsProps) {
  const allItems = showHome
    ? [{ label: "Главная", href: "/dashboard" }, ...items]
    : items

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm text-gray-500", className)}
    >
      <ol className="flex items-center gap-1">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1
          const isFirst = index === 0

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1 hover:text-gray-700 transition-colors",
                    isFirst && showHome && "text-gray-400"
                  )}
                >
                  {isFirst && showHome && <Home className="h-4 w-4" />}
                  {(!isFirst || !showHome) && item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "flex items-center gap-1",
                    isLast ? "text-gray-900 font-medium" : "text-gray-500"
                  )}
                >
                  {isFirst && showHome && <Home className="h-4 w-4" />}
                  {(!isFirst || !showHome) && item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
