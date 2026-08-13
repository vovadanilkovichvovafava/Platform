/**
 * Google Docs/Drive public endpoint utilities.
 * No API key required — uses public endpoints for shared documents.
 */
import type { GoogleUrlType } from "./types"

export interface ParsedGoogleUrl {
  documentId: string | null
  urlType: GoogleUrlType
}

/**
 * Parse a Google Docs/Drive URL to extract document ID and type.
 */
export function parseGoogleUrl(url: string): ParsedGoogleUrl {
  try {
    const u = new URL(url)
    const hostname = u.hostname

    // Google Docs: docs.google.com/document/d/{id}/...
    if (hostname === "docs.google.com" || hostname === "www.docs.google.com") {
      const docMatch = u.pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
      if (docMatch) return { documentId: docMatch[1], urlType: "document" }

      const sheetMatch = u.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
      if (sheetMatch) return { documentId: sheetMatch[1], urlType: "spreadsheet" }

      const slideMatch = u.pathname.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/)
      if (slideMatch) return { documentId: slideMatch[1], urlType: "presentation" }
    }

    // Google Drive: drive.google.com/...
    if (hostname === "drive.google.com" || hostname === "www.drive.google.com") {
      const folderMatch = u.pathname.match(/\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/)
      if (folderMatch) return { documentId: folderMatch[1], urlType: "folder" }

      const fileMatch = u.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
      if (fileMatch) return { documentId: fileMatch[1], urlType: "file" }

      // drive.google.com/open?id=...
      const openId = u.searchParams.get("id")
      if (openId) return { documentId: openId, urlType: "file" }
    }

    return { documentId: null, urlType: "unknown" }
  } catch {
    return { documentId: null, urlType: "unknown" }
  }
}

/**
 * Fetch document title by parsing the HTML <title> tag from the public page.
 */
export async function fetchDocumentTitle(
  docId: string,
  urlType: GoogleUrlType
): Promise<string | null> {
  const pageUrl = buildPublicPageUrl(docId, urlType)
  if (!pageUrl) return null

  try {
    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GoogleDocsScanBot/1.0)",
      },
      redirect: "follow",
    })

    if (!response.ok) return null

    const html = await response.text()

    // Parse <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (!titleMatch) return null

    let title = titleMatch[1].trim()

    // Google Docs adds " - Google Docs" etc. to title — strip it
    title = title
      .replace(/\s*-\s*Google\s+(Docs|Sheets|Slides|Drive)$/i, "")
      .replace(/\s*-\s*Google\s+(Документы|Таблицы|Презентации|Диск)$/i, "")
      .trim()

    return title || null
  } catch {
    return null
  }
}

/**
 * Fetch document content as plain text via public export endpoints.
 * Works only for documents shared with "anyone with the link".
 */
export async function fetchDocumentText(
  docId: string,
  urlType: GoogleUrlType
): Promise<string | null> {
  const exportUrl = buildExportUrl(docId, urlType)
  if (!exportUrl) return null

  try {
    const response = await fetch(exportUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GoogleDocsScanBot/1.0)",
      },
      redirect: "follow",
    })

    if (!response.ok) return null

    const text = await response.text()

    // Google may return an HTML error page instead of text
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      return null
    }

    return text
  } catch {
    return null
  }
}

/**
 * Build the iframe embed/preview URL for a Google document.
 */
export function buildEmbedUrl(
  docId: string,
  urlType: GoogleUrlType
): string | null {
  switch (urlType) {
    case "document":
      return `https://docs.google.com/document/d/${docId}/preview`
    case "spreadsheet":
      return `https://docs.google.com/spreadsheets/d/${docId}/preview`
    case "presentation":
      return `https://docs.google.com/presentation/d/${docId}/preview`
    case "file":
      return `https://drive.google.com/file/d/${docId}/preview`
    case "folder":
      return `https://drive.google.com/embeddedfolderview?id=${docId}#list`
    default:
      return null
  }
}

/**
 * Build the public web view URL for a Google document.
 */
export function buildWebViewUrl(
  docId: string,
  urlType: GoogleUrlType
): string | null {
  switch (urlType) {
    case "document":
      return `https://docs.google.com/document/d/${docId}/edit`
    case "spreadsheet":
      return `https://docs.google.com/spreadsheets/d/${docId}/edit`
    case "presentation":
      return `https://docs.google.com/presentation/d/${docId}/edit`
    case "file":
      return `https://drive.google.com/file/d/${docId}/view`
    case "folder":
      return `https://drive.google.com/drive/folders/${docId}`
    default:
      return null
  }
}

/**
 * Count content metrics from plain text.
 */
export function countContentMetrics(text: string): {
  wordCount: number
  characterCount: number
  lineCount: number
  isEmpty: boolean
} {
  const trimmed = text.trim()
  if (!trimmed) {
    return { wordCount: 0, characterCount: 0, lineCount: 0, isEmpty: true }
  }

  const characterCount = trimmed.length
  const lineCount = trimmed.split("\n").length
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length

  return {
    wordCount,
    characterCount,
    lineCount,
    isEmpty: false,
  }
}

/**
 * Check if a URL looks like it could be a Google Docs/Drive link.
 */
export function isGoogleDocsUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return (
      u.hostname === "docs.google.com" ||
      u.hostname === "www.docs.google.com" ||
      u.hostname === "drive.google.com" ||
      u.hostname === "www.drive.google.com"
    )
  } catch {
    return false
  }
}

// --- Internal helpers ---

function buildPublicPageUrl(
  docId: string,
  urlType: GoogleUrlType
): string | null {
  switch (urlType) {
    case "document":
      return `https://docs.google.com/document/d/${docId}/edit`
    case "spreadsheet":
      return `https://docs.google.com/spreadsheets/d/${docId}/edit`
    case "presentation":
      return `https://docs.google.com/presentation/d/${docId}/edit`
    case "file":
      return `https://drive.google.com/file/d/${docId}/view`
    default:
      return null
  }
}

function buildExportUrl(
  docId: string,
  urlType: GoogleUrlType
): string | null {
  switch (urlType) {
    case "document":
      return `https://docs.google.com/document/d/${docId}/export?format=txt`
    case "spreadsheet":
      return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`
    case "presentation":
      return `https://docs.google.com/presentation/d/${docId}/export/txt`
    default:
      return null
  }
}
