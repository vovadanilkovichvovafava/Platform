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

    // Particles system
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
      color: string
    }> = []

    // Create particles
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        color: Math.random() > 0.7 ? "#FFA500" : "#FFFFFF",
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle =
          p.color === "#FFFFFF"
            ? `rgba(255, 255, 255, ${p.opacity})`
            : `rgba(255, 165, 0, ${p.opacity})`
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
      {/* Canvas for particles */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-transparent to-purple-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#070714] to-transparent pointer-events-none" />

      {/* Main orb / Prometheus spark */}
      <div className="absolute right-[10%] top-1/2 -translate-y-1/2 pointer-events-none">
        {/* Outer glow rings */}
        <div className="relative">
          {/* Ring 3 - outermost */}
          <div className="absolute -inset-32 rounded-full border border-orange-500/10 animate-[spin_60s_linear_infinite]" />
          <div className="absolute -inset-24 rounded-full border border-orange-500/15 animate-[spin_45s_linear_infinite_reverse]" />
          <div className="absolute -inset-16 rounded-full border border-orange-500/20 animate-[spin_30s_linear_infinite]" />

          {/* Core orb */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96">
            {/* Outer glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500/40 via-amber-400/30 to-yellow-300/20 blur-3xl" />

            {/* Middle layer */}
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-orange-400/60 via-amber-400/50 to-yellow-400/40 blur-2xl" />

            {/* Inner core */}
            <div className="absolute inset-16 rounded-full bg-gradient-to-br from-orange-300 via-amber-200 to-yellow-100 blur-xl" />

            {/* Bright center */}
            <div className="absolute inset-24 rounded-full bg-gradient-to-br from-white via-yellow-100 to-amber-200 blur-md" />

            {/* Hottest point */}
            <div className="absolute inset-28 rounded-full bg-white/90 blur-sm" />

            {/* Saturn-style rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[30%]">
              <div className="absolute inset-0 rounded-full border-2 border-orange-400/30 transform -rotate-12"
                   style={{ boxShadow: "0 0 20px rgba(251, 146, 60, 0.3)" }} />
              <div className="absolute inset-2 rounded-full border border-amber-300/20 transform -rotate-12" />
              <div className="absolute inset-4 rounded-full border border-yellow-200/10 transform -rotate-12" />
            </div>

            {/* Floating particles around orb */}
            <div className="absolute -top-4 left-1/4 w-2 h-2 rounded-full bg-orange-400 animate-float-slow" />
            <div className="absolute top-1/4 -right-4 w-1.5 h-1.5 rounded-full bg-amber-300 animate-float-medium" />
            <div className="absolute -bottom-2 right-1/4 w-2 h-2 rounded-full bg-yellow-300 animate-float-fast" />
            <div className="absolute bottom-1/4 -left-4 w-1 h-1 rounded-full bg-orange-300 animate-float-medium" />
          </div>
        </div>
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
            <span className="text-white/40">|</span>
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
    </section>
  )
}
