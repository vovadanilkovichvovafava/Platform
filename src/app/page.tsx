import { HeroSection } from "@/components/hero-section"
import { TrailCard } from "@/components/trail-card"
import { prisma } from "@/lib/prisma"
import { Target, Users, TrendingUp, CheckCircle } from "lucide-react"

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
    <div className="min-h-screen bg-[#070714]">
      <HeroSection />

      {/* How it works */}
      <section className="py-24 bg-[#070714]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-orange-400 text-sm font-medium tracking-wider uppercase mb-4">
              Процесс
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Как это работает
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center border border-orange-500/20">
                <span className="text-2xl font-bold text-orange-400">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Выбери направление</h3>
              <p className="text-white/50 text-sm">
                Vibe Coding, маркетинг, UI дизайн или R&D креатор
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center border border-orange-500/20">
                <span className="text-2xl font-bold text-orange-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Пройди тест</h3>
              <p className="text-white/50 text-sm">
                Ответь на вопросы и выполни тестовое задание уровня Middle
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center border border-orange-500/20">
                <span className="text-2xl font-bold text-orange-400">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Получи оценку</h3>
              <p className="text-white/50 text-sm">
                Эксперт оценит работу и определит твой уровень
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-gradient-to-b from-[#070714] to-[#0c0c1d]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <div>
              <p className="text-orange-400 text-sm font-medium tracking-wider uppercase mb-4">
                Преимущества
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Объективная оценка навыков
              </h2>
              <p className="text-white/60 text-lg mb-8">
                Prometheus — это система проверки реальных компетенций через практические задания,
                а не теоретические тесты.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Реальные задачи</h4>
                    <p className="text-white/50 text-sm">Проекты максимально приближены к рабочим условиям</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Экспертная оценка</h4>
                    <p className="text-white/50 text-sm">Работы проверяют практикующие специалисты</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Система уровней</h4>
                    <p className="text-white/50 text-sm">Junior, Middle, Senior — определи свой уровень</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Level cards */}
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-green-500/30 transition-colors">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <span className="text-2xl">🌱</span>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Junior</h4>
                    <p className="text-white/40 text-sm">Базовый уровень</p>
                  </div>
                </div>
                <p className="text-white/50 text-sm">
                  Открывается если задание Middle оказалось сложным. Позволяет подтвердить базовые навыки.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-2 border-orange-500/30">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <span className="text-2xl">🔥</span>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Middle</h4>
                    <p className="text-orange-400 text-sm font-medium">Точка входа</p>
                  </div>
                </div>
                <p className="text-white/50 text-sm">
                  Стартовый уровень для всех кандидатов. Успех открывает Senior, неудача — Junior.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-yellow-500/30 transition-colors">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                    <span className="text-2xl">⭐</span>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Senior</h4>
                    <p className="text-white/40 text-sm">Продвинутый уровень</p>
                  </div>
                </div>
                <p className="text-white/50 text-sm">
                  Открывается после успешного прохождения Middle. Сложные задачи для опытных специалистов.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trails Section */}
      <section className="py-24 bg-[#0c0c1d]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-orange-400 text-sm font-medium tracking-wider uppercase mb-4">
              Направления
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Выбери свой путь
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Четыре направления для оценки навыков в разных областях
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {trails.map((trail) => (
              <TrailCard key={trail.id} trail={trail} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-b from-[#0c0c1d] to-[#070714]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Готов проверить свои навыки?
            </h2>
            <p className="text-white/60 text-lg mb-10">
              Зарегистрируйся и начни оценку прямо сейчас
            </p>
            <a
              href="/register"
              className="inline-flex items-center justify-center h-14 px-10 text-base font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl transition-all shadow-xl shadow-orange-500/20"
            >
              Начать бесплатно
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-[#070714] border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-white font-semibold">Prometheus</span>
            </div>
            <p className="text-white/40 text-sm">
              Skill Assessment Platform
            </p>
            <p className="text-white/30 text-sm">
              Часть экосистемы спутников Сатурна
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
