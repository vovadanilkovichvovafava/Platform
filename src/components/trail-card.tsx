import Link from "next/link"
import { Code, Target, Palette, Lightbulb, Clock, BookOpen, LucideIcon, ArrowRight } from "lucide-react"

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
      <div className="group h-full p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-500/30 hover:bg-white/[0.08] transition-all duration-300 cursor-pointer">
        <div className="flex flex-col h-full">
          {/* Icon */}
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl mb-4 transition-transform group-hover:scale-110"
            style={{ background: `linear-gradient(135deg, ${trail.color} 0%, ${trail.color}99 100%)` }}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>

          {/* Title */}
          <h3 className="font-semibold text-lg text-white mb-2 group-hover:text-orange-400 transition-colors">
            {trail.title}
          </h3>

          {/* Subtitle */}
          <p className="text-sm text-white/50 mb-4 line-clamp-2 flex-grow">
            {trail.subtitle}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-white/40 mb-4">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {trail.duration}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {moduleCount} модулей
            </span>
          </div>

          {/* Progress or CTA */}
          {enrolled ? (
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white/50">
                  Прогресс
                </span>
                <span className="text-xs font-semibold text-orange-400">
                  {progress}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-white/10">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-orange-400 group-hover:text-orange-300 transition-colors">
                Начать оценку
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
