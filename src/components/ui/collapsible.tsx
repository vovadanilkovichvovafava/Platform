"use client"

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  type ReactNode,
} from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Context for sharing state between Collapsible parts
interface CollapsibleContextValue {
  open: boolean
  toggle: () => void
  contentId: string
  triggerId: string
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null)

function useCollapsible() {
  const context = useContext(CollapsibleContext)
  if (!context) {
    throw new Error("Collapsible components must be used within a Collapsible")
  }
  return context
}

// Main Collapsible container
interface CollapsibleProps {
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

function Collapsible({
  children,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  className,
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  // Generate unique IDs for accessibility
  const id = useId()
  const contentId = `${id}-content`
  const triggerId = `${id}-trigger`

  const toggle = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(!open)
    } else {
      setUncontrolledOpen((prev) => {
        const next = !prev
        onOpenChange?.(next)
        return next
      })
    }
  }, [isControlled, open, onOpenChange])

  return (
    <CollapsibleContext.Provider value={{ open, toggle, contentId, triggerId }}>
      <div className={className} data-state={open ? "open" : "closed"}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
}

// Trigger button that toggles the collapsible
interface CollapsibleTriggerProps {
  children: ReactNode
  className?: string
  asChild?: boolean
  showChevron?: boolean
  chevronPosition?: "left" | "right"
}

function CollapsibleTrigger({
  children,
  className,
  showChevron = true,
  chevronPosition = "right",
}: CollapsibleTriggerProps) {
  const { open, toggle, contentId, triggerId } = useCollapsible()

  return (
    <button
      type="button"
      id={triggerId}
      aria-expanded={open}
      aria-controls={contentId}
      onClick={toggle}
      className={cn(
        "flex w-full items-center justify-between text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        className
      )}
    >
      {chevronPosition === "left" && showChevron && (
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 mr-2",
            open && "rotate-180"
          )}
        />
      )}
      <span className="flex-1">{children}</span>
      {chevronPosition === "right" && showChevron && (
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ml-2",
            open && "rotate-180"
          )}
        />
      )}
    </button>
  )
}

// Content that collapses/expands
interface CollapsibleContentProps {
  children: ReactNode
  className?: string
}

function CollapsibleContent({ children, className }: CollapsibleContentProps) {
  const { open, contentId, triggerId } = useCollapsible()
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(undefined)
  const [isAnimating, setIsAnimating] = useState(false)

  // Measure content height for smooth animation
  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    if (open) {
      // Opening: measure and animate to full height
      const scrollHeight = content.scrollHeight
      setHeight(scrollHeight)
      setIsAnimating(true)

      // After animation, remove fixed height to allow dynamic content
      const timer = setTimeout(() => {
        setHeight(undefined)
        setIsAnimating(false)
      }, 200)

      return () => clearTimeout(timer)
    } else {
      // Closing: set current height, then animate to 0
      const scrollHeight = content.scrollHeight
      setHeight(scrollHeight)
      setIsAnimating(true)

      // Force reflow, then set to 0
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHeight(0)
        })
      })

      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 200)

      return () => clearTimeout(timer)
    }
  }, [open])

  return (
    <div
      ref={contentRef}
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      className={cn(
        "overflow-hidden transition-[height,opacity] duration-200 ease-in-out",
        !open && !isAnimating && "hidden",
        className
      )}
      style={{
        height: height !== undefined ? `${height}px` : undefined,
        opacity: open ? 1 : 0,
      }}
    >
      {children}
    </div>
  )
}

// Pre-composed Collapsible Card variant for common use case
interface CollapsibleCardProps {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  headerClassName?: string
  contentClassName?: string
  badge?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
}

function CollapsibleCard({
  title,
  children,
  defaultOpen = true,
  open,
  onOpenChange,
  className,
  headerClassName,
  contentClassName,
  badge,
  icon,
  actions,
}: CollapsibleCardProps) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      className={cn("rounded-lg border bg-white", className)}
    >
      <div
        className={cn(
          "flex items-center gap-3 p-4 border-b border-transparent",
          "[&[data-state=open]]:border-gray-100",
          headerClassName
        )}
      >
        {icon && <div className="shrink-0">{icon}</div>}
        <CollapsibleTrigger className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 truncate">{title}</span>
            {badge}
          </div>
        </CollapsibleTrigger>
        {actions && (
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
      <CollapsibleContent>
        <div className={cn("p-4 pt-2", contentClassName)}>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// Export all components
export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  CollapsibleCard,
  useCollapsible,
}
