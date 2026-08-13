"use client"

import { useRef, useState, useCallback } from "react"
import { Maximize, Gauge } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface VideoPlayerProps {
  url: string
  mimeType?: string
}

const PLAYBACK_SPEEDS = [0.8, 1, 1.2, 1.5, 1.7, 2]

export function VideoPlayer({ url, mimeType }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape")
  const [playbackRate, setPlaybackRate] = useState(1)

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (video && video.videoWidth && video.videoHeight) {
      setOrientation(video.videoHeight > video.videoWidth ? "portrait" : "landscape")
    }
  }, [])

  const handleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen()
    }
  }, [])

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackRate(speed)
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`video-player-container relative group mx-auto ${
        orientation === "portrait" ? "video-portrait" : "video-landscape"
      }`}
    >
      <video
        ref={videoRef}
        controls
        className="w-full h-full rounded-lg object-contain bg-black"
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
      >
        <source src={url} type={mimeType || undefined} />
        Ваш браузер не поддерживает воспроизведение видео.
      </video>

      {/* Top-right overlay buttons */}
      <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Speed control */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-black/60 text-white text-xs font-medium hover:bg-black/80 transition-colors"
              title="Скорость воспроизведения"
            >
              <Gauge className="h-4 w-4" />
              <span>{playbackRate === 1 ? "1x" : `${playbackRate}x`}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[100px]">
            {PLAYBACK_SPEEDS.map((speed) => (
              <DropdownMenuItem
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`text-sm justify-between ${
                  playbackRate === speed ? "font-bold text-blue-600" : ""
                }`}
              >
                <span>{speed === 1 ? "Обычная" : `${speed}x`}</span>
                {playbackRate === speed && (
                  <span className="text-blue-600">●</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Fullscreen button */}
        <button
          onClick={handleFullscreen}
          className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
          title="Полный экран"
        >
          <Maximize className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
