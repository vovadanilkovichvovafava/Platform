"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-b from-slate-50 to-white">
      {/* Cosmic Background Illustration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Stars scattered across the background */}
        <div className="absolute inset-0">
          {/* Static stars as simple dots */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10%" cy="20%" r="1" fill="#94a3b8" opacity="0.4" />
            <circle cx="15%" cy="35%" r="1.5" fill="#94a3b8" opacity="0.3" />
            <circle cx="20%" cy="15%" r="1" fill="#94a3b8" opacity="0.5" />
            <circle cx="25%" cy="45%" r="1.2" fill="#94a3b8" opacity="0.3" />
            <circle cx="30%" cy="25%" r="1" fill="#94a3b8" opacity="0.4" />
            <circle cx="35%" cy="55%" r="1.5" fill="#94a3b8" opacity="0.25" />
            <circle cx="40%" cy="12%" r="1" fill="#94a3b8" opacity="0.4" />
            <circle cx="45%" cy="40%" r="1.2" fill="#94a3b8" opacity="0.3" />
            <circle cx="50%" cy="8%" r="1.5" fill="#94a3b8" opacity="0.35" />
            <circle cx="55%" cy="30%" r="1" fill="#94a3b8" opacity="0.4" />
            <circle cx="60%" cy="18%" r="1.3" fill="#94a3b8" opacity="0.3" />
            <circle cx="65%" cy="50%" r="1" fill="#94a3b8" opacity="0.35" />
            <circle cx="70%" cy="10%" r="1.5" fill="#94a3b8" opacity="0.4" />
            <circle cx="75%" cy="35%" r="1" fill="#94a3b8" opacity="0.3" />
            <circle cx="80%" cy="22%" r="1.2" fill="#94a3b8" opacity="0.35" />
            <circle cx="85%" cy="45%" r="1" fill="#94a3b8" opacity="0.4" />
            <circle cx="90%" cy="15%" r="1.5" fill="#94a3b8" opacity="0.3" />
            <circle cx="95%" cy="38%" r="1" fill="#94a3b8" opacity="0.35" />
          </svg>
        </div>

        {/* Cosmic gradient at the bottom (like hills in the original) */}
        <div className="absolute bottom-0 left-0 right-0 h-[45%]">
          {/* Deep space gradient base */}
          <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1440 400" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="spaceGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="spaceGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#334155" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#1e293b" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="spaceGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#475569" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#334155" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Back layer - darkest */}
            <path d="M0,100 Q200,50 400,120 T800,80 T1200,130 T1440,90 L1440,400 L0,400 Z" fill="url(#spaceGrad1)" />

            {/* Middle layer */}
            <path d="M0,180 Q250,130 500,200 T1000,160 T1440,190 L1440,400 L0,400 Z" fill="url(#spaceGrad2)" />

            {/* Front layer - lightest */}
            <path d="M0,260 Q300,220 600,280 T1200,250 T1440,270 L1440,400 L0,400 Z" fill="url(#spaceGrad3)" />

            {/* Tiny stars in the cosmic hills */}
            <circle cx="100" cy="300" r="1.5" fill="#e2e8f0" opacity="0.6" />
            <circle cx="250" cy="250" r="1" fill="#e2e8f0" opacity="0.5" />
            <circle cx="400" cy="320" r="1.5" fill="#e2e8f0" opacity="0.4" />
            <circle cx="550" cy="280" r="1" fill="#e2e8f0" opacity="0.5" />
            <circle cx="700" cy="310" r="1.2" fill="#e2e8f0" opacity="0.6" />
            <circle cx="850" cy="260" r="1" fill="#e2e8f0" opacity="0.5" />
            <circle cx="1000" cy="300" r="1.5" fill="#e2e8f0" opacity="0.4" />
            <circle cx="1150" cy="270" r="1" fill="#e2e8f0" opacity="0.5" />
            <circle cx="1300" cy="290" r="1.2" fill="#e2e8f0" opacity="0.6" />
          </svg>
        </div>

        {/* Saturn Planet */}
        <div className="absolute right-[5%] lg:right-[12%] top-[15%] lg:top-[20%]">
          <svg
            className="w-[200px] h-[200px] md:w-[280px] md:h-[280px] lg:w-[350px] lg:h-[350px]"
            viewBox="0 0 350 350"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Saturn body gradient - warm golden */}
              <radialGradient id="saturnBodyLight" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="40%" stopColor="#f59e0b" />
                <stop offset="70%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#b45309" />
              </radialGradient>

              {/* Saturn shadow */}
              <radialGradient id="saturnShadowLight" cx="70%" cy="65%" r="45%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="60%" stopColor="rgba(146,64,14,0.2)" />
                <stop offset="100%" stopColor="rgba(120,53,15,0.4)" />
              </radialGradient>

              {/* Outer glow */}
              <radialGradient id="outerGlowLight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>

              {/* Ring gradient */}
              <linearGradient id="ringGradLight" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#d4a574" stopOpacity="0" />
                <stop offset="15%" stopColor="#e8c9a0" stopOpacity="0.6" />
                <stop offset="35%" stopColor="#f5dfc0" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#fef3e2" stopOpacity="0.9" />
                <stop offset="65%" stopColor="#f5dfc0" stopOpacity="0.8" />
                <stop offset="85%" stopColor="#e8c9a0" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#d4a574" stopOpacity="0" />
              </linearGradient>

              {/* Clip paths for 3D ring effect */}
              <clipPath id="ringBehindLight">
                <rect x="0" y="0" width="350" height="175" />
              </clipPath>
              <clipPath id="ringFrontLight">
                <rect x="0" y="175" width="350" height="175" />
              </clipPath>
            </defs>

            {/* Outer glow */}
            <circle cx="175" cy="175" r="140" fill="url(#outerGlowLight)" />

            {/* Ring behind planet */}
            <g clipPath="url(#ringBehindLight)" opacity="0.5">
              <ellipse
                cx="175"
                cy="175"
                rx="155"
                ry="35"
                fill="none"
                stroke="url(#ringGradLight)"
                strokeWidth="25"
                transform="rotate(-15, 175, 175)"
              />
            </g>

            {/* Saturn body */}
            <circle cx="175" cy="175" r="70" fill="url(#saturnBodyLight)" />

            {/* Saturn bands */}
            <ellipse cx="175" cy="158" rx="66" ry="7" fill="#ca8a04" opacity="0.2" />
            <ellipse cx="175" cy="170" rx="68" ry="5" fill="#fef3c7" opacity="0.15" />
            <ellipse cx="175" cy="182" rx="69" ry="4" fill="#a16207" opacity="0.15" />
            <ellipse cx="175" cy="192" rx="65" ry="6" fill="#ca8a04" opacity="0.2" />

            {/* Saturn shadow overlay */}
            <circle cx="175" cy="175" r="70" fill="url(#saturnShadowLight)" />

            {/* Ring in front of planet */}
            <g clipPath="url(#ringFrontLight)">
              <ellipse
                cx="175"
                cy="175"
                rx="155"
                ry="35"
                fill="none"
                stroke="url(#ringGradLight)"
                strokeWidth="25"
                transform="rotate(-15, 175, 175)"
              />
              {/* Inner ring detail */}
              <ellipse
                cx="175"
                cy="175"
                rx="130"
                ry="29"
                fill="none"
                stroke="#fef3e2"
                strokeWidth="1"
                opacity="0.4"
                transform="rotate(-15, 175, 175)"
              />
            </g>

            {/* Small highlight */}
            <circle cx="155" cy="155" r="20" fill="white" opacity="0.15" />
          </svg>
        </div>

        {/* Small decorative planets/moons */}
        <div className="absolute left-[8%] top-[25%] w-3 h-3 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 opacity-60" />
        <div className="absolute left-[15%] top-[60%] w-2 h-2 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 opacity-50" />
        <div className="absolute right-[25%] top-[70%] w-2.5 h-2.5 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 opacity-40" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-4 leading-[1.1] tracking-tight">
            Научись создавать
            <br />
            <span className="text-orange-500">
              продукты будущего
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-xl">
            Освой Vibe Coding, маркетинг, UI дизайн и R&D. Практические проекты,
            менторство и сертификаты.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              size="lg"
              className="h-12 px-8 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20"
            >
              <Link href="/register">Начать обучение</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base font-semibold border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
            >
              <Link href="/trails">Смотреть trails</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
