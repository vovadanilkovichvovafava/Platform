"use client"

import { useState, type ReactNode, type MouseEvent } from "react"
import Link from "next/link"
import { ModuleWarningModal } from "@/components/module-warning-modal"

interface ModuleLinkProps {
  href: string
  moduleSlug: string
  moduleId: string
  skipWarning: boolean
  className?: string
  children: ReactNode
}

export function ModuleLink({
  href,
  moduleSlug,
  moduleId,
  skipWarning,
  className,
  children,
}: ModuleLinkProps) {
  const [showModal, setShowModal] = useState(false)

  const handleClick = (e: MouseEvent) => {
    if (!skipWarning) {
      e.preventDefault()
      setShowModal(true)
    }
  }

  return (
    <>
      <Link href={href} className={className} onClick={handleClick}>
        {children}
      </Link>
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
