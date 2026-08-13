/**
 * Shared utility for computing and mapping intern/student status
 * for external API endpoints.
 *
 * DB values (StudentTrailStatus.status): LEARNING | NOT_ADMITTED | ACCEPTED
 * External API codes:                     TRAINING | REJECTED    | ACCEPTED
 */

export type ExternalStatusCode = "TRAINING" | "ACCEPTED" | "REJECTED"

export interface ExternalStatus {
  code: ExternalStatusCode
  label: string
}

const STATUS_MAP: Record<string, ExternalStatus> = {
  LEARNING: { code: "TRAINING", label: "Обучается" },
  ACCEPTED: { code: "ACCEPTED", label: "Принят" },
  NOT_ADMITTED: { code: "REJECTED", label: "Отклонен" },
}

const DEFAULT_STATUS: ExternalStatus = { code: "TRAINING", label: "Обучается" }

/**
 * Map a single DB status value to the external API format.
 */
export function mapDbStatus(dbStatus: string): ExternalStatus {
  return STATUS_MAP[dbStatus] ?? DEFAULT_STATUS
}

/**
 * Compute an aggregate external status from a list of per-trail DB statuses.
 *
 * Priority: ACCEPTED > NOT_ADMITTED > LEARNING (default).
 * - If any trail is ACCEPTED → ACCEPTED
 * - If any trail is NOT_ADMITTED (and none ACCEPTED) → REJECTED
 * - Otherwise → TRAINING
 *
 * Also returns the updatedAt of the most relevant status record.
 */
export function computeAggregateStatus(
  trailStatuses: Array<{ status: string; updatedAt: Date }>
): { status: ExternalStatus; statusUpdatedAt: string } {
  if (trailStatuses.length === 0) {
    return { status: DEFAULT_STATUS, statusUpdatedAt: new Date(0).toISOString() }
  }

  // Sort by priority: ACCEPTED first, then NOT_ADMITTED, then LEARNING
  const priorityOrder: Record<string, number> = {
    ACCEPTED: 0,
    NOT_ADMITTED: 1,
    LEARNING: 2,
  }

  let bestStatus = trailStatuses[0]
  for (const ts of trailStatuses) {
    const currentPriority = priorityOrder[ts.status] ?? 3
    const bestPriority = priorityOrder[bestStatus.status] ?? 3
    if (currentPriority < bestPriority) {
      bestStatus = ts
    } else if (currentPriority === bestPriority && ts.updatedAt > bestStatus.updatedAt) {
      bestStatus = ts
    }
  }

  return {
    status: mapDbStatus(bestStatus.status),
    statusUpdatedAt: bestStatus.updatedAt.toISOString(),
  }
}
