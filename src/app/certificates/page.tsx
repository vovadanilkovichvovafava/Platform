"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, Download, ExternalLink, Loader2, Calendar, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"

interface Certificate {
  id: string
  code: string
  issuedAt: string
  totalXP: number
  level: string
  trail: {
    title: string
    slug: string
    color: string
    icon: string
  }
}

export default function CertificatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchCertificates()
    }
  }, [session])

  const fetchCertificates = async () => {
    try {
      const res = await fetch("/api/certificates")
      if (res.ok) {
        const data = await res.json()
        setCertificates(data)
      }
    } catch (err) {
      console.error("Error fetching certificates:", err)
    } finally {
      setLoading(false)
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Junior": return "bg-green-100 text-green-700"
      case "Middle": return "bg-orange-100 text-orange-700"
      case "Senior": return "bg-yellow-100 text-yellow-700"
      default: return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300"
    }
  }

  const getLevelEmoji = (level: string) => {
    switch (level) {
      case "Junior": return "🌱"
      case "Middle": return "🔥"
      case "Senior": return "⭐"
      default: return "📜"
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Award className="h-8 w-8 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Мои сертификаты</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            Сертификаты выдаются за прохождение trails
          </p>
        </div>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="h-16 w-16 mx-auto text-gray-300 dark:text-slate-600 mb-4" />
            <h2 className="text-lg font-medium text-gray-700 dark:text-slate-300 mb-2">
              Пока нет сертификатов
            </h2>
            <p className="text-gray-500 dark:text-slate-400 mb-4">
              Завершите все модули в trail, чтобы получить сертификат
            </p>
            <Button asChild variant="outline">
              <a href="/trails">Перейти к trails</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {certificates.map((cert) => (
            <Card key={cert.id} className="overflow-hidden">
              <div
                className="h-2"
                style={{ backgroundColor: cert.trail.color }}
              />
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Certificate Preview */}
                  <div
                    className="w-full md:w-48 h-32 rounded-lg flex items-center justify-center text-white relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${cert.trail.color} 0%, ${cert.trail.color}dd 100%)`,
                    }}
                  >
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="relative text-center">
                      <div className="text-3xl mb-1">{getLevelEmoji(cert.level)}</div>
                      <div className="font-bold text-sm">{cert.level}</div>
                    </div>
                    <div className="absolute bottom-2 right-2 text-white/60 text-[8px] font-mono">
                      {cert.code}
                    </div>
                  </div>

                  {/* Certificate Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                          {cert.trail.title}
                        </h3>
                        <Badge className={`mt-2 ${getLevelColor(cert.level)}`}>
                          {cert.level} Level
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(cert.issuedAt).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4" />
                        {cert.totalXP} XP
                      </div>
                      <div className="font-mono text-xs bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {cert.code}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/certificates/${cert.id}`, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Открыть
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/certificates/verify/${cert.code}`
                          )
                          showToast("Ссылка скопирована!", "success")
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Скопировать ссылку
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
