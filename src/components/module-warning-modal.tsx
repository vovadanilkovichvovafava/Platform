"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Timer } from "lucide-react"

interface ModuleWarningModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  moduleSlug: string
}

export function ModuleWarningModal({
  open,
  onOpenChange,
  moduleSlug,
}: ModuleWarningModalProps) {
  const router = useRouter()
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  const handleContinue = async () => {
    setIsNavigating(true)

    if (dontShowAgain) {
      try {
        await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skipModuleWarning: true }),
          keepalive: true,
        })
      } catch {
        // Silent fail - don't block navigation
      }
    }

    router.push(`/module/${moduleSlug}`)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Timer className="h-5 w-5 text-amber-600" />
            </div>
            <DialogTitle className="text-lg">Начало модуля</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 pt-2">
            При открытии модуля запустится таймер времени выполнения.
            Убедитесь, что вы готовы приступить к работе.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          <Checkbox
            id="dontShowAgain"
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
          />
          <label
            htmlFor="dontShowAgain"
            className="text-sm text-gray-500 cursor-pointer select-none"
          >
            Убрать это сообщение для всех последующих модулей
          </label>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isNavigating}
          >
            Отменить
          </Button>
          <Button
            onClick={handleContinue}
            disabled={isNavigating}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isNavigating ? "Переход..." : "Продолжить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
