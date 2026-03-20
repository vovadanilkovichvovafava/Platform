"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { Play, Pause, Gauge, Volume2, VolumeX } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AudioPlayerProps {
  url: string
  mimeType?: string
}

const PLAYBACK_SPEEDS = [0.8, 1, 1.2, 1.5, 1.7, 2]
const VOLUME_STORAGE_KEY = "audio-player-volume"
const MUTED_STORAGE_KEY = "audio-player-muted"

function getSavedVolume(): number {
  if (typeof window === "undefined") return 1
  const saved = localStorage.getItem(VOLUME_STORAGE_KEY)
  if (saved !== null) {
    const val = parseFloat(saved)
    if (isFinite(val) && val >= 0 && val <= 1) return val
  }
  return 1
}

function getSavedMuted(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(MUTED_STORAGE_KEY) === "true"
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function AudioPlayer({ url, mimeType }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const waveformDataRef = useRef<number[]>([])
  const hasConnectedRef = useRef(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [waveformReady, setWaveformReady] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const previousVolumeRef = useRef(1)

  // Generate static waveform from audio data
  const generateWaveform = useCallback(async () => {
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const offlineCtx = new OfflineAudioContext(1, 1, 44100)
      const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer)
      const rawData = audioBuffer.getChannelData(0)

      const samples = 120
      const blockSize = Math.floor(rawData.length / samples)
      const waveform: number[] = []

      for (let i = 0; i < samples; i++) {
        let sum = 0
        const start = i * blockSize
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[start + j])
        }
        waveform.push(sum / blockSize)
      }

      // Normalize
      const max = Math.max(...waveform)
      if (max > 0) {
        for (let i = 0; i < waveform.length; i++) {
          waveform[i] = waveform[i] / max
        }
      }

      waveformDataRef.current = waveform
      setWaveformReady(true)
    } catch {
      // Fallback: generate random-ish waveform for visual placeholder
      const samples = 120
      const waveform: number[] = []
      for (let i = 0; i < samples; i++) {
        waveform.push(0.2 + Math.random() * 0.6)
      }
      waveformDataRef.current = waveform
      setWaveformReady(true)
    }
  }, [url])

  useEffect(() => {
    generateWaveform()
  }, [generateWaveform])

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const data = waveformDataRef.current
    if (data.length === 0) return

    ctx.clearRect(0, 0, width, height)

    const barWidth = Math.max(2, (width / data.length) * 0.7)
    const gap = width / data.length
    const progress = duration > 0 ? currentTime / duration : 0

    for (let i = 0; i < data.length; i++) {
      const x = i * gap + (gap - barWidth) / 2
      const barHeight = Math.max(2, data[i] * (height * 0.8))
      const y = (height - barHeight) / 2

      const barProgress = i / data.length
      if (barProgress <= progress) {
        ctx.fillStyle = "#ec4899" // pink-500
      } else {
        ctx.fillStyle = "#e5e7eb" // gray-200
      }

      ctx.beginPath()
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barHeight, 1)
      } else {
        ctx.rect(x, y, barWidth, barHeight)
      }
      ctx.fill()
    }
  }, [currentTime, duration])

  useEffect(() => {
    if (waveformReady) {
      drawWaveform()
    }
  }, [waveformReady, drawWaveform])

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const observer = new ResizeObserver(() => {
      drawWaveform()
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [drawWaveform])

  // Connect live analyser for playing animation
  const connectAnalyser = useCallback(() => {
    if (hasConnectedRef.current || !audioRef.current) return

    try {
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      const source = audioContext.createMediaElementSource(audioRef.current)
      source.connect(analyser)
      analyser.connect(audioContext.destination)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      sourceRef.current = source
      hasConnectedRef.current = true
    } catch {
      // AudioContext may fail in some environments
    }
  }, [])

  const handlePlayPause = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    if (!hasConnectedRef.current) {
      connectAnalyser()
    }

    // Resume AudioContext if suspended (browsers require user gesture)
    if (audioContextRef.current?.state === "suspended") {
      await audioContextRef.current.resume()
    }

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => {
        // Playback failed — browser may block autoplay
      })
    }
  }, [isPlaying, connectAnalyser])

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackRate(speed)
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }, [])

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      const audio = audioRef.current
      if (!canvas || !audio || !duration) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const progress = x / rect.width
      audio.currentTime = progress * duration
    },
    [duration]
  )

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => setIsPlaying(false)
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onDurationChange = () => setDuration(audio.duration)

    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("loadedmetadata", onLoadedMetadata)
    audio.addEventListener("durationchange", onDurationChange)

    // Handle SSR race condition: if the browser already loaded metadata
    // before React hydrated and attached listeners, read the current state
    if (audio.readyState >= 1 && audio.duration && isFinite(audio.duration)) {
      setDuration(audio.duration)
      setCurrentTime(audio.currentTime)
    }

    return () => {
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("loadedmetadata", onLoadedMetadata)
      audio.removeEventListener("durationchange", onDurationChange)
    }
  }, [])

  // Load saved volume on mount and apply to audio element
  useEffect(() => {
    const savedVolume = getSavedVolume()
    const savedMuted = getSavedMuted()
    setVolume(savedVolume)
    setIsMuted(savedMuted)
    previousVolumeRef.current = savedVolume
    if (audioRef.current) {
      audioRef.current.volume = savedMuted ? 0 : savedVolume
    }
  }, [])

  const handleVolumeChange = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume))
    setVolume(clamped)
    setIsMuted(clamped === 0)
    previousVolumeRef.current = clamped > 0 ? clamped : previousVolumeRef.current
    if (audioRef.current) {
      audioRef.current.volume = clamped
    }
    localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped))
    localStorage.setItem(MUTED_STORAGE_KEY, String(clamped === 0))
  }, [])

  const handleMuteToggle = useCallback(() => {
    if (isMuted) {
      const restored = previousVolumeRef.current > 0 ? previousVolumeRef.current : 1
      setVolume(restored)
      setIsMuted(false)
      if (audioRef.current) audioRef.current.volume = restored
      localStorage.setItem(VOLUME_STORAGE_KEY, String(restored))
      localStorage.setItem(MUTED_STORAGE_KEY, "false")
    } else {
      previousVolumeRef.current = volume > 0 ? volume : 1
      setIsMuted(true)
      if (audioRef.current) audioRef.current.volume = 0
      localStorage.setItem(MUTED_STORAGE_KEY, "true")
    }
  }, [isMuted, volume])

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="audio-player-container">
      <audio ref={audioRef} preload="metadata">
        <source src={url} type={mimeType || undefined} />
      </audio>

      <div className="bg-white dark:bg-slate-800 border border-pink-200 dark:border-pink-800 rounded-xl p-4 space-y-3">
        {/* Controls row */}
        <div className="flex items-center gap-3">
          {/* Play/Pause button */}
          <button
            onClick={handlePlayPause}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center transition-colors"
            title={isPlaying ? "Пауза" : "Воспроизвести"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </button>

          {/* Waveform */}
          <div className="flex-1 min-w-0">
            <canvas
              ref={canvasRef}
              onClick={handleSeek}
              className="w-full h-12 cursor-pointer rounded"
              style={{ display: "block" }}
            />
          </div>

          {/* Speed control */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg bg-pink-50 dark:bg-pink-950 border border-pink-200 dark:border-pink-800 text-pink-700 text-xs font-medium hover:bg-pink-100 dark:hover:bg-pink-900 transition-colors"
                title="Скорость воспроизведения"
              >
                <Gauge className="h-3.5 w-3.5" />
                <span>{playbackRate === 1 ? "1x" : `${playbackRate}x`}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[100px]">
              {PLAYBACK_SPEEDS.map((speed) => (
                <DropdownMenuItem
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`text-sm justify-between ${
                    playbackRate === speed ? "font-bold text-pink-600" : ""
                  }`}
                >
                  <span>{speed === 1 ? "Обычная" : `${speed}x`}</span>
                  {playbackRate === speed && (
                    <span className="text-pink-600">●</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Volume control + Time display */}
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleMuteToggle}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-pink-500 hover:text-pink-600 transition-colors"
              title={isMuted ? "Включить звук" : "Выключить звук"}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-20 h-1.5 appearance-none rounded-full bg-pink-100 dark:bg-pink-950 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:hover:bg-pink-600 [&::-webkit-slider-thumb]:transition-colors [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-pink-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:hover:bg-pink-600"
              title={`Громкость: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>
          <div className="flex-1 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
