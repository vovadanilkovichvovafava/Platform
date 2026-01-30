import { prisma } from "./prisma"

// Role constants
export const ROLE_SUPER_ADMIN = "SUPER_ADMIN"
export const ROLE_ADMIN = "ADMIN"
export const ROLE_TEACHER = "TEACHER"
export const ROLE_STUDENT = "STUDENT"

/**
 * Check if user has SUPER_ADMIN role
 */
export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === ROLE_SUPER_ADMIN
}

/**
 * Check if user has any admin role (ADMIN or SUPER_ADMIN)
 */
export function isAnyAdmin(role: string | null | undefined): boolean {
  return role === ROLE_ADMIN || role === ROLE_SUPER_ADMIN
}

/**
 * Check if user has any privileged role (TEACHER, ADMIN, or SUPER_ADMIN)
 */
export function isPrivileged(role: string | null | undefined): boolean {
  return role === ROLE_TEACHER || role === ROLE_ADMIN || role === ROLE_SUPER_ADMIN
}

/**
 * Get list of trail IDs that admin has access to
 * - SUPER_ADMIN: returns null (has access to ALL trails)
 * - ADMIN: returns array of allowed trail IDs (empty array = no access)
 *
 * @returns null for SUPER_ADMIN (unlimited access), string[] for regular ADMIN
 */
export async function getAdminAllowedTrailIds(
  adminId: string,
  role: string
): Promise<string[] | null> {
  // SUPER_ADMIN has access to all trails
  if (isSuperAdmin(role)) {
    return null // null means "all trails"
  }

  // Regular ADMIN - fetch allowed trails from AdminTrailAccess
  const accessRecords = await prisma.adminTrailAccess.findMany({
    where: { adminId },
    select: { trailId: true },
  })

  return accessRecords.map((r) => r.trailId)
}

/**
 * Check if admin has access to specific trail
 * - SUPER_ADMIN: always true
 * - ADMIN: checks AdminTrailAccess table
 */
export async function adminHasTrailAccess(
  adminId: string,
  role: string,
  trailId: string
): Promise<boolean> {
  // SUPER_ADMIN has access to all trails
  if (isSuperAdmin(role)) {
    return true
  }

  // Regular ADMIN - check specific access
  const access = await prisma.adminTrailAccess.findUnique({
    where: {
      adminId_trailId: { adminId, trailId },
    },
  })

  return !!access
}

/**
 * Get filtered trails for admin based on their access
 * - SUPER_ADMIN: no filter (returns undefined to use in Prisma where clause)
 * - ADMIN: filters by AdminTrailAccess
 */
export async function getAdminTrailFilter(
  adminId: string,
  role: string
): Promise<{ id: { in: string[] } } | undefined> {
  const allowedIds = await getAdminAllowedTrailIds(adminId, role)

  // SUPER_ADMIN - no filter
  if (allowedIds === null) {
    return undefined
  }

  // Regular ADMIN - filter by allowed IDs
  return { id: { in: allowedIds } }
}

/**
 * Set admin trail access (batch operation)
 * Only SUPER_ADMIN can modify admin access
 */
export async function setAdminTrailAccess(
  adminId: string,
  trailIds: string[]
): Promise<void> {
  // Delete all existing access for this admin
  await prisma.adminTrailAccess.deleteMany({
    where: { adminId },
  })

  // Create new access records
  if (trailIds.length > 0) {
    await prisma.adminTrailAccess.createMany({
      data: trailIds.map((trailId) => ({
        adminId,
        trailId,
      })),
    })
  }
}

/**
 * Get all admins with their trail access
 * For SUPER_ADMIN management UI
 */
export async function getAdminsWithTrailAccess() {
  const admins = await prisma.user.findMany({
    where: {
      role: ROLE_ADMIN,
    },
    select: {
      id: true,
      name: true,
      email: true,
      adminTrailAccess: {
        select: {
          trailId: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  return admins.map((admin) => ({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    trailIds: admin.adminTrailAccess.map((a) => a.trailId),
  }))
}
