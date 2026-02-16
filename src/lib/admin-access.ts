import { prisma } from "./prisma"

// Role constants
export const ROLE_ADMIN = "ADMIN"
export const ROLE_CO_ADMIN = "CO_ADMIN"
export const ROLE_TEACHER = "TEACHER"
export const ROLE_HR = "HR"
export const ROLE_STUDENT = "STUDENT"

/**
 * Check if user has full ADMIN role (top-level admin with full access)
 */
export function isAdmin(role: string | null | undefined): boolean {
  return role === ROLE_ADMIN
}

/**
 * Check if user has any admin role (ADMIN or CO_ADMIN)
 * NOTE: HR is NOT included — HR has read-only access, not admin-level write access
 */
export function isAnyAdmin(role: string | null | undefined): boolean {
  return role === ROLE_ADMIN || role === ROLE_CO_ADMIN
}

/**
 * Check if user has HR role (read-only candidate analytics + invites)
 */
export function isHR(role: string | null | undefined): boolean {
  return role === ROLE_HR
}

/**
 * Check if user has any admin role OR is HR
 * Used for routes/APIs where HR has read-only access alongside admins
 */
export function isAnyAdminOrHR(role: string | null | undefined): boolean {
  return role === ROLE_ADMIN || role === ROLE_CO_ADMIN || role === ROLE_HR
}

/**
 * Check if user has any privileged role (TEACHER, CO_ADMIN, or ADMIN)
 * NOTE: HR is NOT included — HR cannot review submissions or manage content
 */
export function isPrivileged(role: string | null | undefined): boolean {
  return role === ROLE_TEACHER || role === ROLE_CO_ADMIN || role === ROLE_ADMIN
}

/**
 * Get list of trail IDs that admin/HR has access to
 * - ADMIN: returns null (has access to ALL trails)
 * - CO_ADMIN/HR: returns array of allowed trail IDs (empty array = no access)
 *
 * @returns null for ADMIN (unlimited access), string[] for CO_ADMIN/HR
 */
export async function getAdminAllowedTrailIds(
  adminId: string,
  role: string
): Promise<string[] | null> {
  // ADMIN has access to all trails
  if (isAdmin(role)) {
    return null // null means "all trails"
  }

  // CO_ADMIN and HR - fetch allowed trails from AdminTrailAccess
  const accessRecords = await prisma.adminTrailAccess.findMany({
    where: { adminId },
    select: { trailId: true },
  })

  return accessRecords.map((r) => r.trailId)
}

/**
 * Check if admin/HR has access to specific trail
 * - ADMIN: always true
 * - CO_ADMIN/HR: checks AdminTrailAccess table
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
 * Get list of trail IDs that a student has been assigned access to
 * Students get access via StudentTrailAccess table (explicit grants)
 *
 * @returns string[] of trail IDs the student can access
 */
export async function getStudentAllowedTrailIds(studentId: string): Promise<string[]> {
  const accessRecords = await prisma.studentTrailAccess.findMany({
    where: { studentId },
    select: { trailId: true },
  })

  return accessRecords.map((r) => r.trailId)
}

/**
 * Check if a student has access to a specific trail
 * Returns true if student has a StudentTrailAccess record for that trail
 */
export async function studentHasTrailAccess(
  studentId: string,
  trailId: string
): Promise<boolean> {
  const access = await prisma.studentTrailAccess.findUnique({
    where: {
      studentId_trailId: { studentId, trailId },
    },
  })

  return !!access
}

/**
 * Check if a teacher has access to a specific trail
 * Returns true if teacher is assigned via TrailTeacher or trail has ALL_TEACHERS visibility
 */
export async function teacherHasTrailAccess(
  teacherId: string,
  trailId: string
): Promise<boolean> {
  // Check 1: Is teacher specifically assigned?
  const assignment = await prisma.trailTeacher.findUnique({
    where: {
      trailId_teacherId: { trailId, teacherId },
    },
  })
  if (assignment) return true

  // Check 2: Is trail visible to all teachers?
  const trail = await prisma.trail.findUnique({
    where: { id: trailId },
    select: { teacherVisibility: true },
  })
  return trail?.teacherVisibility === "ALL_TEACHERS"
}

/**
 * Unified: Get allowed trail IDs for any privileged role (including HR).
 * - ADMIN: returns null (all trails)
 * - CO_ADMIN/HR: returns AdminTrailAccess trail IDs
 * - TEACHER: returns TrailTeacher + ALL_TEACHERS trail IDs
 * - Other: returns empty array (no access)
 *
 * @returns null for ADMIN (unlimited), string[] for others
 */
export async function getPrivilegedAllowedTrailIds(
  userId: string,
  role: string
): Promise<string[] | null> {
  if (isAdmin(role)) {
    return null
  }
  if (role === ROLE_CO_ADMIN || role === ROLE_HR) {
    return getAdminAllowedTrailIds(userId, role)
  }
  if (role === ROLE_TEACHER) {
    return getTeacherAllowedTrailIds(userId)
  }
  return []
}

/**
 * Unified: Check if a privileged user (or HR) has access to a specific trail.
 * - ADMIN: always true
 * - CO_ADMIN/HR: checks AdminTrailAccess
 * - TEACHER: checks TrailTeacher / ALL_TEACHERS
 */
export async function privilegedHasTrailAccess(
  userId: string,
  role: string,
  trailId: string
): Promise<boolean> {
  if (isAdmin(role)) {
    return true
  }
  if (role === ROLE_CO_ADMIN || role === ROLE_HR) {
    return adminHasTrailAccess(userId, role, trailId)
  }
  if (role === ROLE_TEACHER) {
    return teacherHasTrailAccess(userId, trailId)
  }
  return false
}

/**
 * Get all co-admins and HR users with their trail access
 * For ADMIN management UI
 */
export async function getCoAdminsWithTrailAccess() {
  const coAdmins = await prisma.user.findMany({
    where: {
      role: { in: [ROLE_CO_ADMIN, ROLE_HR] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
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
    role: coAdmin.role,
    trailIds: coAdmin.adminTrailAccess.map((a) => a.trailId),
  }))
}
