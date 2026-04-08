/**
 * Google Docs Scanner Service — orchestrates the scan pipeline.
 * Isolated module — does not affect other features.
 *
 * Pipeline:
 * 1. Find/create GoogleDocsScan record (idempotent)
 * 2. Parse URL to extract document ID and type
 * 3. Fetch title from public page HTML
 * 4. Export text content and count metrics
 * 5. Build embed URL
 * 6. Save result to DB
 */
import { prisma } from "@/lib/prisma"
import {
  parseGoogleUrl,
  fetchDocumentTitle,
  fetchDocumentText,
  buildEmbedUrl,
  buildWebViewUrl,
  countContentMetrics,
  isGoogleDocsUrl,
} from "./google-api"
import type { GoogleDocsScanDTO, GoogleDocsScanData } from "./types"

const LOG_PREFIX = "[GoogleDocsScan]"

/**
 * Check if Google Docs scan is available.
 * Always available — we use public endpoints, no API key needed.
 */
export function isGoogleDocsScanAvailable(): boolean {
  return true
}

/**
 * Run a Google Docs scan for a submission. Idempotent.
 * If rescan=true, stores result in rescanData (never overwrites initialScanData).
 */
export async function runGoogleDocsScan(
  submissionId: string,
  options?: { rescan?: boolean }
): Promise<string> {
  const startTime = Date.now()
  const isRescan = options?.rescan ?? false

  // Step 1: Get submission fileUrl
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { fileUrl: true },
  })

  if (!submission?.fileUrl) {
    console.log(`${LOG_PREFIX} No fileUrl for submission ${submissionId}`)
    throw new Error("Нет ссылки на файл")
  }

  const fileUrl = submission.fileUrl

  // Check if URL is a Google Docs/Drive link
  if (!isGoogleDocsUrl(fileUrl)) {
    console.log(`${LOG_PREFIX} URL is not a Google Docs/Drive link: ${fileUrl}`)
    throw new Error("Ссылка не является Google Docs/Drive")
  }

  // Step 2: Upsert scan record
  let scan = await prisma.googleDocsScan.findUnique({
    where: { submissionId },
  })

  if (scan && !isRescan) {
    // Initial scan already exists — check if completed
    if (scan.status === "completed") {
      console.log(`${LOG_PREFIX} Initial scan already completed for ${submissionId}`)
      return scan.id
    }
    if (scan.status === "processing") {
      console.log(`${LOG_PREFIX} Scan already processing for ${submissionId}`)
      return scan.id
    }
  }

  if (!scan) {
    scan = await prisma.googleDocsScan.create({
      data: {
        submissionId,
        status: "processing",
      },
    })
  } else if (isRescan) {
    // Update for re-scan
    scan = await prisma.googleDocsScan.update({
      where: { id: scan.id },
      data: {
        rescanStatus: "processing",
        rescanError: null,
      },
    })
  } else {
    // Retry failed initial scan
    scan = await prisma.googleDocsScan.update({
      where: { id: scan.id },
      data: {
        status: "processing",
        errorMessage: null,
      },
    })
  }

  try {
    // Step 3: Parse URL
    const { documentId, urlType } = parseGoogleUrl(fileUrl)

    if (!documentId) {
      const scanData: GoogleDocsScanData = {
        url: fileUrl,
        urlType: "unknown",
        documentId: null,
        title: null,
        wordCount: null,
        characterCount: null,
        lineCount: null,
        isEmpty: true,
        embedUrl: null,
        webViewUrl: fileUrl,
        scanTimestamp: new Date().toISOString(),
        accessError: "Не удалось распознать Google Docs/Drive ссылку",
      }

      await saveScanResult(scan.id, scanData, isRescan)
      return scan.id
    }

    console.log(`${LOG_PREFIX} Parsed URL: type=${urlType}, id=${documentId}`)

    // Step 4: Fetch title
    const titleStart = Date.now()
    const title = await fetchDocumentTitle(documentId, urlType)
    console.log(`${LOG_PREFIX} Title fetched in ${Date.now() - titleStart}ms: ${title ?? "(not available)"}`)

    // Step 5: Fetch text content and count metrics
    let wordCount: number | null = null
    let characterCount: number | null = null
    let lineCount: number | null = null
    let isEmpty = true
    let accessError: string | null = null

    const textStart = Date.now()
    const text = await fetchDocumentText(documentId, urlType)
    console.log(`${LOG_PREFIX} Text export in ${Date.now() - textStart}ms: ${text ? `${text.length} chars` : "unavailable"}`)

    if (text !== null) {
      const metrics = countContentMetrics(text)
      wordCount = metrics.wordCount
      characterCount = metrics.characterCount
      lineCount = metrics.lineCount
      isEmpty = metrics.isEmpty
    } else if (urlType === "folder") {
      // Folders don't have text export — this is expected
      isEmpty = false
      accessError = null
    } else if (!title) {
      // Both title and text failed — likely access denied
      accessError = "Нет доступа к документу. Убедитесь, что ссылка открыта для всех."
    }

    // Step 6: Build URLs
    const embedUrl = buildEmbedUrl(documentId, urlType)
    const webViewUrl = buildWebViewUrl(documentId, urlType)

    const scanData: GoogleDocsScanData = {
      url: fileUrl,
      urlType,
      documentId,
      title,
      wordCount,
      characterCount,
      lineCount,
      isEmpty,
      embedUrl,
      webViewUrl,
      scanTimestamp: new Date().toISOString(),
      accessError,
    }

    // Step 7: Save to DB
    await saveScanResult(scan.id, scanData, isRescan)

    console.log(
      `${LOG_PREFIX} Scan completed for ${submissionId} in ${Date.now() - startTime}ms`
    )

    return scan.id
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    console.error(`${LOG_PREFIX} Error for ${submissionId}:`, errorMsg)

    // Mark as failed
    const updateData = isRescan
      ? { rescanStatus: "failed", rescanError: errorMsg.slice(0, 500) }
      : { status: "failed", errorMessage: errorMsg.slice(0, 500) }

    await prisma.googleDocsScan
      .update({ where: { id: scan.id }, data: updateData })
      .catch((dbErr) => {
        console.error(`${LOG_PREFIX} Failed to update status:`, dbErr)
      })

    throw error
  }
}

