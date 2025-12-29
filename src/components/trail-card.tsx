import Link from "next/link"
import { Clock, BookOpen, ArrowRight } from "lucide-react"

// Custom SVG icons for trails - more polished design
const TrailIcons: Record<string, React.FC<{ className?: string }>> = {
  Code: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 18L3 12L8 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 6L21 12L16 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Target: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  ),
  Palette: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
      <rect x="14" y="14" width="7" height="7" rx="3.5" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Lightbulb: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M10 17H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 3C8.13401 3 5 6.13401 5 10C5 12.38 6.19 14.47 8 15.74V17H16V15.74C17.81 14.47 19 12.38 19 10C19 6.13401 15.866 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 3V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
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
  const Icon = TrailIcons[trail.icon] || TrailIcons.Code
  const moduleCount = trail.modules?.length || 0

  return (
    <Link href={`/trails/${trail.slug}`}>
      <div className="group h-full p-6 rounded-2xl bg-white border border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
        <div className="flex flex-col h-full">
          {/* Icon */}
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl mb-4 transition-transform group-hover:scale-110 shadow-lg"
            style={{
              background: `linear-gradient(145deg, ${trail.color} 0%, ${trail.color}dd 100%)`,
              boxShadow: `0 8px 20px -4px ${trail.color}40`
            }}
          >
            <Icon className="h-7 w-7 text-white" />
          </div>

          {/* Title */}
          <h3 className="font-semibold text-lg text-slate-900 mb-2 group-hover:text-orange-500 transition-colors">
            {trail.title}
          </h3>

          {/* Subtitle */}
          <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-grow">
            {trail.subtitle}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {trail.duration}
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              {moduleCount} модулей
            </span>
          </div>

          {/* Progress or CTA */}
          {enrolled ? (
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">
                  Прогресс
                </span>
                <span className="text-xs font-semibold" style={{ color: trail.color }}>
                  {progress}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${trail.color} 0%, ${trail.color}cc 100%)`
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-100">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-orange-500 group-hover:text-orange-600 transition-colors">
                Начать обучение
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
