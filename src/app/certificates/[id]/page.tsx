import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, Calendar, Trophy, User } from "lucide-react"

interface Props {
  params: Promise<{ id: string }>
}

export default async function CertificatePage({ params }: Props) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
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

  // Only allow owner, admin, or teacher to view
  const isOwner = certificate.user.id === session.user.id
  const isPrivileged = session.user.role === "ADMIN" || session.user.role === "TEACHER"

  if (!isOwner && !isPrivileged) {
    redirect("/certificates")
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Junior":
        return "bg-green-500"
      case "Middle":
        return "bg-orange-500"
      case "Senior":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 py-8 print:bg-white print:py-0">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Certificate */}
        <Card className="overflow-hidden shadow-2xl print:shadow-none border-4 border-amber-200">
          {/* Decorative top border */}
          <div
            className="h-4"
            style={{ backgroundColor: certificate.trail.color }}
          />

          <CardContent className="p-12 text-center">
            {/* Header */}
            <div className="mb-8">
              <Award className="h-16 w-16 mx-auto text-amber-500 mb-4" />
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Сертификат
              </h1>
              <p className="text-gray-500 text-lg">
                об успешном прохождении курса
              </p>
            </div>

            {/* Trail Title */}
            <div className="mb-8">
              <div
                className="inline-block px-6 py-3 rounded-xl text-white font-bold text-2xl mb-4"
                style={{ backgroundColor: certificate.trail.color }}
              >
                {certificate.trail.title}
              </div>
              <div className="flex justify-center">
                <Badge className={`${getLevelColor(certificate.level)} text-white text-lg px-4 py-1`}>
                  {getLevelEmoji(certificate.level)} {certificate.level} Level
                </Badge>
              </div>
            </div>

            {/* Recipient */}
            <div className="mb-8">
              <p className="text-gray-500 mb-2">Настоящим подтверждается, что</p>
              <div className="flex items-center justify-center gap-2">
                <User className="h-6 w-6 text-gray-400" />
                <p className="text-3xl font-bold text-gray-900">
                  {certificate.user.name}
                </p>
              </div>
              <p className="text-gray-500 mt-2">
                успешно завершил(а) обучение по данному направлению
              </p>
            </div>

            {/* Details */}
            <div className="flex justify-center gap-8 mb-8 text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>
                  {new Date(certificate.issuedAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span>{certificate.totalXP} XP</span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-dashed border-gray-200 pt-6">
              <div className="flex justify-between items-end text-sm text-gray-500">
                <div>
                  <p className="font-mono">{certificate.code}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-700">R&D Academy</p>
                  <p>Промсвязьбанк</p>
                </div>
              </div>
            </div>
          </CardContent>

          {/* Decorative bottom border */}
          <div
            className="h-4"
            style={{ backgroundColor: certificate.trail.color }}
          />
        </Card>

        {/* Print instructions (hidden when printing) */}
        <p className="text-center text-gray-500 mt-6 text-sm print:hidden">
          Нажмите Ctrl+P (Cmd+P на Mac) чтобы распечатать или сохранить как PDF
        </p>
      </div>
    </div>
  )
}
