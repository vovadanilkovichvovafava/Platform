import { prisma } from "./prisma"

// Role constants
export const ROLE_ADMIN = "ADMIN"
export const ROLE_CO_ADMIN = "CO_ADMIN"
export const ROLE_TEACHER = "TEACHER"
export const ROLE_STUDENT = "STUDENT"

/**
 * Check if user has full ADMIN role (top-level admin with full access)
 */
export function isAdmin(role: string | null | undefined): boolean {
  return role === ROLE_ADMIN
}

/**
 * Check if user has any admin role (ADMIN or CO_ADMIN)
 */
export function isAnyAdmin(role: string | null | undefined): boolean {
  return role === ROLE_ADMIN || role === ROLE_CO_ADMIN
}

/**
 * Check if user has any privileged role (TEACHER, CO_ADMIN, or ADMIN)
 */
export function isPrivileged(role: string | null | undefined): boolean {
  return role === ROLE_TEACHER || role === ROLE_CO_ADMIN || role === ROLE_ADMIN
}

/**
 * Get list of trail IDs that admin has access to
 * - ADMIN: returns null (has access to ALL trails)
 * - CO_ADMIN: returns array of allowed trail IDs (empty array = no access)
 *
 * @returns null for ADMIN (unlimited access), string[] for CO_ADMIN
 */
export async function getAdminAllowedTrailIds(
  adminId: string,
  role: string
): Promise<string[] | null> {
  // ADMIN has access to all trails
  if (isAdmin(role)) {
    return null // null means "all trails"
  }

  // CO_ADMIN - fetch allowed trails from AdminTrailAccess
  const accessRecords = await prisma.adminTrailAccess.findMany({
    where: { adminId },
    select: { trailId: true },
  })

  return accessRecords.map((r) => r.trailId)
}

/**
 * Check if admin has access to specific trail
 * - ADMIN: always true
 * - CO_ADMIN: checks AdminTrailAccess table
 */
export async function adminHasTrailAccess(
  adminId: string,
  role: string,
  trailId: string
): Promise<boolean> {
  // ADMIN has access to all trails
  if (isAdmin(role)) {
    return true
  }

  // CO_ADMIN - check specific access
  const access = await prisma.adminTrailAccess.findUnique({
    where: {
      adminId_trailId: { adminId, trailId },
    },
  })

  return !!access
}

/**
 * Get filtered trails for admin based on their access
 * - ADMIN: no filter (returns undefined to use in Prisma where clause)
 * - CO_ADMIN: filters by AdminTrailAccess
 */
export async function getAdminTrailFilter(
  adminId: string,
  role: string
): Promise<{ id: { in: string[] } } | undefined> {
  const allowedIds = await getAdminAllowedTrailIds(adminId, role)

  // ADMIN - no filter
  if (allowedIds === null) {
    return undefined
  }

  // CO_ADMIN - filter by allowed IDs
  return { id: { in: allowedIds } }
}

/**
 * Set co-admin trail access (batch operation)
 * Only ADMIN can modify co-admin access
 */
export async function setCoAdminTrailAccess(
  coAdminId: string,
  trailIds: string[]
): Promise<void> {
  // Delete all existing access for this co-admin
  await prisma.adminTrailAccess.deleteMany({
    where: { adminId: coAdminId },
  })

  // Create new access records
  if (trailIds.length > 0) {
    await prisma.adminTrailAccess.createMany({
      data: trailIds.map((trailId) => ({
        adminId: coAdminId,
        trailId,
      })),
    })
  }
}

/**
 * Get list of trail IDs that a teacher has access to
 * Teachers get access via:
 * 1. Trails with teacherVisibility = "ALL_TEACHERS"
 * 2. Trails where they are specifically assigned (TrailTeacher)
 *
 * @returns string[] of trail IDs the teacher can access
 */
export async function getTeacherAllowedTrailIds(teacherId: string): Promise<string[]> {
  // Get trails visible to all teachers
  const allTeacherTrails = await prisma.trail.findMany({
    where: { teacherVisibility: "ALL_TEACHERS" },
    select: { id: true },
  })

  // Get specifically assigned trails
  const specificAssignments = await prisma.trailTeacher.findMany({
    where: { teacherId },
    select: { trailId: true },
  })

  // Combine both lists (removing duplicates)
  const allTrailIds = new Set([
    ...allTeacherTrails.map((t) => t.id),
    ...specificAssignments.map((a) => a.trailId),
  ])

  return Array.from(allTrailIds)
}

/**
 * Get all co-admins with their trail access
 * For ADMIN management UI
 */
export async function getCoAdminsWithTrailAccess() {
  const coAdmins = await prisma.user.findMany({
    where: {
      role: ROLE_CO_ADMIN,
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

  return coAdmins.map((coAdmin) => ({
    id: coAdmin.id,
    name: coAdmin.name,
    email: coAdmin.email,
    trailIds: coAdmin.adminTrailAccess.map((a) => a.trailId),
  }))
}
