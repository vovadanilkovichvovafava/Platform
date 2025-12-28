"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useEffect, useRef } from "react"

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Stars
    const stars: Array<{ x: number; y: number; size: number; opacity: number; speed: number }> = []
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.02 + 0.01,
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      stars.forEach((star) => {
        star.opacity += Math.sin(Date.now() * star.speed) * 0.01
        star.opacity = Math.max(0.1, Math.min(1, star.opacity))

        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
        ctx.fill()
      })

      requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#070714]">
      {/* Canvas for stars */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-900/10 via-transparent to-purple-900/5 pointer-events-none" />

      {/* Saturn */}
      <div className="absolute right-[5%] lg:right-[10%] top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className="w-[400px] h-[400px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px]"
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Saturn body gradient */}
            <radialGradient id="saturnBody" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#F5D89A" />
              <stop offset="40%" stopColor="#E8C370" />
              <stop offset="70%" stopColor="#D4A84A" />
              <stop offset="100%" stopColor="#B8863A" />
            </radialGradient>

            {/* Saturn shadow */}
            <radialGradient id="saturnShadow" cx="70%" cy="60%" r="50%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="60%" stopColor="rgba(0,0,0,0.3)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
            </radialGradient>

            {/* Outer glow */}
            <radialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F5D89A" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#E8C370" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#E8C370" stopOpacity="0" />
            </radialGradient>

            {/* Ring gradients */}
            <linearGradient id="ringGradient1" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#C9B896" stopOpacity="0" />
              <stop offset="15%" stopColor="#D4C4A0" stopOpacity="0.7" />
              <stop offset="35%" stopColor="#E8D6B0" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#F0E0C0" stopOpacity="1" />
              <stop offset="65%" stopColor="#E8D6B0" stopOpacity="0.9" />
              <stop offset="85%" stopColor="#D4C4A0" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#C9B896" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="ringGradient2" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#A89070" stopOpacity="0" />
              <stop offset="20%" stopColor="#C0A880" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#D8C090" stopOpacity="0.7" />
              <stop offset="80%" stopColor="#C0A880" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#A89070" stopOpacity="0" />
            </linearGradient>

            {/* Clip path for ring behind planet */}
            <clipPath id="ringBehind">
              <rect x="0" y="0" width="500" height="250" />
            </clipPath>

            {/* Clip path for ring in front of planet */}
            <clipPath id="ringFront">
              <rect x="0" y="250" width="500" height="250" />
            </clipPath>

            {/* Filter for subtle glow */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer glow */}
          <circle cx="250" cy="250" r="200" fill="url(#outerGlow)" />

          {/* Ring behind planet */}
          <g clipPath="url(#ringBehind)" opacity="0.6">
            <ellipse
              cx="250"
              cy="250"
              rx="220"
              ry="50"
              fill="none"
              stroke="url(#ringGradient1)"
              strokeWidth="35"
              transform="rotate(-20, 250, 250)"
            />
            <ellipse
              cx="250"
              cy="250"
              rx="180"
              ry="40"
              fill="none"
              stroke="url(#ringGradient2)"
              strokeWidth="15"
              transform="rotate(-20, 250, 250)"
            />
          </g>

          {/* Saturn body */}
          <circle cx="250" cy="250" r="100" fill="url(#saturnBody)" />

          {/* Saturn bands */}
          <ellipse cx="250" cy="225" rx="95" ry="10" fill="#C4923D" opacity="0.25" />
          <ellipse cx="250" cy="240" rx="98" ry="8" fill="#E8D6B0" opacity="0.15" />
          <ellipse cx="250" cy="255" rx="99" ry="6" fill="#B88A3A" opacity="0.2" />
          <ellipse cx="250" cy="270" rx="96" ry="9" fill="#D4A84A" opacity="0.2" />
          <ellipse cx="250" cy="285" rx="90" ry="7" fill="#C4923D" opacity="0.15" />

          {/* Saturn shadow */}
          <circle cx="250" cy="250" r="100" fill="url(#saturnShadow)" />

          {/* Ring in front of planet */}
          <g clipPath="url(#ringFront)" filter="url(#glow)">
            <ellipse
              cx="250"
              cy="250"
              rx="220"
              ry="50"
              fill="none"
              stroke="url(#ringGradient1)"
              strokeWidth="35"
              transform="rotate(-20, 250, 250)"
            />
            <ellipse
              cx="250"
              cy="250"
              rx="180"
              ry="40"
              fill="none"
              stroke="url(#ringGradient2)"
              strokeWidth="15"
              transform="rotate(-20, 250, 250)"
            />
            {/* Ring detail lines */}
            <ellipse
              cx="250"
              cy="250"
              rx="200"
              ry="45"
              fill="none"
              stroke="#F0E8D8"
              strokeWidth="1"
              opacity="0.4"
              transform="rotate(-20, 250, 250)"
            />
            <ellipse
              cx="250"
              cy="250"
              rx="160"
              ry="36"
              fill="none"
              stroke="#F0E8D8"
              strokeWidth="1"
              opacity="0.3"
              transform="rotate(-20, 250, 250)"
            />
          </g>

          {/* Small highlight on planet */}
          <circle cx="220" cy="220" r="30" fill="white" opacity="0.1" />
        </svg>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 mb-10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            <span className="text-white/80 text-sm font-medium tracking-wide">
              PROMETHEUS
            </span>
            <span className="text-white/30">|</span>
            <span className="text-orange-400/80 text-sm">
              Skill Assessment
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
            Докажи свой
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
              уровень
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-white/60 mb-10 leading-relaxed max-w-xl">
            Платформа оценки навыков через реальные проекты.
            <span className="text-white/80"> Vibe Coding, маркетинг, UI дизайн, R&D.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              size="lg"
              className="h-14 px-8 text-base font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 shadow-xl shadow-orange-500/20"
            >
              <Link href="/register">Начать оценку</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-semibold bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 backdrop-blur-sm"
            >
              <Link href="/trails">Выбрать направление</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-12 mt-16 pt-8 border-t border-white/10">
            <div>
              <div className="text-3xl font-bold text-white">4</div>
              <div className="text-sm text-white/40 mt-1">направления</div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div>
              <div className="text-3xl font-bold text-white">3</div>
              <div className="text-sm text-white/40 mt-1">уровня задач</div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Pro</div>
              <div className="text-sm text-white/40 mt-1">оценка</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#070714] to-transparent pointer-events-none" />
    </section>
  )
}
