/**
 * Utility functions for managing filter/sort/pagination state in URL query parameters.
 *
 * Pattern: URL is the single source of truth for filter state.
 * - Read initial state from URL on first render
 * - Update URL on every filter/sort/page/perPage change
 * - Use replaceState to avoid polluting browser history
 */

/** Valid perPage options for pagination controls */
export const PER_PAGE_OPTIONS = [5, 10, 20, 30, 50, 100] as const
export type PerPageOption = (typeof PER_PAGE_OPTIONS)[number]
export const DEFAULT_PER_PAGE = 10

/**
 * Read current URL search params (client-side only).
 * Returns empty URLSearchParams during SSR.
 */
export function getUrlParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

/**
 * Parse a string to a valid page number (>= 1).
 */
export function parsePageParam(value: string | null | undefined, defaultValue = 1): number {
  if (!value) return defaultValue
  const num = parseInt(value, 10)
  return isNaN(num) || num < 1 ? defaultValue : num
}

/**
 * Parse a string to a valid perPage option.
 */
export function parsePerPageParam(
  value: string | null | undefined,
  defaultValue: PerPageOption = DEFAULT_PER_PAGE,
): PerPageOption {
  if (!value) return defaultValue
  const num = parseInt(value, 10) as PerPageOption
  return PER_PAGE_OPTIONS.includes(num) ? num : defaultValue
}

/**
 * Parse a string against a list of allowed values, returning default if invalid.
 */
export function parseEnumParam<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
  defaultValue: T,
): T {
  if (!value) return defaultValue
  return (allowed as readonly string[]).includes(value) ? (value as T) : defaultValue
}

/**
 * Build a query string from params, omitting keys where value matches its default.
 * Empty string values are also omitted.
 */
export function buildQueryString(
  params: Record<string, string | number>,
  defaults: Record<string, string | number>,
): string {
  const usp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const strValue = String(value)
    const strDefault = String(defaults[key] ?? "")
    if (strValue && strValue !== strDefault) {
      usp.set(key, strValue)
    }
  }
  return usp.toString()
}

/**
 * Update the browser URL without triggering navigation (replaceState).
 * Keeps browser history clean — each filter change replaces the current entry.
 * Also persists filter state to sessionStorage for survival across navigations.
 */
export function updateUrl(
  pathname: string,
  params: Record<string, string | number>,
  defaults: Record<string, string | number>,
): void {
  const qs = buildQueryString(params, defaults)
  const newUrl = qs ? `${pathname}?${qs}` : pathname
  window.history.replaceState(null, "", newUrl)
  saveFiltersToStorage(pathname, params)
}

const FILTER_STORAGE_PREFIX = "page-filters:"

/**
 * Save filter state to sessionStorage for persistence across navigation.
 * Used as a fallback when URL params are lost (e.g. Next.js RSC cache, breadcrumb links).
 */
export function saveFiltersToStorage(
  pathname: string,
  filters: Record<string, string | number>,
): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(
      `${FILTER_STORAGE_PREFIX}${pathname}`,
      JSON.stringify(filters),
    )
  } catch {
    // sessionStorage may be unavailable or full
  }
}

/**
 * Load filter state from sessionStorage.
 * Returns null if nothing is stored or sessionStorage is unavailable.
 */
export function loadFiltersFromStorage(
  pathname: string,
): Record<string, string> | null {
  if (typeof window === "undefined") return null
  try {
    const stored = sessionStorage.getItem(`${FILTER_STORAGE_PREFIX}${pathname}`)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}
