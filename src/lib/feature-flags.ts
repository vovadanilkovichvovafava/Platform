/**
 * Centralized feature flags.
 * Each flag defaults to a safe value (disabled) when the env var is absent.
 * Flags are read at module-load time so they work in both SSR and client contexts.
 *
 * Usage:
 *   import { FEATURE_FLAGS } from "@/lib/feature-flags"
 *   if (FEATURE_FLAGS.LEADERBOARD_ENABLED) { ... }
 */

export const FEATURE_FLAGS = {
  /** When false, /leaderboard page, API and all UI links are disabled. */
  LEADERBOARD_ENABLED: process.env.NEXT_PUBLIC_LEADERBOARD_ENABLED === "true",
} as const
