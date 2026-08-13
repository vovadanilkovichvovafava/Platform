/**
 * Trail Access Resolver — Single source of truth for trail visibility & access.
 *
 * Priority:
 *   1. PASSWORD  (highest) — password entry required for ALL (even if public or assigned)
 *   2. PUBLIC    (medium)  — no password, !isRestricted → visible to every student
 *   3. HIDDEN    (lowest)  — no password, isRestricted  → visible only with StudentTrailAccess
 *
 * "isPublished" is a pre-condition: unpublished trails are only visible to
 * privileged users or students with explicit StudentTrailAccess.
 */

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type TrailAccessReason =
  | "visible"            // Full access
  | "password_required"  // Trail visible in listing, but content locked by password
  | "hidden"             // Not visible to this user
  | "login_required"     // Must log in first

export interface TrailAccessDecision {
  /** Should the trail appear in listings? */
  visible: boolean
  /** Can the user view trail content (modules, etc.)? */
  accessible: boolean
  /** Reason for the decision */
  reason: TrailAccessReason
  /** Should a password form be shown instead of content? */
  needsPassword: boolean
}

/** Minimal trail shape required by the resolver */
export interface TrailForAccess {
  isPublished: boolean
  isRestricted: boolean
  isPasswordProtected: boolean
  createdById: string | null
}

/** Minimal user context */
export interface UserForAccess {
  isAuthenticated: boolean
  userId: string | null
  /** ADMIN / CO_ADMIN / TEACHER */
  isPrivileged: boolean
  /** Has StudentTrailAccess record for this trail */
  hasStudentAccess: boolean
  /** Has TrailPasswordAccess record (entered correct password) */
  hasPasswordAccess: boolean
  /** Is enrolled in this trail */
  isEnrolled: boolean
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const FULL_ACCESS: TrailAccessDecision = {
  visible: true,
  accessible: true,
  reason: "visible",
  needsPassword: false,
}

const HIDDEN: TrailAccessDecision = {
  visible: false,
  accessible: false,
  reason: "hidden",
  needsPassword: false,
}

const NEEDS_LOGIN: TrailAccessDecision = {
  visible: false,
  accessible: false,
  reason: "login_required",
  needsPassword: false,
}

const NEEDS_PASSWORD: TrailAccessDecision = {
  visible: true,
  accessible: false,
  reason: "password_required",
  needsPassword: true,
}

// ────────────────────────────────────────────────────────────────────────────
// Resolver — used for BOTH listing filtering AND page-level access checks
// ────────────────────────────────────────────────────────────────────────────

/**
 * Determine whether a trail should be visible / accessible to the given user.
 *
 * Usage:
 *   - Trail listing page → filter by `decision.visible`
 *   - Trail slug page    → check `decision.accessible` and `decision.needsPassword`
 */
export function resolveTrailAccess(
  trail: TrailForAccess,
  user: UserForAccess,
): TrailAccessDecision {
  const isCreator = user.userId != null && trail.createdById === user.userId

  // ── Pre-condition: unpublished trails ────────────────────────────────────
  if (!trail.isPublished) {
    if (user.isPrivileged || user.hasStudentAccess) {
      // Privileged users & explicitly assigned students can still see drafts.
      // Password check still applies to content.
      if (trail.isPasswordProtected && !isCreator && !user.hasPasswordAccess) {
        return NEEDS_PASSWORD
      }
      return FULL_ACCESS
    }
    return HIDDEN
  }

  // ── Priority 1: PASSWORD ─────────────────────────────────────────────────
  if (trail.isPasswordProtected) {
    // Creator always has full access
    if (isCreator) return FULL_ACCESS

    // Already unlocked via password
    if (user.hasPasswordAccess) return FULL_ACCESS

    // Determine listing visibility based on isRestricted
    // Public (isRestricted=false) → everyone can see the trail card
    // Restricted (isRestricted=true) → only privileged / assigned students
    if (!trail.isRestricted) {
      // Public + password: visible to all, password required for content
      return NEEDS_PASSWORD
    }

    // Restricted + password: visible only if privileged or has student access
    if (user.isPrivileged || user.hasStudentAccess) {
      return NEEDS_PASSWORD
    }

    // Not logged in
    if (!user.isAuthenticated) return NEEDS_LOGIN

    return HIDDEN
  }

  // ── Priority 2: PUBLIC ───────────────────────────────────────────────────
  if (!trail.isRestricted) {
    return FULL_ACCESS
  }

  // ── Priority 3: HIDDEN / ASSIGNED ────────────────────────────────────────
  if (user.isPrivileged || user.hasStudentAccess) {
    return FULL_ACCESS
  }

  if (!user.isAuthenticated) return NEEDS_LOGIN

  return HIDDEN
}

// ────────────────────────────────────────────────────────────────────────────
// User-facing denial message (no information leakage)
// ────────────────────────────────────────────────────────────────────────────

export function getAccessDeniedMessage(reason: TrailAccessReason): string {
  switch (reason) {
    case "password_required":
      return "Для доступа к этому trail необходимо ввести пароль."
    case "login_required":
      return "Войдите в систему для доступа к этому trail."
    case "hidden":
      return "У вас нет доступа к этому trail."
    default:
      return "Доступ запрещён."
  }
}
