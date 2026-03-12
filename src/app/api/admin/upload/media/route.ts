import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAnyAdmin } from "@/lib/admin-access"
import { createSignedUploadUrl, getMediaPublicUrl, deleteMedia } from "@/lib/supabase-storage"

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"]
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".wma", ".opus"]

const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024 // 2GB
const MAX_AUDIO_SIZE = 500 * 1024 * 1024 // 500MB

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".")
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : ""
}

/**
 * POST — Generate a signed upload URL for direct browser-to-Supabase upload.
 *
 * Body: { fileName: string, fileSize: number, type: "VIDEO" | "AUDIO" }
 * Returns: { signedUrl, token, fileKey, publicUrl }
 *
 * The client then PUTs the file directly to signedUrl — no server memory used.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { fileName, fileSize, type: blockType } = await request.json()

    if (!fileName || !blockType) {
      return NextResponse.json({ error: "fileName и type обязательны" }, { status: 400 })
    }

    if (blockType !== "VIDEO" && blockType !== "AUDIO") {
      return NextResponse.json({ error: "type должен быть VIDEO или AUDIO" }, { status: 400 })
    }

    const ext = getExtension(fileName)

    // Validate extension
    if (blockType === "VIDEO") {
      if (!VIDEO_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `Недопустимый формат видео. Допустимые: ${VIDEO_EXTENSIONS.join(", ")}` },
          { status: 400 }
        )
      }
      if (fileSize > MAX_VIDEO_SIZE) {
        return NextResponse.json(
          { error: `Видео слишком большое. Максимум: ${MAX_VIDEO_SIZE / (1024 * 1024 * 1024)} ГБ` },
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
      if (fileSize > MAX_AUDIO_SIZE) {
        return NextResponse.json(
          { error: `Аудио слишком большое. Максимум: ${MAX_AUDIO_SIZE / (1024 * 1024)} МБ` },
          { status: 400 }
        )
      }
    }

    // Generate storage path
    const timestamp = Date.now()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_")
    const fileKey = `modules/${blockType.toLowerCase()}/${timestamp}_${sanitizedName}`

    // Create signed upload URL
    const { signedUrl, token } = await createSignedUploadUrl(fileKey)
    const publicUrl = getMediaPublicUrl(fileKey)

    return NextResponse.json({
      signedUrl,
      token,
      fileKey,
      publicUrl,
    })
  } catch (error) {
    console.error("Presign error:", error)
    return NextResponse.json({ error: "Ошибка при создании URL для загрузки" }, { status: 500 })
  }
}

/**
 * DELETE — Remove a media file from storage.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { fileKey } = await request.json()
    if (!fileKey) {
      return NextResponse.json({ error: "fileKey обязателен" }, { status: 400 })
    }

    await deleteMedia(fileKey)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Media delete error:", error)
    return NextResponse.json({ error: "Ошибка при удалении файла" }, { status: 500 })
  }
}
