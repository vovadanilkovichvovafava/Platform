"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { EditTrailModal, TrailFormData } from "@/components/edit-trail-modal"
import { Pencil } from "lucide-react"

interface TrailEditButtonProps {
  trail: TrailFormData
  variant?: "default" | "icon"
}

export function TrailEditButton({ trail, variant = "default" }: TrailEditButtonProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  const handleSave = () => {
    // Refresh the page to show updated data
    router.refresh()
  }

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Редактировать trail"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <EditTrailModal
          open={showModal}
          trail={trail}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      </>
    )
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowModal(true)}
        className="shrink-0"
      >
        <Pencil className="h-4 w-4 mr-2" />
        Редактировать trail
      </Button>
      <EditTrailModal
        open={showModal}
        trail={trail}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
      />
    </>
  )
}
