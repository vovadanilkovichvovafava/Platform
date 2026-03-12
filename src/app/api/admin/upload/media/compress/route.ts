import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAnyAdmin } from "@/lib/admin-access"
import { downloadMedia, uploadMedia, deleteMedia, getMediaPublicUrl } from "@/lib/supabase-storage"
import { exec } from "child_process"
import { promisify } from "util"
import { writeFile, unlink, readFile, mkdtemp, stat } from "fs/promises"
import { createWriteStream } from "fs"
import { tmpdir } from "os"
import { join } from "path"

const execAsync = promisify(exec)

async function isFfmpegAvailable(): Promise<boolean> {
  try {
    await execAsync("which ffmpeg")
    return true
  } catch {
    return false
  }
}

/**
 * Get video duration in seconds using ffprobe.
 */
async function getMediaDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { timeout: 30000 }
    )
    return parseFloat(stdout.trim()) || 0
  } catch {
    return 0
  }
}

/**
 * Compress video with adaptive settings based on duration/size.
 * - Short videos (<10min): CRF 26, 720p, medium preset
 * - Medium videos (10-60min): CRF 28, 720p, fast preset
 * - Long videos (>60min): CRF 30, 480p, faster preset — prioritize file size
 */
async function compressVideo(inputPath: string, outputPath: string, durationSec: number): Promise<void> {
  let crf: number
  let maxHeight: number
  let maxWidth: number
  let preset: string
  let audioBitrate: string

  if (durationSec <= 600) {
    // Short: <10 min
    crf = 26
    maxHeight = 720
    maxWidth = 1280
    preset = "medium"
    audioBitrate = "128k"
  } else if (durationSec <= 3600) {
    // Medium: 10-60 min
    crf = 28
    maxHeight = 720
    maxWidth = 1280
    preset = "fast"
    audioBitrate = "96k"
  } else {
    // Long: >60 min — aggressive compression
    crf = 30
    maxHeight = 480
    maxWidth = 854
    preset = "faster"
    audioBitrate = "96k"
  }

  // Timeout: ~2x realtime + 2 min baseline (generous for slower machines)
  const timeoutMs = Math.max(durationSec * 2000, 120000) + 120000

  await execAsync(
    `ffmpeg -i "${inputPath}" ` +
    `-c:v libx264 -preset ${preset} -crf ${crf} ` +
    `-vf "scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease" ` +
    `-c:a aac -b:a ${audioBitrate} ` +
    `-movflags +faststart ` +
    `-y "${outputPath}"`,
    { timeout: timeoutMs }
  )
}

/**
 * Compress audio to MP3 128kbps.
 */
async function compressAudio(inputPath: string, outputPath: string, durationSec: number): Promise<void> {
  const timeoutMs = Math.max(durationSec * 1000, 60000) + 60000
  await execAsync(
    `ffmpeg -i "${inputPath}" -c:a libmp3lame -b:a 128k -y "${outputPath}"`,
    { timeout: timeoutMs }
  )
}

/**
 * POST — Compress a file that is already in Supabase Storage.
 *
 * This runs server-side: downloads from storage → ffmpeg → re-uploads compressed.
 * Works with files of any size (disk-based, not RAM-based).
 *
 * Body: { fileKey: string, type: "VIDEO" | "AUDIO" }
 * Returns: { fileKey, publicUrl, originalSize, compressedSize, compressed: true }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { fileKey, type: blockType } = await request.json()

    if (!fileKey || !blockType) {
      return NextResponse.json({ error: "fileKey и type обязательны" }, { status: 400 })
    }

    const ffmpegOk = await isFfmpegAvailable()
    if (!ffmpegOk) {
      // No ffmpeg — return as-is, no compression
      const publicUrl = getMediaPublicUrl(fileKey)
      return NextResponse.json({
        fileKey,
        publicUrl,
        compressed: false,
        reason: "ffmpeg недоступен на сервере",
      })
    }

    const tmpDir = await mkdtemp(join(tmpdir(), "media-compress-"))
    const ext = fileKey.includes(".") ? fileKey.slice(fileKey.lastIndexOf(".")) : ""
    const inputPath = join(tmpDir, `input${ext}`)
    const outputExt = blockType === "VIDEO" ? ".mp4" : ".mp3"
    const outputPath = join(tmpDir, `output${outputExt}`)

    try {
      // Download from Supabase Storage to disk
      const fileBuffer = await downloadMedia(fileKey)
      await writeFile(inputPath, fileBuffer)

      const originalSize = fileBuffer.length
      const duration = await getMediaDuration(inputPath)

      // Compress
      if (blockType === "VIDEO") {
        await compressVideo(inputPath, outputPath, duration)
      } else {
        await compressAudio(inputPath, outputPath, duration)
      }

      // Read compressed file
      const compressedBuffer = await readFile(outputPath)
      const compressedSize = compressedBuffer.length

      // Only use compressed version if it's actually smaller
      if (compressedSize >= originalSize) {
        const publicUrl = getMediaPublicUrl(fileKey)
        return NextResponse.json({
          fileKey,
          publicUrl,
          originalSize,
          compressedSize: originalSize,
          compressed: false,
          reason: "Сжатый файл не меньше оригинала",
        })
      }

      // Upload compressed version with new key
      const compressedKey = fileKey.replace(/\.[^.]+$/, `_compressed${outputExt}`)
      const mimeType = blockType === "VIDEO" ? "video/mp4" : "audio/mpeg"
      await uploadMedia(compressedBuffer, compressedKey, mimeType)

      // Delete the original uncompressed file
      await deleteMedia(fileKey)

      const publicUrl = getMediaPublicUrl(compressedKey)
      return NextResponse.json({
        fileKey: compressedKey,
        publicUrl,
        mimeType,
        originalSize,
        compressedSize,
        compressed: true,
      })
    } finally {
      // Cleanup temp files
      await unlink(inputPath).catch(() => {})
      await unlink(outputPath).catch(() => {})
      // Remove temp dir
      await unlink(tmpDir).catch(() => {})
    }
  } catch (error) {
    console.error("Compression error:", error)
    return NextResponse.json(
      { error: "Ошибка при сжатии файла. Файл сохранён без сжатия." },
      { status: 500 }
    )
  }
}
