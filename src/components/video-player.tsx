"use client"

import { useRef, useState, useCallback } from "react"
import { Maximize } from "lucide-react"

interface VideoPlayerProps {
  url: string
  mimeType?: string
}

export function VideoPlayer({ url, mimeType }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape")

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
      <button
        onClick={handleFullscreen}
        className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
        title="Полный экран"
      >
        <Maximize className="h-5 w-5" />
      </button>
    </div>
  )
}
