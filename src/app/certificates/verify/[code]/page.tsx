import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Trophy,
  CheckCircle2,
  User,
  BookOpen,
} from "lucide-react"

interface Props {
  params: Promise<{ code: string }>
}

export default async function VerifyCertificatePage({ params }: Props) {
  const { code } = await params

  const certificate = await prisma.certificate.findUnique({
    where: { code },
    include: {
      user: {
        select: {
          name: true,
        },
      },
      trail: {
        select: {
          title: true,
          slug: true,
          color: true,
          icon: true,
          description: true,
        },
      },
    },
  })

  if (!certificate) {
    notFound()
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Junior":
        return "bg-green-100 text-green-700"
      case "Middle":
        return "bg-orange-100 text-orange-700"
      case "Senior":
        return "bg-yellow-100 text-yellow-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getLevelEmoji = (level: string) => {
    switch (level) {
      case "Junior":
        return "🌱"
      case "Middle":
        return "🔥"
      case "Senior":
        return "⭐"
      default:
        return "📜"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Verification Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full mb-4">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Сертификат подтверждён</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Верификация сертификата
          </h1>
        </div>

        {/* Certificate Card */}
        <Card className="overflow-hidden shadow-xl">
          {/* Header with gradient */}
          <div
            className="h-3"
            style={{ backgroundColor: certificate.trail.color }}
          />

          <CardContent className="p-8">
            {/* Certificate Icon */}
            <div className="flex justify-center mb-6">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${certificate.trail.color} 0%, ${certificate.trail.color}cc 100%)`,
                }}
              >
                <div className="text-center">
                  <div className="text-4xl mb-1">{getLevelEmoji(certificate.level)}</div>
                </div>
              </div>
            </div>

            {/* Certificate Info */}
            <div className="text-center mb-6">
              <Badge className={`mb-3 ${getLevelColor(certificate.level)}`}>
                {certificate.level} Level
              </Badge>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {certificate.trail.title}
              </h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                {certificate.trail.description}
              </p>
            </div>

            {/* Recipient */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Выдан
                  </p>
                  <p className="font-semibold text-gray-900">
                    {certificate.user.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <Calendar className="h-5 w-5 mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-500">Дата выдачи</p>
                <p className="font-medium text-gray-900">
                  {new Date(certificate.issuedAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <Trophy className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                <p className="text-xs text-gray-500">XP на момент выдачи</p>
                <p className="font-medium text-gray-900">{certificate.totalXP} XP</p>
              </div>
            </div>

            {/* Certificate Code */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Код сертификата:</span>
                <code className="bg-gray-100 px-3 py-1 rounded font-mono text-gray-700">
                  {certificate.code}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm mb-4">
            Этот сертификат выдан платформой R&D Academy
          </p>
          <Button asChild variant="outline">
            <Link href="/trails">
              <BookOpen className="h-4 w-4 mr-2" />
              Перейти к обучению
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
