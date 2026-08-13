/**
 * Google Docs Scanner — barrel export.
 * Isolated feature module for scanning public Google Docs/Drive links.
 */
export {
  runGoogleDocsScan,
  getGoogleDocsScanDTO,
  isGoogleDocsScanAvailable,
} from "./service"
export type {
  GoogleDocsScanDTO,
  GoogleDocsScanData,
  ScanStatus,
  GoogleUrlType,
} from "./types"
