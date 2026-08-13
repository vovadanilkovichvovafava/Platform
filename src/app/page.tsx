import { HeroSection } from "@/components/hero-section"
import { TrailCard } from "@/components/trail-card"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
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
  const [trails, session] = await Promise.all([
    getTrails(),
    getServerSession(authOptions),
  ])

  const isLoggedIn = !!session?.user

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <HeroSection isLoggedIn={isLoggedIn} />

      {/* Why Prometheus */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Почему Prometheus?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Практико-ориентированное обучение с реальными проектами
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                <Target className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Реальные задачи</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Проекты максимально приближены к рабочим условиям
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                <Users className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Экспертная оценка</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Работы проверяют практикующие специалисты
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Система уровней</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Junior, Middle, Senior — определи свой уровень
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-orange-500 text-sm font-medium tracking-wider uppercase mb-3">
              Процесс
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">
              Как это работает
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-orange-500 flex items-center justify-center">
                <span className="text-xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Выбери направление</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Vibe Coding, маркетинг, UI дизайн или R&D креатор
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-orange-500 flex items-center justify-center">
                <span className="text-xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Пройди тест</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Ответь на вопросы и выполни тестовое задание уровня Middle
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-orange-500 flex items-center justify-center">
                <span className="text-xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Получи оценку</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Эксперт оценит работу и определит твой уровень
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Level System */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-orange-500 text-sm font-medium tracking-wider uppercase mb-3">
              Система уровней
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">
              Определи свой уровень
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-600 hover:shadow-lg transition-all">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
                  <span className="text-2xl">🌱</span>
                </div>
                <div>
                  <h4 className="text-slate-900 dark:text-slate-100 font-semibold">Junior</h4>
                  <p className="text-slate-400 dark:text-slate-500 text-sm">Базовый уровень</p>
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Открывается если задание Middle оказалось сложным. Позволяет подтвердить базовые навыки.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-lg transition-all">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                  <span className="text-2xl">🔥</span>
                </div>
                <div>
                  <h4 className="text-slate-900 dark:text-slate-100 font-semibold">Middle</h4>
                  <p className="text-orange-500 dark:text-orange-400 text-sm font-medium">Точка входа</p>
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Стартовый уровень для всех кандидатов. Успех открывает Senior, неудача — Junior.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-yellow-300 dark:hover:border-yellow-600 hover:shadow-lg transition-all">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center">
                  <span className="text-2xl">⭐</span>
                </div>
                <div>
                  <h4 className="text-slate-900 dark:text-slate-100 font-semibold">Senior</h4>
                  <p className="text-slate-400 dark:text-slate-500 text-sm">Продвинутый уровень</p>
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Открывается после успешного прохождения Middle. Сложные задачи для опытных специалистов.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trails Section */}
      <section id="trails-section" className="py-20 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-orange-500 text-sm font-medium tracking-wider uppercase mb-3">
              Направления
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Выбери свой путь
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
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
      <section className="py-20 bg-slate-900 dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {isLoggedIn ? "Продолжи обучение" : "Готов проверить свои навыки?"}
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-lg mb-8">
              {isLoggedIn ? "Выбери trail и развивай навыки" : "Войди в систему и начни оценку"}
            </p>
            <a
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="inline-flex items-center justify-center h-12 px-10 text-base font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all shadow-lg shadow-orange-500/30"
            >
              {isLoggedIn ? "В Dashboard" : "Войти"}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-slate-900 dark:bg-slate-950 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-white font-semibold">Prometheus</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Skill Assessment Platform
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Часть экосистемы спутников Сатурна
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
