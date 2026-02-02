"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, Calendar, Trophy, ExternalLink } from "lucide-react"
import Link from "next/link"
import { pluralizeRu } from "@/lib/utils"

interface Certificate {
  id: string
  code?: string
  issuedAt: string | Date
  totalXP?: number
  level?: string
  trail: {
    title: string
    slug?: string
    color?: string
    icon?: string | null
  }
}

interface CertificatesShowcaseProps {
  certificates: Certificate[]
  showTitle?: boolean
  compact?: boolean
  linkToFullPage?: boolean
}

const getLevelColor = (level?: string) => {
  switch (level) {
    case "Junior": return "bg-green-100 text-green-700"
    case "Middle": return "bg-orange-100 text-orange-700"
    case "Senior": return "bg-yellow-100 text-yellow-700"
    default: return "bg-amber-100 text-amber-700"
  }
}

const getLevelEmoji = (level?: string) => {
  switch (level) {
    case "Junior": return "🌱"
    case "Middle": return "🔥"
    case "Senior": return "⭐"
    default: return "📜"
  }
}

export function CertificatesShowcase({
  certificates,
  showTitle = true,
  compact = false,
  linkToFullPage = false,
}: CertificatesShowcaseProps) {
  if (certificates.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Award className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Сертификаты ещё не получены</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        {showTitle && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                <Award className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Сертификаты</h3>
                <p className="text-sm text-gray-500">
                  {certificates.length} {pluralizeRu(certificates.length, ["сертификат", "сертификата", "сертификатов"])}
                </p>
              </div>
            </div>
            {linkToFullPage && (
              <Link
                href="/certificates"
                className="text-sm text-[#0176D3] hover:underline"
              >
                Все сертификаты
              </Link>
            )}
          </div>
        )}

        {compact ? (
          // Compact view - simple list
          <div className="space-y-2">
            {certificates.map((cert) => (
              <Link
                key={cert.id}
                href={`/certificates/${cert.id}`}
                className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg hover:bg-amber-100 hover:shadow-sm transition-all duration-200 group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
                  {getLevelEmoji(cert.level)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-amber-800 transition-colors">
                    {cert.trail.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(cert.issuedAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                {cert.level && (
                  <Badge className={`${getLevelColor(cert.level)} text-xs`}>
                    {cert.level}
                  </Badge>
                )}
              </Link>
            ))}
          </div>
        ) : (
          // Full view - card grid
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="relative overflow-hidden rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
              >
                {/* Color accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 group-hover:h-1.5 transition-all duration-200"
                  style={{ backgroundColor: cert.trail.color || "#f59e0b" }}
                />

                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Certificate icon/preview */}
                    <div
                      className="w-14 h-14 rounded-lg flex items-center justify-center text-white flex-shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${cert.trail.color || "#f59e0b"} 0%, ${cert.trail.color || "#f59e0b"}dd 100%)`,
                      }}
                    >
                      <span className="text-2xl">{getLevelEmoji(cert.level)}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate group-hover:text-amber-800 transition-colors">
                        {cert.trail.title}
                      </h4>

                      <div className="flex items-center gap-2 mt-1">
                        {cert.level && (
                          <Badge className={`${getLevelColor(cert.level)} text-xs`}>
                            {cert.level}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(cert.issuedAt).toLocaleDateString("ru-RU")}
                        </span>
                        {cert.totalXP && (
                          <span className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            {cert.totalXP} XP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* View certificate link */}
                  <Link
                    href={`/certificates/${cert.id}`}
                    className="mt-3 flex items-center justify-center gap-1 text-xs text-amber-700 hover:text-amber-800 py-2 bg-amber-100/50 hover:bg-amber-100 rounded-lg transition-all duration-200"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Открыть сертификат
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