/**
 * Get scan data for a submission as a serialization-safe DTO.
 */
export async function getGoogleDocsScanDTO(
  submissionId: string
): Promise<GoogleDocsScanDTO | null> {
  const scan = await prisma.googleDocsScan.findUnique({
    where: { submissionId },
    select: {
      id: true,
      submissionId: true,
      status: true,
      initialScanData: true,
      rescanData: true,
      rescanStatus: true,
      errorMessage: true,
      rescanError: true,
      scannedAt: true,
      rescannedAt: true,
    },
  })

  if (!scan) return null

  return {
    id: scan.id,
    submissionId: scan.submissionId,
    status: scan.status as GoogleDocsScanDTO["status"],
    initialScan: safeJsonParse(scan.initialScanData),
    rescan: safeJsonParse(scan.rescanData),
    rescanStatus: scan.rescanStatus as GoogleDocsScanDTO["rescanStatus"],
    errorMessage: scan.errorMessage,
    rescanError: scan.rescanError,
    scannedAt: scan.scannedAt?.toISOString() ?? null,
    rescannedAt: scan.rescannedAt?.toISOString() ?? null,
  }
}

// --- Internal helpers ---

async function saveScanResult(
  scanId: string,
  data: GoogleDocsScanData,
  isRescan: boolean
): Promise<void> {
  const json = JSON.stringify(data)

  if (isRescan) {
    await prisma.googleDocsScan.update({
      where: { id: scanId },
      data: {
        rescanData: json,
        rescanStatus: "completed",
        rescanError: null,
        rescannedAt: new Date(),
      },
    })
  } else {
    await prisma.googleDocsScan.update({
      where: { id: scanId },
      data: {
        initialScanData: json,
        status: "completed",
        errorMessage: null,
        scannedAt: new Date(),
      },
    })
  }
}

function safeJsonParse<T>(str: string | null): T | null {
  if (!str) return null
  try {
    return JSON.parse(str) as T
  } catch {
    return null
  }
}
