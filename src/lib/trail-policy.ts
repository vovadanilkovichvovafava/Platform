/**
 * Trail Access Policy — Centralized server-side authorization for admin/co-admin
 * trail access, including password-protected trail enforcement.
 *
 * Password priority: PASSWORD > PUBLIC > HIDDEN
 * Creator bypass: Trail creator always has access without password.
 * Co-admin constraint: Password does NOT bypass missing AdminTrailAccess assignment.
 *
 * TTL: Admin password access expires after ADMIN_PASSWORD_TTL_MS.
 */

import { prisma } from "./prisma"
import { isAdmin, isAnyAdmin, adminHasTrailAccess } from "./admin-access"

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

/** Admin password access TTL: 4 hours */
const ADMIN_PASSWORD_TTL_MS = 4 * 60 * 60 * 1000

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type AdminTrailAccessResult = {
  allowed: boolean
  reason:
    | "allowed"            // Full access granted
    | "password_required"  // Trail is password-protected, admin must enter password
    | "password_expired"   // Password was entered but TTL expired
    | "no_access"          // No role/assignment access
    | "not_authenticated"  // No session
  isCreator: boolean
}

// ────────────────────────────────────────────────────────────────────────────
// Core: Check admin password access with TTL
// ────────────────────────────────────────────────────────────────────────────

/**
 * Check if an admin/co-admin user has valid password access to a trail.
 * Uses TrailPasswordAccess.unlockedAt with TTL for non-creator admins.
 *
 * Returns access status with reason. Does NOT check role/assignment —
 * that must be done separately before calling this.
 */
async function checkAdminPasswordAccessWithTTL(
  trailId: string,
  userId: string,
): Promise<{ hasAccess: boolean; reason: "allowed" | "password_required" | "password_expired"; isCreator: boolean }> {
  const trail = await prisma.trail.findUnique({
    where: { id: trailId },
    select: {
      isPasswordProtected: true,
      createdById: true,
    },
  })

  if (!trail) {
    return { hasAccess: false, reason: "password_required", isCreator: false }
  }

  const isCreator = trail.createdById === userId

  // Not password protected — no password check needed
  if (!trail.isPasswordProtected) {
    return { hasAccess: true, reason: "allowed", isCreator }
  }

  // Creator always bypasses password
  if (isCreator) {
    return { hasAccess: true, reason: "allowed", isCreator: true }
  }

  // Check TrailPasswordAccess with TTL
  const passwordAccess = await prisma.trailPasswordAccess.findUnique({
    where: {
      userId_trailId: { userId, trailId },
    },
    select: { unlockedAt: true },
  })

  if (!passwordAccess) {
    return { hasAccess: false, reason: "password_required", isCreator: false }
  }

  // Check TTL
  const elapsed = Date.now() - passwordAccess.unlockedAt.getTime()
  if (elapsed > ADMIN_PASSWORD_TTL_MS) {
    return { hasAccess: false, reason: "password_expired", isCreator: false }
  }

  return { hasAccess: true, reason: "allowed", isCreator: false }
}

// ────────────────────────────────────────────────────────────────────────────
// Public API: canViewTrail / canEditTrail
// ────────────────────────────────────────────────────────────────────────────

/**
 * Check if an admin/co-admin can VIEW a trail (GET endpoint).
 *
 * Checks in order:
 * 1. Authentication
 * 2. Role is ADMIN or CO_ADMIN
 * 3. CO_ADMIN has AdminTrailAccess assignment
 * 4. Password protection (creator bypass or valid password access with TTL)
 */
export async function canViewTrail(
  userId: string | null | undefined,
  role: string | null | undefined,
  trailId: string,
): Promise<AdminTrailAccessResult> {
  // 1. Authentication
  if (!userId) {
    return { allowed: false, reason: "not_authenticated", isCreator: false }
  }

  // 2. Must be admin or co-admin
  if (!isAnyAdmin(role)) {
    return { allowed: false, reason: "no_access", isCreator: false }
  }

  // 3. CO_ADMIN assignment check
  if (!isAdmin(role)) {
    const hasAssignment = await adminHasTrailAccess(userId, role!, trailId)
    if (!hasAssignment) {
      return { allowed: false, reason: "no_access", isCreator: false }
    }
  }

  // 4. Password check with TTL
  const passwordResult = await checkAdminPasswordAccessWithTTL(trailId, userId)
  if (!passwordResult.hasAccess) {
    return {
      allowed: false,
      reason: passwordResult.reason,
      isCreator: passwordResult.isCreator,
    }
  }

  return { allowed: true, reason: "allowed", isCreator: passwordResult.isCreator }
}

/**
 * Check if an admin/co-admin can EDIT a trail (PATCH endpoint).
 *
 * Same checks as canViewTrail — editing requires at least view access.
 * Password protection is enforced for both view and edit.
 */
export async function canEditTrail(
  userId: string | null | undefined,
  role: string | null | undefined,
  trailId: string,
): Promise<AdminTrailAccessResult> {
  // Edit uses the same access checks as view
  return canViewTrail(userId, role, trailId)
}

/**
 * Quick check: does this trail require password from this admin?
 * Used by UI to decide whether to show password modal before editing.
 * Does NOT check role/assignment — only password protection status.
 */
export async function adminNeedsPassword(
  trailId: string,
  userId: string,
): Promise<{ needsPassword: boolean; isCreator: boolean; isExpired: boolean }> {
  const result = await checkAdminPasswordAccessWithTTL(trailId, userId)
  return {
    needsPassword: !result.hasAccess,
    isCreator: result.isCreator,
    isExpired: result.reason === "password_expired",
  }
}
