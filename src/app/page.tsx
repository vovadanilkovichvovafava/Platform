import { HeroSection } from "@/components/hero-section"
import { TrailCard } from "@/components/trail-card"
import { prisma } from "@/lib/prisma"
import { Users, Award, Zap } from "lucide-react"

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
    <div className="min-h-screen">
      <HeroSection />

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Почему R&D Academy?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Практико-ориентированное обучение с реальными проектами
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-50 mb-4">
                <Zap className="h-7 w-7 text-[#0176D3]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Практические проекты
              </h3>
              <p className="text-gray-600">
                Создавайте реальные продукты, а не просто изучайте теорию
              </p>
            </div>

            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-green-50 mb-4">
                <Users className="h-7 w-7 text-[#2E844A]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Менторство
              </h3>
              <p className="text-gray-600">
                Получайте обратную связь от опытных специалистов
              </p>
            </div>

            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-orange-50 mb-4">
                <Award className="h-7 w-7 text-[#FE9339]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Сертификаты
              </h3>
              <p className="text-gray-600">
                Подтверждайте навыки официальными сертификатами
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trails Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Выберите свой путь
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              4 направления обучения для создания продуктов будущего
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {trails.map((trail) => (
              <TrailCard key={trail.id} trail={trail} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#0176D3]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Готовы начать?
          </h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Присоединяйтесь к сообществу создателей и начните свой путь уже сегодня
          </p>
          <a
            href="/register"
            className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-[#0176D3] bg-white rounded-lg hover:bg-gray-100 transition-colors"
          >
            Создать аккаунт
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900 text-gray-400">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            R&D Academy - Обучающая платформа
          </p>
        </div>
      </footer>
    </div>
  )
}
