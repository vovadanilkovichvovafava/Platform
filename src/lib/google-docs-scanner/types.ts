/**
 * Types for Google Docs/Drive Scanner feature.
 * Isolated module — does not affect other features.
 */

/** Status of scan process */
export type ScanStatus = "pending" | "processing" | "completed" | "failed"

/** Parsed URL type */
export type GoogleUrlType =
  | "document"
  | "spreadsheet"
  | "presentation"
  | "folder"
  | "file"
  | "unknown"

/** Core scan data structure (stored as JSON in DB) */
export interface GoogleDocsScanData {
  url: string
  urlType: GoogleUrlType
  documentId: string | null

  // Metadata (parsed from HTML page)
  title: string | null

  // Content completeness metrics (from text export)
  wordCount: number | null
  characterCount: number | null
  lineCount: number | null
  isEmpty: boolean

  // Preview URLs
  embedUrl: string | null
  webViewUrl: string | null

  // Timestamp of when scan was performed
  scanTimestamp: string // ISO date string

  // If access was denied or other errors
  accessError: string | null
}

/** DTO for client components (serialization-safe, no Date objects) */
export interface GoogleDocsScanDTO {
  id: string
  submissionId: string
  status: ScanStatus
  initialScan: GoogleDocsScanData | null
  rescan: GoogleDocsScanData | null
  rescanStatus: ScanStatus | null
  errorMessage: string | null
  rescanError: string | null
  scannedAt: string | null
  rescannedAt: string | null
}
