import { HeroSection } from "@/components/hero-section"
import { TrailCard } from "@/components/trail-card"
import { prisma } from "@/lib/prisma"
import { Flame, Users, Award, Target } from "lucide-react"

export const dynamic = "force-dynamic"

async function getTrails() {
  return prisma.trail.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      modules: {
        select: { id: true },
      },
    },
  })
}

export default async function HomePage() {
  const trails = await getTrails()

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <HeroSection />

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-[#0a0a1a] to-[#12122a]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Почему <span className="prometheus-gradient">Prometheus</span>?
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Как Прометей принёс огонь людям — мы зажигаем потенциал кандидатов
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 backdrop-blur-sm hover:border-orange-500/40 transition-colors group">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-orange-500/20 mb-4 group-hover:bg-orange-500/30 transition-colors">
                <Target className="h-7 w-7 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Skill Assessment
              </h3>
              <p className="text-gray-400 text-sm">
                Объективная оценка навыков через практические испытания
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 backdrop-blur-sm hover:border-amber-500/40 transition-colors group">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-amber-500/20 mb-4 group-hover:bg-amber-500/30 transition-colors">
                <Flame className="h-7 w-7 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Огонь знаний
              </h3>
              <p className="text-gray-400 text-sm">
                Тестовые задания уровня Junior, Middle и Senior
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 backdrop-blur-sm hover:border-yellow-500/40 transition-colors group">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-yellow-500/20 mb-4 group-hover:bg-yellow-500/30 transition-colors">
                <Users className="h-7 w-7 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Экспертная оценка
              </h3>
              <p className="text-gray-400 text-sm">
                Обратная связь от хранителей огня — экспертов
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 backdrop-blur-sm hover:border-red-500/40 transition-colors group">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-red-500/20 mb-4 group-hover:bg-red-500/30 transition-colors">
                <Award className="h-7 w-7 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Путь к вершине
              </h3>
              <p className="text-gray-400 text-sm">
                Прогрессия от Middle до Senior через испытания
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trails Section */}
      <section className="py-20 bg-[#12122a]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-6">
              <Flame className="h-4 w-4 text-orange-400" />
              <span className="text-orange-400 text-sm font-medium">
                4 пути испытаний
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Выбери свой огонь
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Каждый trail — это путь проверки навыков через огонь практики
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {trails.map((trail) => (
              <TrailCard key={trail.id} trail={trail} />
            ))}
          </div>
        </div>
      </section>

      {/* Level System Section */}
      <section className="py-20 bg-gradient-to-b from-[#12122a] to-[#0a0a1a] relative overflow-hidden">
        {/* Fire glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Испытание огнём
              </h2>
              <p className="text-lg text-gray-400">
                Начни с Middle — пройди через пламя и докажи, что достоин Senior
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              {/* Junior */}
              <div className="flex-1 max-w-xs p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 hover:border-green-500/40 transition-colors">
                <div className="text-center">
                  <div className="text-4xl mb-3">🌱</div>
                  <h3 className="text-xl font-bold text-green-400 mb-2">Junior</h3>
                  <p className="text-gray-400 text-sm">
                    Искра. Открывается, если огонь Middle оказался слишком силён
                  </p>
                </div>
              </div>

              {/* Middle */}
              <div className="flex-1 max-w-xs p-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-600/10 border-2 border-orange-500/50 scale-110 z-10 relative">
                {/* Flame effect */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="w-6 h-8 bg-gradient-to-t from-orange-500 to-yellow-300 rounded-full blur-sm animate-pulse" />
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-3">🔥</div>
                  <h3 className="text-xl font-bold text-orange-400 mb-2">Middle</h3>
                  <p className="text-gray-400 text-sm">
                    Пламя. Стартовое испытание для всех кандидатов
                  </p>
                  <div className="mt-3 text-xs text-orange-400/70 font-medium uppercase tracking-wider">
                    Точка входа
                  </div>
                </div>
              </div>

              {/* Senior */}
              <div className="flex-1 max-w-xs p-6 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-amber-600/5 border border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
                <div className="text-center">
                  <div className="text-4xl mb-3">⭐</div>
                  <h3 className="text-xl font-bold text-yellow-400 mb-2">Senior</h3>
                  <p className="text-gray-400 text-sm">
                    Свет. Открывается тем, кто прошёл через пламя Middle
                  </p>
                </div>
              </div>
            </div>

            {/* Flow arrows */}
            <div className="flex justify-center items-center gap-4 mt-8 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <span>←</span>
                <span>Не прошёл испытание</span>
              </div>
              <div className="w-px h-4 bg-gray-700" />
              <div className="flex items-center gap-2 text-gray-500">
                <span>Прошёл испытание</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mythology Section */}
      <section className="py-16 bg-[#0a0a1a]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <blockquote className="text-xl md:text-2xl text-gray-300 italic mb-6">
              «Прометей похитил огонь у богов и передал его людям,
              <br />
              <span className="text-orange-400">дав им силу знания и творения»</span>
            </blockquote>
            <p className="text-gray-500">
              — Как и Прометей, мы несём огонь знаний тем, кто готов его принять
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        {/* Animated fire background */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-amber-600/30 to-orange-600/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-transparent to-[#0a0a1a]" />

        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Готов пройти через огонь?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Присоединяйся к Prometheus и докажи свои навыки через испытания
          </p>
          <a
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-xl hover:from-orange-600 hover:via-amber-600 hover:to-yellow-600 transition-all shadow-lg shadow-orange-500/30 fire-button"
          >
            <Flame className="h-5 w-5" />
            Зажечь свой огонь
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#0a0a1a] border-t border-orange-500/10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="text-white font-semibold tracking-wider">PROMETHEUS</span>
          </div>
          <p className="text-sm text-gray-500">
            Skill Assessment Platform — Несущий огонь знаний
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Часть экосистемы спутников Сатурна
          </p>
        </div>
      </footer>
    </div>
  )
}
