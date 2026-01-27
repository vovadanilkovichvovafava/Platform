"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleContextValue {
  isOpen: boolean
  toggle: () => void
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | undefined>(undefined)

function useCollapsible() {
  const context = React.useContext(CollapsibleContext)
  if (!context) {
    throw new Error("Collapsible components must be used within a Collapsible")
  }
  return context
}

interface CollapsibleProps {
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

function Collapsible({
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  className,
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen

  const toggle = React.useCallback(() => {
    if (isControlled) {
      onOpenChange?.(!isOpen)
    } else {
      setUncontrolledOpen((prev) => !prev)
      onOpenChange?.(!isOpen)
    }
  }, [isControlled, isOpen, onOpenChange])

  return (
    <CollapsibleContext.Provider value={{ isOpen, toggle }}>
      <div className={className}>{children}</div>
    </CollapsibleContext.Provider>
  )
}

interface CollapsibleTriggerProps {
  children: React.ReactNode
  className?: string
  asChild?: boolean
  showChevron?: boolean
}

function CollapsibleTrigger({
  children,
  className,
  showChevron = true,
}: CollapsibleTriggerProps) {
  const { isOpen, toggle } = useCollapsible()

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex w-full items-center justify-between text-left",
        className
      )}
      aria-expanded={isOpen}
    >
      {children}
      {showChevron && (
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      )}
    </button>
  )
}

interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

function CollapsibleContent({ children, className }: CollapsibleContentProps) {
  const { isOpen } = useCollapsible()

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
        className
      )}
    >
      {isOpen && children}
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent, useCollapsible }
