"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { Award, Loader2 } from "lucide-react"

interface ClaimCertificateButtonProps {
  trailId: string
}

export function ClaimCertificateButton({ trailId }: ClaimCertificateButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { showToast } = useToast()

  const handleClaim = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trailId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Ошибка получения сертификата")
      }

      showToast("Сертификат получен!", "success")
      router.refresh()
      router.push("/certificates")
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Ошибка получения сертификата",
        "error"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClaim}
      disabled={loading}
      className="bg-amber-500 hover:bg-amber-600 gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Award className="h-4 w-4" />
      )}
      Получить сертификат
    </Button>
  )
}
