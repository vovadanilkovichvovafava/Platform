import { NextRequest, NextResponse } from "next/server"
import { readFile, stat } from "fs/promises"
import { join } from "path"

const MIME_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".wma": "audio/x-ms-wma",
  ".opus": "audio/opus",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".m4v": "video/mp4",
}

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "media")

/**
 * GET — Serve uploaded media files dynamically.
 * This route handles /api/media/:type/:filename
 * and is rewritten from /uploads/media/:type/:filename via next.config.ts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params

    // Validate path segments (must be exactly 2: type/filename)
    if (!pathSegments || pathSegments.length !== 2) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const [mediaType, fileName] = pathSegments

    // Only allow "audio" and "video" subdirectories
    if (mediaType !== "audio" && mediaType !== "video") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Sanitize filename - prevent path traversal
    if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const filePath = join(UPLOAD_DIR, mediaType, fileName)

    // Check file exists and get size
    let fileStats
    try {
      fileStats = await stat(filePath)
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    if (!fileStats.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Determine MIME type from extension
    const ext = fileName.lastIndexOf(".") >= 0
      ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
      : ""
    const contentType = MIME_TYPES[ext] || "application/octet-stream"

    // Handle Range requests for proper media streaming
    const rangeHeader = request.headers.get("range")

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      if (match) {
        const start = parseInt(match[1], 10)
        const end = match[2] ? parseInt(match[2], 10) : fileStats.size - 1
        const chunkSize = end - start + 1

        const fileBuffer = await readFile(filePath)
        const chunk = fileBuffer.subarray(start, end + 1)

        return new NextResponse(chunk, {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Range": `bytes ${start}-${end}/${fileStats.size}`,
            "Content-Length": String(chunkSize),
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        })
      }
    }

    // Full file response
    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileStats.size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Media serve error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
