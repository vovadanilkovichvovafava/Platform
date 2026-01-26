"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="container py-8">
      <Card className="max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle>Ошибка загрузки дашборда</CardTitle>
          <CardDescription>
            Не удалось загрузить данные. Возможно, проблема с подключением.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-2">
          <Button onClick={reset}>Обновить</Button>
          <Button onClick={() => window.location.href = "/trails"} variant="outline">
            К курсам
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
