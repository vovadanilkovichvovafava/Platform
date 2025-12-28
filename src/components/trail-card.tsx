import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Code, Target, Palette, Lightbulb, Clock, BookOpen, LucideIcon } from "lucide-react"

const iconMap: Record<string, LucideIcon> = {
  Code,
  Target,
  Palette,
  Lightbulb,
}

interface TrailCardProps {
  trail: {
    slug: string
    title: string
    subtitle: string
    description: string
    icon: string
    color: string
    duration: string
    modules?: { id: string }[]
  }
  progress?: number
  enrolled?: boolean
}

export function TrailCard({ trail, progress = 0, enrolled = false }: TrailCardProps) {
  const Icon = iconMap[trail.icon] || Code
  const moduleCount = trail.modules?.length || 0

  return (
    <Link href={`/trails/${trail.slug}`}>
      <Card className="h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `linear-gradient(135deg, ${trail.color} 0%, ${trail.color}99 100%)` }}
            >
              <Icon className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 mb-1">
                {trail.title}
              </h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                {trail.subtitle}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {trail.duration}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {moduleCount} модулей
                </span>
              </div>
            </div>
          </div>

          {enrolled && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">
                  Прогресс
                </span>
                <span className="text-xs font-semibold text-[#2E844A]">
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {!enrolled && (
            <div className="mt-4 pt-4 border-t">
              <Badge variant="secondary" className="text-xs">
                Начать обучение
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
