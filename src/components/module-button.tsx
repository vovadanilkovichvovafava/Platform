"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ModuleWarningModal } from "@/components/module-warning-modal"

interface ModuleButtonProps {
  href: string
  moduleSlug: string
  moduleId: string
  skipWarning: boolean
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
  className?: string
  children: ReactNode
}

export function ModuleButton({
  href,
  moduleSlug,
  moduleId,
  skipWarning,
  variant = "default",
  className,
  children,
}: ModuleButtonProps) {
  const [showModal, setShowModal] = useState(false)

  if (skipWarning) {
    return (
      <Button asChild className={className} variant={variant}>
        <Link href={href}>{children}</Link>
      </Button>
    )
  }

  return (
    <>
      <Button
        className={className}
        variant={variant}
        onClick={() => setShowModal(true)}
      >
        {children}
      </Button>
      {showModal && (
        <ModuleWarningModal
          open={showModal}
          onOpenChange={setShowModal}
          moduleSlug={moduleSlug}
          moduleId={moduleId}
        />
      )}
    </>
  )
}
