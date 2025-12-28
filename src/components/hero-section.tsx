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

function Spark({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full animate-float"
      style={style}
    />
  )
}

export function HeroSection() {
  const [stars, setStars] = useState<Array<{ id: number; style: React.CSSProperties }>>([])
  const [sparks, setSparks] = useState<Array<{ id: number; style: React.CSSProperties }>>([])

  useEffect(() => {
    // Generate stars
    const generatedStars = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      style: {
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        width: `${Math.random() * 2 + 1}px`,
        height: `${Math.random() * 2 + 1}px`,
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${Math.random() * 2 + 2}s`,
        opacity: Math.random() * 0.5 + 0.2,
      },
    }))
    setStars(generatedStars)

    // Generate fire sparks
    const generatedSparks = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      style: {
        left: `${30 + Math.random() * 40}%`,
        bottom: `${Math.random() * 30}%`,
        width: `${Math.random() * 4 + 2}px`,
        height: `${Math.random() * 4 + 2}px`,
        background: `radial-gradient(circle, ${
          Math.random() > 0.5 ? '#FFA500' : '#FF6B00'
        } 0%, transparent 70%)`,
        animationDelay: `${Math.random() * 2}s`,
        animationDuration: `${Math.random() * 3 + 2}s`,
      },
    }))
    setSparks(generatedSparks)
  }, [])

  return (
    <section className="relative overflow-hidden bg-[#0a0a1a] min-h-[90vh] flex items-center">
      {/* Stars Background */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((star) => (
          <Star key={star.id} style={star.style} />
        ))}
      </div>

      {/* Fire Sparks */}
      <div className="absolute inset-0 pointer-events-none">
        {sparks.map((spark) => (
          <Spark key={spark.id} style={spark.style} />
        ))}
      </div>

      {/* Cosmic Glow Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-amber-500/15 rounded-full blur-[80px]" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-[60px]" />
      </div>

      {/* Prometheus Fire/Torch SVG */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-90">
        <svg
          className="w-[500px] h-[600px] md:w-[600px] md:h-[700px] lg:w-[700px] lg:h-[800px] translate-x-1/4"
          viewBox="0 0 400 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Fire gradients */}
            <linearGradient id="fireOuter" x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#FF4500" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#FF6B00" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FFA500" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="fireMiddle" x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#FF6B00" />
              <stop offset="60%" stopColor="#FFA500" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="fireInner" x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#FFA500" />
              <stop offset="50%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#FFFACD" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="fireCore" x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.8" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="fireGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="15" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Saturn ring gradient */}
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.1" />
              <stop offset="20%" stopColor="#FFA500" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#FFD700" stopOpacity="0.6" />
              <stop offset="80%" stopColor="#FFA500" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FF6B00" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Orbital rings (Saturn reference) */}
          <ellipse
            cx="200"
            cy="280"
            rx="180"
            ry="45"
            stroke="url(#ringGradient)"
            strokeWidth="2"
            fill="none"
            opacity="0.3"
            transform="rotate(-10, 200, 280)"
          />
          <ellipse
            cx="200"
            cy="280"
            rx="150"
            ry="35"
            stroke="url(#ringGradient)"
            strokeWidth="1.5"
            fill="none"
            opacity="0.2"
            transform="rotate(-10, 200, 280)"
          />
          <ellipse
            cx="200"
            cy="280"
            rx="120"
            ry="28"
            stroke="url(#ringGradient)"
            strokeWidth="1"
            fill="none"
            opacity="0.15"
            transform="rotate(-10, 200, 280)"
          />

          {/* Outer flame */}
          <path
            d="M200 380
               Q140 320 160 250
               Q170 200 200 150
               Q210 100 200 50
               Q230 100 240 150
               Q270 200 280 250
               Q300 320 200 380"
            fill="url(#fireOuter)"
            filter="url(#fireGlow)"
            opacity="0.7"
          >
            <animate
              attributeName="d"
              dur="2s"
              repeatCount="indefinite"
              values="
                M200 380 Q140 320 160 250 Q170 200 200 150 Q210 100 200 50 Q230 100 240 150 Q270 200 280 250 Q300 320 200 380;
                M200 380 Q150 310 165 245 Q175 195 200 140 Q215 95 200 45 Q225 95 235 140 Q265 195 275 245 Q290 310 200 380;
                M200 380 Q140 320 160 250 Q170 200 200 150 Q210 100 200 50 Q230 100 240 150 Q270 200 280 250 Q300 320 200 380
              "
            />
          </path>

          {/* Middle flame */}
          <path
            d="M200 370
               Q155 310 170 250
               Q180 210 200 170
               Q210 130 200 80
               Q220 130 230 170
               Q250 210 260 250
               Q275 310 200 370"
            fill="url(#fireMiddle)"
            filter="url(#fireGlow)"
          >
            <animate
              attributeName="d"
              dur="1.5s"
              repeatCount="indefinite"
              values="
                M200 370 Q155 310 170 250 Q180 210 200 170 Q210 130 200 80 Q220 130 230 170 Q250 210 260 250 Q275 310 200 370;
                M200 370 Q160 305 175 245 Q185 205 200 160 Q215 125 200 75 Q215 125 225 160 Q245 205 255 245 Q270 305 200 370;
                M200 370 Q155 310 170 250 Q180 210 200 170 Q210 130 200 80 Q220 130 230 170 Q250 210 260 250 Q275 310 200 370
              "
            />
          </path>

          {/* Inner flame */}
          <path
            d="M200 360
               Q165 310 180 260
               Q188 225 200 190
               Q208 160 200 120
               Q212 160 220 190
               Q232 225 240 260
               Q255 310 200 360"
            fill="url(#fireInner)"
          >
            <animate
              attributeName="d"
              dur="1s"
              repeatCount="indefinite"
              values="
                M200 360 Q165 310 180 260 Q188 225 200 190 Q208 160 200 120 Q212 160 220 190 Q232 225 240 260 Q255 310 200 360;
                M200 360 Q170 305 182 255 Q190 220 200 185 Q210 155 200 115 Q210 155 218 185 Q228 220 238 255 Q250 305 200 360;
                M200 360 Q165 310 180 260 Q188 225 200 190 Q208 160 200 120 Q212 160 220 190 Q232 225 240 260 Q255 310 200 360
              "
            />
          </path>

          {/* Core flame */}
          <path
            d="M200 350
               Q178 315 188 275
               Q194 250 200 220
               Q206 195 200 160
               Q210 195 215 220
               Q222 250 228 275
               Q238 315 200 350"
            fill="url(#fireCore)"
          >
            <animate
              attributeName="d"
              dur="0.8s"
              repeatCount="indefinite"
              values="
                M200 350 Q178 315 188 275 Q194 250 200 220 Q206 195 200 160 Q210 195 215 220 Q222 250 228 275 Q238 315 200 350;
                M200 350 Q180 312 190 272 Q196 248 200 215 Q208 192 200 155 Q208 192 213 215 Q220 248 226 272 Q236 312 200 350;
                M200 350 Q178 315 188 275 Q194 250 200 220 Q206 195 200 160 Q210 195 215 220 Q222 250 228 275 Q238 315 200 350
              "
            />
          </path>

          {/* Torch base */}
          <rect x="190" y="380" width="20" height="80" rx="3" fill="#4A3728" />
          <rect x="185" y="375" width="30" height="10" rx="2" fill="#5D4632" />

          {/* Small sparks */}
          <circle cx="180" cy="200" r="2" fill="#FFD700" opacity="0.8">
            <animate attributeName="cy" dur="1s" values="200;180;200" repeatCount="indefinite" />
            <animate attributeName="opacity" dur="1s" values="0.8;0;0.8" repeatCount="indefinite" />
          </circle>
          <circle cx="220" cy="180" r="1.5" fill="#FFA500" opacity="0.6">
            <animate attributeName="cy" dur="1.2s" values="180;155;180" repeatCount="indefinite" />
            <animate attributeName="opacity" dur="1.2s" values="0.6;0;0.6" repeatCount="indefinite" />
          </circle>
          <circle cx="200" cy="140" r="2" fill="#FFD700" opacity="0.7">
            <animate attributeName="cy" dur="0.9s" values="140;110;140" repeatCount="indefinite" />
            <animate attributeName="opacity" dur="0.9s" values="0.7;0;0.7" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>

      {/* Skill Tree / Knowledge Tree */}
      <div className="absolute left-10 bottom-10 pointer-events-none opacity-50 hidden lg:block">
        <svg
          className="w-48 h-64"
          viewBox="0 0 120 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Tree Trunk - fiery energy */}
          <path
            d="M60 160 L60 100 Q55 80 60 60 Q65 40 60 20"
            stroke="url(#treeTrunkFire)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />

          {/* Branches */}
          <path d="M60 90 Q40 75 25 80" stroke="#FF6B00" strokeWidth="2" fill="none" opacity="0.7" />
          <path d="M60 90 Q80 75 95 80" stroke="#FF6B00" strokeWidth="2" fill="none" opacity="0.7" />
          <path d="M60 65 Q35 50 20 55" stroke="#FFA500" strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M60 65 Q85 50 100 55" stroke="#FFA500" strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M60 40 Q45 25 35 30" stroke="#FFD700" strokeWidth="2" fill="none" opacity="0.5" />
          <path d="M60 40 Q75 25 85 30" stroke="#FFD700" strokeWidth="2" fill="none" opacity="0.5" />

          {/* Skill Nodes - like flames/orbs */}
          <circle cx="25" cy="80" r="6" fill="#FF6B00" opacity="0.9">
            <animate attributeName="r" values="6;7;6" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="95" cy="80" r="6" fill="#FF6B00" opacity="0.9">
            <animate attributeName="r" values="6;7;6" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="20" cy="55" r="5" fill="#FFA500" opacity="0.8">
            <animate attributeName="r" values="5;6;5" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="100" cy="55" r="5" fill="#FFA500" opacity="0.8">
            <animate attributeName="r" values="5;6;5" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="35" cy="30" r="4" fill="#FFD700" opacity="0.7">
            <animate attributeName="r" values="4;5;4" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="85" cy="30" r="4" fill="#FFD700" opacity="0.7">
            <animate attributeName="r" values="4;5;4" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="60" cy="15" r="8" fill="#FFFFFF" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.5;0.9" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="r" values="8;10;8" dur="1.5s" repeatCount="indefinite" />
          </circle>

          <defs>
            <linearGradient id="treeTrunkFire" x1="60" y1="160" x2="60" y2="20">
              <stop offset="0%" stopColor="#8B4513" />
              <stop offset="30%" stopColor="#FF6B00" />
              <stop offset="70%" stopColor="#FFA500" />
              <stop offset="100%" stopColor="#FFD700" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-3xl">
          {/* Logo Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 backdrop-blur-sm border border-orange-500/30 mb-8">
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-orange-300 text-sm font-medium tracking-wide">
              PROMETHEUS — Несущий знания
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Зажги свой
            <br />
            <span className="prometheus-gradient">потенциал</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl leading-relaxed">
            Докажи навыки в Vibe Coding, маркетинге, UI дизайне и R&D.
            <br />
            <span className="text-orange-300">Реальные проекты. Огонь знаний. Путь к вершине.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-600 hover:via-amber-600 hover:to-yellow-600 text-white text-lg px-8 shadow-lg shadow-orange-500/30 fire-button"
            >
              <Link href="/register">Зажечь огонь</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg px-8 border-orange-500/30 text-orange-100 hover:bg-orange-500/10 backdrop-blur-sm"
            >
              <Link href="/trails">Смотреть trails</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-12 pt-8 border-t border-orange-500/20">
            <div>
              <div className="text-2xl font-bold text-white">4</div>
              <div className="text-sm text-gray-400">Направления</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">3</div>
              <div className="text-sm text-gray-400">Уровня испытаний</div>
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
