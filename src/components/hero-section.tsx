"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

function Star({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full bg-white animate-pulse"
      style={style}
    />
  )
}

export function HeroSection() {
  const [stars, setStars] = useState<Array<{ id: number; style: React.CSSProperties }>>([])

  useEffect(() => {
    const generatedStars = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      style: {
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        width: `${Math.random() * 2 + 1}px`,
        height: `${Math.random() * 2 + 1}px`,
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${Math.random() * 2 + 2}s`,
        opacity: Math.random() * 0.7 + 0.3,
      },
    }))
    setStars(generatedStars)
  }, [])

  return (
    <section className="relative overflow-hidden bg-[#0a0a1a] min-h-[90vh] flex items-center">
      {/* Stars Background */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((star) => (
          <Star key={star.id} style={star.style} />
        ))}
      </div>

      {/* Cosmic Glow Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/15 rounded-full blur-[80px]" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-[60px]" />
      </div>

      {/* Saturn SVG */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-80">
        <svg
          className="w-[500px] h-[500px] md:w-[700px] md:h-[700px] lg:w-[900px] lg:h-[900px] translate-x-1/3"
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Saturn Glow */}
          <defs>
            <radialGradient id="saturnGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F4A460" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#F4A460" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="saturnBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E8B86D" />
              <stop offset="30%" stopColor="#D4A254" />
              <stop offset="70%" stopColor="#C4923D" />
              <stop offset="100%" stopColor="#A67C3D" />
            </linearGradient>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C9A86C" stopOpacity="0.1" />
              <stop offset="20%" stopColor="#E8C88B" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#D4B87A" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#E8C88B" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#C9A86C" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Outer Glow */}
          <circle cx="200" cy="200" r="180" fill="url(#saturnGlow)" />

          {/* Back Ring (behind planet) */}
          <ellipse
            cx="200"
            cy="200"
            rx="170"
            ry="40"
            stroke="url(#ringGradient)"
            strokeWidth="25"
            fill="none"
            opacity="0.4"
            transform="rotate(-15, 200, 200)"
            strokeDasharray="0 180 340 0"
          />

          {/* Saturn Body */}
          <circle cx="200" cy="200" r="80" fill="url(#saturnBody)" />

          {/* Saturn Bands */}
          <ellipse cx="200" cy="180" rx="75" ry="8" fill="#C4923D" opacity="0.4" />
          <ellipse cx="200" cy="195" rx="78" ry="6" fill="#E8C88B" opacity="0.3" />
          <ellipse cx="200" cy="210" rx="76" ry="7" fill="#A67C3D" opacity="0.3" />
          <ellipse cx="200" cy="225" rx="70" ry="5" fill="#C4923D" opacity="0.4" />

          {/* Front Ring (in front of planet) */}
          <ellipse
            cx="200"
            cy="200"
            rx="170"
            ry="40"
            stroke="url(#ringGradient)"
            strokeWidth="25"
            fill="none"
            opacity="0.7"
            transform="rotate(-15, 200, 200)"
            strokeDasharray="340 0 0 180"
          />

          {/* Inner Ring */}
          <ellipse
            cx="200"
            cy="200"
            rx="130"
            ry="30"
            stroke="#D4A254"
            strokeWidth="8"
            fill="none"
            opacity="0.5"
            transform="rotate(-15, 200, 200)"
          />

          {/* Ring Shine */}
          <ellipse
            cx="200"
            cy="200"
            rx="150"
            ry="35"
            stroke="#FFF8DC"
            strokeWidth="2"
            fill="none"
            opacity="0.3"
            transform="rotate(-15, 200, 200)"
          />
        </svg>
      </div>

      {/* Skill Tree / Cosmic Tree */}
      <div className="absolute left-10 bottom-10 pointer-events-none opacity-60 hidden lg:block">
        <svg
          className="w-48 h-64"
          viewBox="0 0 120 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Tree Trunk - cosmic energy */}
          <path
            d="M60 160 L60 100 Q55 80 60 60 Q65 40 60 20"
            stroke="url(#treeTrunk)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />

          {/* Branches */}
          <path d="M60 90 Q40 75 25 80" stroke="#8B5CF6" strokeWidth="2" fill="none" opacity="0.7" />
          <path d="M60 90 Q80 75 95 80" stroke="#8B5CF6" strokeWidth="2" fill="none" opacity="0.7" />
          <path d="M60 65 Q35 50 20 55" stroke="#A78BFA" strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M60 65 Q85 50 100 55" stroke="#A78BFA" strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M60 40 Q45 25 35 30" stroke="#C4B5FD" strokeWidth="2" fill="none" opacity="0.5" />
          <path d="M60 40 Q75 25 85 30" stroke="#C4B5FD" strokeWidth="2" fill="none" opacity="0.5" />

          {/* Skill Nodes - like stars/orbs */}
          <circle cx="25" cy="80" r="6" fill="#F59E0B" opacity="0.9" />
          <circle cx="95" cy="80" r="6" fill="#F59E0B" opacity="0.9" />
          <circle cx="20" cy="55" r="5" fill="#EC4899" opacity="0.8" />
          <circle cx="100" cy="55" r="5" fill="#EC4899" opacity="0.8" />
          <circle cx="35" cy="30" r="4" fill="#06B6D4" opacity="0.7" />
          <circle cx="85" cy="30" r="4" fill="#06B6D4" opacity="0.7" />
          <circle cx="60" cy="15" r="8" fill="#FBBF24" opacity="1">
            <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
          </circle>

          <defs>
            <linearGradient id="treeTrunk" x1="60" y1="160" x2="60" y2="20">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#C4B5FD" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-3xl">
          {/* Logo Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-orange-300 text-sm font-medium tracking-wide">
              TITAN — Skill Assessment Platform
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Открой свой
            <br />
            <span className="titan-gradient">потенциал</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl leading-relaxed">
            Проверь навыки в Vibe Coding, маркетинге, UI дизайне и R&D.
            <br />
            <span className="text-orange-300">Реальные проекты. Экспертная оценка. Рост уровня.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-lg px-8 shadow-lg shadow-orange-500/25"
            >
              <Link href="/register">Начать оценку</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg px-8 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
            >
              <Link href="/trails">Смотреть trails</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-12 pt-8 border-t border-white/10">
            <div>
              <div className="text-2xl font-bold text-white">4</div>
              <div className="text-sm text-gray-400">Направления</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">3</div>
              <div className="text-sm text-gray-400">Уровня задач</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">∞</div>
              <div className="text-sm text-gray-400">Возможностей</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a1a] to-transparent pointer-events-none" />
    </section>
  )
}
