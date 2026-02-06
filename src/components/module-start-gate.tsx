"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Timer, Loader2 } from "lucide-react"

interface ModuleStartGateProps {
  moduleId: string
  moduleTitle: string
  trailSlug: string
}

export function ModuleStartGate({
  moduleId,
  moduleTitle,
  trailSlug,
}: ModuleStartGateProps) {
  const router = useRouter()
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  const handleStart = async () => {
    setIsStarting(true)
    try {
      const res = await fetch("/api/modules/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          skipModuleWarning: dontShowAgain || undefined,
        }),
      })

      if (res.ok) {
        // Module is now IN_PROGRESS — refresh the page to show content
        router.refresh()
      } else {
        setIsStarting(false)
      }
    } catch {
      setIsStarting(false)
    }
  }

  const handleCancel = () => {
    router.push(`/trails/${trailSlug}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100">
                <Timer className="h-7 w-7 text-amber-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Начало модуля
            </h2>
            <p className="text-gray-700 font-medium mb-4">{moduleTitle}</p>
            <p className="text-gray-500 text-sm mb-6">
              При открытии модуля запустится таймер времени выполнения.
              Убедитесь, что вы готовы приступить к работе.
            </p>
          </div>

          <div className="flex items-center gap-2 mb-6 justify-center">
            <Checkbox
              id="gateSkip"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <label
              htmlFor="gateSkip"
              className="text-sm text-gray-500 cursor-pointer select-none"
            >
              Убрать это сообщение для всех последующих модулей
            </label>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={isStarting}
            >
              Отменить
            </Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleStart}
              disabled={isStarting}
            >
              {isStarting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Загрузка...
                </>
              ) : (
                "Продолжить"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
