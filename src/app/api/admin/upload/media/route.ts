import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAnyAdmin } from "@/lib/admin-access"
import { uploadMedia, getMediaPublicUrl, deleteMedia } from "@/lib/supabase-storage"
import { exec } from "child_process"
import { promisify } from "util"
import { writeFile, unlink, readFile, mkdtemp } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"

const execAsync = promisify(exec)

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"]
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".wma", ".opus"]

const VIDEO_MIME_TYPES = [
  "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
  "video/x-matroska", "video/x-m4v",
]
const AUDIO_MIME_TYPES = [
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/aac",
  "audio/flac", "audio/x-ms-wma", "audio/opus", "audio/x-m4a",
]

const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500MB before compression
const MAX_AUDIO_SIZE = 100 * 1024 * 1024 // 100MB before compression

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".")
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : ""
}

async function isFfmpegAvailable(): Promise<boolean> {
  try {
    await execAsync("which ffmpeg")
    return true
  } catch {
    return false
  }
}

async function compressVideo(inputPath: string, outputPath: string): Promise<void> {
  // H.264, CRF 28 for good compression with acceptable quality
  // Scale down to max 720p height, preserve aspect ratio
  // Use fast preset for reasonable encoding speed
  await execAsync(
    `ffmpeg -i "${inputPath}" -c:v libx264 -preset fast -crf 28 ` +
    `-vf "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease" ` +
    `-c:a aac -b:a 128k -movflags +faststart -y "${outputPath}"`,
    { timeout: 300000 } // 5 min timeout
  )
}

async function compressAudio(inputPath: string, outputPath: string): Promise<void> {
  // Convert to MP3, 128kbps CBR for good compression
  await execAsync(
    `ffmpeg -i "${inputPath}" -c:a libmp3lame -b:a 128k -y "${outputPath}"`,
    { timeout: 120000 } // 2 min timeout
  )
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const blockType = formData.get("type") as string | null // "VIDEO" or "AUDIO"

    if (!file) {
      return NextResponse.json({ error: "Файл не предоставлен" }, { status: 400 })
    }

    if (!blockType || (blockType !== "VIDEO" && blockType !== "AUDIO")) {
      return NextResponse.json({ error: "Укажите тип блока: VIDEO или AUDIO" }, { status: 400 })
    }

    const ext = getExtension(file.name)

    // Validate extension matches block type
    if (blockType === "VIDEO") {
      if (!VIDEO_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `Недопустимый формат видео. Допустимые: ${VIDEO_EXTENSIONS.join(", ")}` },
          { status: 400 }
        )
      }
      if (!VIDEO_MIME_TYPES.includes(file.type) && file.type !== "application/octet-stream") {
        return NextResponse.json(
          { error: `Недопустимый MIME-тип для видео: ${file.type}` },
          { status: 400 }
        )
      }
      if (file.size > MAX_VIDEO_SIZE) {
        return NextResponse.json(
          { error: `Видео файл слишком большой. Максимум: ${MAX_VIDEO_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        )
      }
    } else {
      if (!AUDIO_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `Недопустимый формат аудио. Допустимые: ${AUDIO_EXTENSIONS.join(", ")}` },
          { status: 400 }
        )
      }
      if (!AUDIO_MIME_TYPES.includes(file.type) && file.type !== "application/octet-stream") {
        return NextResponse.json(
          { error: `Недопустимый MIME-тип для аудио: ${file.type}` },
          { status: 400 }
        )
      }
      if (file.size > MAX_AUDIO_SIZE) {
        return NextResponse.json(
          { error: `Аудио файл слишком большой. Максимум: ${MAX_AUDIO_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        )
      }
    }

    const arrayBuffer = await file.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)
    let finalFileName = file.name
    let finalMimeType = file.type
    let compressed = false

    // Try to compress with ffmpeg
    const ffmpegOk = await isFfmpegAvailable()
    if (ffmpegOk) {
      const tmpDir = await mkdtemp(join(tmpdir(), "media-"))
      const inputPath = join(tmpDir, `input${ext}`)

      try {
        await writeFile(inputPath, buffer)

        if (blockType === "VIDEO") {
          const outputPath = join(tmpDir, "output.mp4")
          await compressVideo(inputPath, outputPath)
          buffer = await readFile(outputPath)
          finalFileName = file.name.replace(/\.[^.]+$/, ".mp4")
          finalMimeType = "video/mp4"
          compressed = true
          await unlink(outputPath).catch(() => {})
        } else {
          const outputPath = join(tmpDir, "output.mp3")
          await compressAudio(inputPath, outputPath)
          buffer = await readFile(outputPath)
          finalFileName = file.name.replace(/\.[^.]+$/, ".mp3")
          finalMimeType = "audio/mpeg"
          compressed = true
          await unlink(outputPath).catch(() => {})
        }

        await unlink(inputPath).catch(() => {})
      } catch (compressionError) {
        console.warn("Compression failed, uploading original file:", compressionError)
        // Fall back to original buffer
        buffer = Buffer.from(arrayBuffer)
        finalFileName = file.name
        finalMimeType = file.type
      }
    }

    // Generate unique storage path
    const timestamp = Date.now()
    const sanitizedName = finalFileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_")
    const storagePath = `modules/${blockType.toLowerCase()}/${timestamp}_${sanitizedName}`

    // Upload to Supabase Storage
    const fileKey = await uploadMedia(buffer, storagePath, finalMimeType)
    const publicUrl = getMediaPublicUrl(fileKey)

    return NextResponse.json({
      fileKey,
      fileName: file.name,
      fileSize: buffer.length,
      mimeType: finalMimeType,
      url: publicUrl,
      compressed,
      originalSize: file.size,
      compressedSize: compressed ? buffer.length : file.size,
    })
  } catch (error) {
    console.error("Media upload error:", error)
    return NextResponse.json(
      { error: "Ошибка при загрузке файла" },
      { status: 500 }
    )
  }
}

// DELETE - Remove a media file from storage
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { fileKey } = await request.json()
    if (!fileKey) {
      return NextResponse.json({ error: "fileKey is required" }, { status: 400 })
    }

    await deleteMedia(fileKey)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Media delete error:", error)
    return NextResponse.json(
      { error: "Ошибка при удалении файла" },
      { status: 500 }
    )
  }
}
