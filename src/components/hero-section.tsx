import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden hero-gradient">
      {/* SVG Background - Mountains and Sun */}
      <div className="absolute inset-0 pointer-events-none">
        <svg
          className="absolute bottom-0 left-0 w-full h-auto"
          viewBox="0 0 1440 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMax slice"
        >
          {/* Sun */}
          <circle cx="1200" cy="80" r="60" fill="#FFC107" fillOpacity="0.3" />
          <circle cx="1200" cy="80" r="45" fill="#FFC107" fillOpacity="0.5" />
          <circle cx="1200" cy="80" r="30" fill="#FFC107" fillOpacity="0.8" />

          {/* Clouds */}
          <ellipse cx="200" cy="100" rx="80" ry="30" fill="#E8F4FD" />
          <ellipse cx="260" cy="95" rx="60" ry="25" fill="#E8F4FD" />
          <ellipse cx="900" cy="120" rx="70" ry="25" fill="#E8F4FD" />
          <ellipse cx="950" cy="115" rx="50" ry="20" fill="#E8F4FD" />

          {/* Back Mountains */}
          <path
            d="M0 400L200 220L350 300L500 180L650 280L800 150L950 250L1100 120L1250 200L1440 100V400H0Z"
            fill="#C5D9E8"
            fillOpacity="0.5"
          />

          {/* Middle Mountains */}
          <path
            d="M0 400L150 280L300 350L450 240L600 320L750 200L900 300L1050 180L1200 260L1350 200L1440 280V400H0Z"
            fill="#9FC5E0"
            fillOpacity="0.6"
          />

          {/* Front Mountains */}
          <path
            d="M0 400L100 340L250 380L400 300L550 360L700 280L850 340L1000 260L1150 320L1300 280L1440 340V400H0Z"
            fill="#6BA4C9"
            fillOpacity="0.7"
          />

          {/* Trees on hills */}
          <g fill="#2E7D4A" fillOpacity="0.8">
            <path d="M100 380L110 350L120 380Z" />
            <path d="M130 375L140 345L150 375Z" />
            <path d="M160 380L170 355L180 380Z" />
            <path d="M300 360L315 320L330 360Z" />
            <path d="M340 355L355 320L370 355Z" />
            <path d="M500 340L520 290L540 340Z" />
            <path d="M560 345L575 305L590 345Z" />
            <path d="M800 320L820 270L840 320Z" />
            <path d="M860 330L875 290L890 330Z" />
            <path d="M1100 340L1120 290L1140 340Z" />
            <path d="M1150 350L1165 310L1180 350Z" />
          </g>

          {/* Ground */}
          <path
            d="M0 400L0 380C200 370 400 385 600 375C800 365 1000 380 1200 370C1320 365 1400 375 1440 380V400H0Z"
            fill="#4CAF50"
            fillOpacity="0.3"
          />
        </svg>
      </div>

      <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Научись создавать
            <br />
            <span className="text-gradient">продукты будущего</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl">
            Освой Vibe Coding, маркетинг, UI дизайн и R&D.
            Практические проекты, менторство и сертификаты.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              size="lg"
              className="bg-[#0176D3] hover:bg-[#014486] text-lg px-8"
            >
              <Link href="/register">Начать обучение</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg px-8 border-gray-300"
            >
              <Link href="/trails">Смотреть trails</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
