import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAnyAdmin } from "@/lib/admin-access"
import { writeFile, mkdir, unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"]
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".wma", ".opus"]

const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500MB
const MAX_AUDIO_SIZE = 100 * 1024 * 1024 // 100MB

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "media")

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".")
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : ""
}

/**
 * POST — Upload a media file via FormData.
 * Saves to public/uploads/media/ and returns the public URL.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const blockType = formData.get("type") as string | null

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
      if (file.size > MAX_VIDEO_SIZE) {
        return NextResponse.json(
          { error: `Видео слишком большое. Максимум: ${MAX_VIDEO_SIZE / (1024 * 1024)} МБ` },
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
      if (file.size > MAX_AUDIO_SIZE) {
        return NextResponse.json(
          { error: `Аудио слишком большое. Максимум: ${MAX_AUDIO_SIZE / (1024 * 1024)} МБ` },
          { status: 400 }
        )
      }
    }

    // Ensure upload directory exists
    const subDir = join(UPLOAD_DIR, blockType.toLowerCase())
    if (!existsSync(subDir)) {
      await mkdir(subDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_")
    const fileName = `${timestamp}_${sanitizedName}`
    const filePath = join(subDir, fileName)

    // Write file to disk
    const arrayBuffer = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(arrayBuffer))

    // Public URL path
    const fileKey = `uploads/media/${blockType.toLowerCase()}/${fileName}`
    const url = `/${fileKey}`

    return NextResponse.json({
      fileKey,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      url,
    })
  } catch (error) {
    console.error("Media upload error:", error)
    return NextResponse.json({ error: "Ошибка при загрузке файла" }, { status: 500 })
  }
}

/**
 * DELETE — Remove a media file from disk.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { fileKey } = await request.json()
    if (!fileKey || typeof fileKey !== "string") {
      return NextResponse.json({ error: "fileKey обязателен" }, { status: 400 })
    }

    // Sanitize: only allow paths under uploads/media/
    if (!fileKey.startsWith("uploads/media/")) {
      return NextResponse.json({ error: "Недопустимый путь" }, { status: 400 })
    }

    const filePath = join(process.cwd(), "public", fileKey)
    await unlink(filePath).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Media delete error:", error)
    return NextResponse.json({ error: "Ошибка при удалении файла" }, { status: 500 })
  }
}
