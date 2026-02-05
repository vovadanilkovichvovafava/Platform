import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { checkRateLimit, getClientIP } from "./rate-limit"

// Rate limit config for password attempts (5 attempts per 5 minutes per trail+IP)
const PASSWORD_RATE_LIMIT = {
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 5,
}

/**
 * Result of trail password access check
 */
export type TrailAccessResult = {
  hasAccess: boolean
  reason:
    | "public" // Trail is not password protected
    | "creator" // User is the creator of the trail
    | "password_unlocked" // User has unlocked via password
    | "no_access" // No access to protected trail
    | "not_authenticated" // User not logged in
}

/**
 * Check if user has access to a password-protected trail
 * Access is granted if:
 * 1. Trail is not password protected
 * 2. User is the creator (owner) of the trail
 * 3. User has TrailPasswordAccess record (unlocked via password)
 *
 * NOTE: Password protection is an ADDITIONAL layer of security.
 * Even users with Enrollment or StudentTrailAccess must enter the password.
 * Admin/Teacher roles also do NOT automatically grant access.
 */
export async function checkTrailPasswordAccess(
  trailId: string,
  userId: string | null
): Promise<TrailAccessResult> {
  // Get trail with password protection info
  const trail = await prisma.trail.findUnique({
    where: { id: trailId },
    select: {
      isPasswordProtected: true,
      createdById: true,
    },
  })

  if (!trail) {
    return { hasAccess: false, reason: "no_access" }
  }

  // Not password protected - allow access
  if (!trail.isPasswordProtected) {
    return { hasAccess: true, reason: "public" }
  }

  // User not logged in
  if (!userId) {
    return { hasAccess: false, reason: "not_authenticated" }
  }

  // Check if user is the creator
  if (trail.createdById === userId) {
    return { hasAccess: true, reason: "creator" }
  }

  // Check if user has password access (entered correct password)
  const passwordAccess = await prisma.trailPasswordAccess.findUnique({
    where: {
      userId_trailId: { userId, trailId },
    },
  })

  if (passwordAccess) {
    return { hasAccess: true, reason: "password_unlocked" }
  }

  // No access - password required
  return { hasAccess: false, reason: "no_access" }
}

/**
 * Verify password and grant access to trail
 * Returns success/failure and handles rate limiting
 */
export async function verifyTrailPassword(
  trailId: string,
  userId: string,
  password: string,
  ipAddress: string
): Promise<{
  success: boolean
  error?: string
  hint?: string | null
  rateLimited?: boolean
  resetIn?: number
}> {
  // Check rate limit
  const rateLimitKey = `trail-password:${trailId}:${ipAddress}`
  const rateLimit = checkRateLimit(rateLimitKey, PASSWORD_RATE_LIMIT)

  if (!rateLimit.allowed) {
    return {
      success: false,
      error: "Слишком много попыток. Попробуйте позже.",
      rateLimited: true,
      resetIn: Math.ceil(rateLimit.resetIn / 1000),
    }
  }

  // Get trail with password hash and hint
  const trail = await prisma.trail.findUnique({
    where: { id: trailId },
    select: {
      isPasswordProtected: true,
      passwordHash: true,
      passwordHint: true,
    },
  })

  if (!trail || !trail.isPasswordProtected || !trail.passwordHash) {
    return { success: false, error: "Трейл не защищён паролем" }
  }

  // Verify password
  const isValid = await bcrypt.compare(password, trail.passwordHash)

  // Log attempt (without plaintext password)
  await prisma.trailPasswordAttempt.create({
    data: {
      trailId,
      userId,
      ipAddress,
      success: isValid,
    },
  })

  if (!isValid) {
    return {
      success: false,
      error: "Неверный пароль",
      hint: trail.passwordHint,
    }
  }

  // Grant access
  await prisma.trailPasswordAccess.upsert({
    where: {
      userId_trailId: { userId, trailId },
    },
    update: {
      unlockedAt: new Date(),
    },
    create: {
      userId,
      trailId,
    },
  })

  return { success: true }
}

/**
 * Hash password for trail protection
 */
export async function hashTrailPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Check if user is the creator of a trail
 */
export async function isTrailCreator(
  trailId: string,
  userId: string
): Promise<boolean> {
  const trail = await prisma.trail.findUnique({
    where: { id: trailId },
    select: { createdById: true },
  })

  return trail?.createdById === userId
}

/**
 * Revoke password access when password is changed
 * (Except for the creator who always has access)
 */
export async function revokeAllPasswordAccess(trailId: string): Promise<void> {
  await prisma.trailPasswordAccess.deleteMany({
    where: { trailId },
  })
}

/**
 * Get password hint for a trail (safe to expose)
 */
export async function getTrailPasswordHint(
  trailId: string
): Promise<string | null> {
  const trail = await prisma.trail.findUnique({
    where: { id: trailId },
    select: { passwordHint: true },
  })

  return trail?.passwordHint ?? null
}
