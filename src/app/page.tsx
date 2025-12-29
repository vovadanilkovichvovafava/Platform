import { HeroSection } from "@/components/hero-section"
import { TrailCard } from "@/components/trail-card"
import { prisma } from "@/lib/prisma"
import { Target, Users, TrendingUp } from "lucide-react"

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
    <div className="min-h-screen bg-white">
      <HeroSection />

      {/* Why Prometheus */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Почему Prometheus?
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              Практико-ориентированное обучение с реальными проектами
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-orange-100 flex items-center justify-center">
                <Target className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Реальные задачи</h3>
              <p className="text-slate-500 text-sm">
                Проекты максимально приближены к рабочим условиям
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-orange-100 flex items-center justify-center">
                <Users className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Экспертная оценка</h3>
              <p className="text-slate-500 text-sm">
                Работы проверяют практикующие специалисты
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-orange-100 flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Система уровней</h3>
              <p className="text-slate-500 text-sm">
                Junior, Middle, Senior — определи свой уровень
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-orange-500 text-sm font-medium tracking-wider uppercase mb-3">
              Процесс
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Как это работает
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-orange-500 flex items-center justify-center">
                <span className="text-xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Выбери направление</h3>
              <p className="text-slate-500 text-sm">
                Vibe Coding, маркетинг, UI дизайн или R&D креатор
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-orange-500 flex items-center justify-center">
                <span className="text-xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Пройди тест</h3>
              <p className="text-slate-500 text-sm">
                Ответь на вопросы и выполни тестовое задание уровня Middle
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-orange-500 flex items-center justify-center">
                <span className="text-xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Получи оценку</h3>
              <p className="text-slate-500 text-sm">
                Эксперт оценит работу и определит твой уровень
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Level System */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-orange-500 text-sm font-medium tracking-wider uppercase mb-3">
              Система уровней
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Определи свой уровень
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-green-300 hover:shadow-lg transition-all">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <span className="text-2xl">🌱</span>
                </div>
                <div>
                  <h4 className="text-slate-900 font-semibold">Junior</h4>
                  <p className="text-slate-400 text-sm">Базовый уровень</p>
                </div>
              </div>
              <p className="text-slate-500 text-sm">
                Открывается если задание Middle оказалось сложным. Позволяет подтвердить базовые навыки.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 shadow-lg">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                  <span className="text-2xl">🔥</span>
                </div>
                <div>
                  <h4 className="text-slate-900 font-semibold">Middle</h4>
                  <p className="text-orange-500 text-sm font-medium">Точка входа</p>
                </div>
              </div>
              <p className="text-slate-500 text-sm">
                Стартовый уровень для всех кандидатов. Успех открывает Senior, неудача — Junior.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-yellow-300 hover:shadow-lg transition-all">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <span className="text-2xl">⭐</span>
                </div>
                <div>
                  <h4 className="text-slate-900 font-semibold">Senior</h4>
                  <p className="text-slate-400 text-sm">Продвинутый уровень</p>
                </div>
              </div>
              <p className="text-slate-500 text-sm">
                Открывается после успешного прохождения Middle. Сложные задачи для опытных специалистов.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trails Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-orange-500 text-sm font-medium tracking-wider uppercase mb-3">
              Направления
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Выбери свой путь
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
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
      <section className="py-20 bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Готов проверить свои навыки?
            </h2>
            <p className="text-slate-400 text-lg mb-8">
              Зарегистрируйся и начни оценку прямо сейчас
            </p>
            <a
              href="/register"
              className="inline-flex items-center justify-center h-12 px-10 text-base font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all shadow-lg shadow-orange-500/30"
            >
              Начать бесплатно
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-slate-900 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-white font-semibold">Prometheus</span>
            </div>
            <p className="text-slate-500 text-sm">
              Skill Assessment Platform
            </p>
            <p className="text-slate-600 text-sm">
              Часть экосистемы спутников Сатурна
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
