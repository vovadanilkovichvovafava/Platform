/**
 * Centralized feature flags.
 * To enable a feature, change its value from `false` to `true`.
 * No environment variables needed — just edit this file.
 *
 * Usage:
 *   import { FEATURE_FLAGS } from "@/lib/feature-flags"
 *   if (FEATURE_FLAGS.LEADERBOARD_ENABLED) { ... }
 */

export const FEATURE_FLAGS = {
  /** When false, /leaderboard page, API and all UI links are disabled. Set to true to re-enable. */
  LEADERBOARD_ENABLED: false,
  /** When true, AI analysis of submissions is triggered after submit and shown on review page. */
  AI_SUBMISSION_REVIEW_ENABLED: process.env.AI_SUBMISSION_REVIEW_ENABLED === "true",
} as const
