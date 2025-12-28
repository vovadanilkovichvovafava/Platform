import { HeroSection } from "@/components/hero-section"
import { TrailCard } from "@/components/trail-card"
import { prisma } from "@/lib/prisma"
import { Rocket, Users, Award, Target } from "lucide-react"

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
              Почему <span className="titan-gradient">Titan</span>?
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Платформа оценки навыков для тех, кто стремится к звёздам
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-orange-500/20 mb-4">
                <Target className="h-7 w-7 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Skill Assessment
              </h3>
              <p className="text-gray-400 text-sm">
                Объективная оценка реальных навыков через практику
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-purple-500/20 mb-4">
                <Rocket className="h-7 w-7 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Реальные проекты
              </h3>
              <p className="text-gray-400 text-sm">
                Тестовые задания уровня Junior, Middle и Senior
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-cyan-500/20 mb-4">
                <Users className="h-7 w-7 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Экспертная оценка
              </h3>
              <p className="text-gray-400 text-sm">
                Обратная связь от опытных специалистов
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-amber-500/20 mb-4">
                <Award className="h-7 w-7 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Уровень роста
              </h3>
              <p className="text-gray-400 text-sm">
                Прогрессия от Middle до Senior или обратно
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
              <span className="text-orange-400 text-sm font-medium">
                4 направления оценки
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Выбери свою орбиту
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Каждый trail — это путь проверки навыков в определённой области
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
      <section className="py-20 bg-gradient-to-b from-[#12122a] to-[#0a0a1a]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Система уровней
              </h2>
              <p className="text-lg text-gray-400">
                Начни с Middle — докажи, что готов к Senior
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              {/* Junior */}
              <div className="flex-1 max-w-xs p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
                <div className="text-center">
                  <div className="text-4xl mb-3">🌱</div>
                  <h3 className="text-xl font-bold text-green-400 mb-2">Junior</h3>
                  <p className="text-gray-400 text-sm">
                    Базовый уровень. Открывается при неудаче на Middle
                  </p>
                </div>
              </div>

              {/* Middle */}
              <div className="flex-1 max-w-xs p-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-600/10 border border-orange-500/30 scale-110 z-10">
                <div className="text-center">
                  <div className="text-4xl mb-3">🚀</div>
                  <h3 className="text-xl font-bold text-orange-400 mb-2">Middle</h3>
                  <p className="text-gray-400 text-sm">
                    Стартовый уровень для всех кандидатов
                  </p>
                  <div className="mt-3 text-xs text-orange-400/70 font-medium">
                    НАЧАЛО ПУТИ
                  </div>
                </div>
              </div>

              {/* Senior */}
              <div className="flex-1 max-w-xs p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
                <div className="text-center">
                  <div className="text-4xl mb-3">⭐</div>
                  <h3 className="text-xl font-bold text-purple-400 mb-2">Senior</h3>
                  <p className="text-gray-400 text-sm">
                    Высший уровень. Открывается при успехе на Middle
                  </p>
                </div>
              </div>
            </div>

            {/* Arrows */}
            <div className="flex justify-center gap-32 mt-4 text-gray-600">
              <span className="text-sm">← Неудача</span>
              <span className="text-sm">Успех →</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-600/20 via-amber-600/20 to-orange-600/20 border-y border-orange-500/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Готов узнать свой уровень?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Присоединяйся к Titan и докажи свои навыки через реальные проекты
          </p>
          <a
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/25"
          >
            Начать оценку навыков
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#0a0a1a] border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-white font-semibold">TITAN</span>
          </div>
          <p className="text-sm text-gray-500">
            Skill Assessment Platform — Часть экосистемы спутников Сатурна
          </p>
        </div>
      </footer>
    </div>
  )
}
