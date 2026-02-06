import { describe, it, expect } from "vitest"
import {
  resolveTrailAccess,
  type TrailForAccess,
  type UserForAccess,
} from "@/lib/trail-access"

/**
 * Trail Password Access Tests
 *
 * Validates the core business rules:
 * - Creator: view/edit without password → OK
 * - Non-creator without password → DENY (password_required)
 * - Non-creator with valid password → OK
 * - No role exceptions (admin/teacher/student all subject to password)
 * - No module data leakage before password verification
 * - Public/restricted status does NOT bypass password
 */

// ── Helpers ─────────────────────────────────────────────────────────────────

const CREATOR_ID = "creator-user-id"
const OTHER_USER_ID = "other-user-id"

function makeTrail(overrides: Partial<TrailForAccess> = {}): TrailForAccess {
  return {
    isPublished: true,
    isRestricted: false,
    isPasswordProtected: true,
    createdById: CREATOR_ID,
    ...overrides,
  }
}

function makeUser(overrides: Partial<UserForAccess> = {}): UserForAccess {
  return {
    isAuthenticated: true,
    userId: OTHER_USER_ID,
    isPrivileged: false,
    hasStudentAccess: false,
    hasPasswordAccess: false,
    isEnrolled: false,
    ...overrides,
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("Trail Password Access — resolveTrailAccess", () => {
  // 1) Creator: view without password → OK
  it("creator gets full access to their own password-protected trail", () => {
    const trail = makeTrail()
    const user = makeUser({ userId: CREATOR_ID })

    const decision = resolveTrailAccess(trail, user)

    expect(decision.accessible).toBe(true)
    expect(decision.needsPassword).toBe(false)
    expect(decision.reason).toBe("visible")
  })

  // 2) Non-creator without password → DENY
  it("non-creator without password is denied access", () => {
    const trail = makeTrail()
    const user = makeUser({ hasPasswordAccess: false })

    const decision = resolveTrailAccess(trail, user)

    expect(decision.accessible).toBe(false)
    expect(decision.needsPassword).toBe(true)
    expect(decision.reason).toBe("password_required")
  })

  // 3) Non-creator with wrong password (no hasPasswordAccess) → DENY
  it("non-creator with invalid password is denied (no password access record)", () => {
    const trail = makeTrail()
    const user = makeUser({ hasPasswordAccess: false })

    const decision = resolveTrailAccess(trail, user)

    expect(decision.accessible).toBe(false)
    expect(decision.needsPassword).toBe(true)
  })

  // 4) Non-creator with valid password → OK
  it("non-creator with valid password gets full access", () => {
    const trail = makeTrail()
    const user = makeUser({ hasPasswordAccess: true })

    const decision = resolveTrailAccess(trail, user)

    expect(decision.accessible).toBe(true)
    expect(decision.needsPassword).toBe(false)
    expect(decision.reason).toBe("visible")
  })

  // 5) ADMIN without password → DENY (no role exception)
  it("admin without password is denied access (no role exception)", () => {
    const trail = makeTrail()
    const user = makeUser({ isPrivileged: true, hasPasswordAccess: false })

    const decision = resolveTrailAccess(trail, user)

    expect(decision.accessible).toBe(false)
    expect(decision.needsPassword).toBe(true)
  })

  // 6) TEACHER without password → DENY (no role exception)
  it("teacher without password is denied access (no role exception)", () => {
    const trail = makeTrail()
    const user = makeUser({ isPrivileged: true, hasPasswordAccess: false })

    const decision = resolveTrailAccess(trail, user)

    expect(decision.accessible).toBe(false)
    expect(decision.needsPassword).toBe(true)
  })

  // 7) Admin with valid password → OK
  it("admin with valid password gets full access", () => {
    const trail = makeTrail()
    const user = makeUser({ isPrivileged: true, hasPasswordAccess: true })

    const decision = resolveTrailAccess(trail, user)

    expect(decision.accessible).toBe(true)
    expect(decision.needsPassword).toBe(false)
  })

  // 8) Student with enrollment but no password → DENY
  it("enrolled student without password is denied (enrollment does not bypass password)", () => {
    const trail = makeTrail()
    const user = makeUser({ isEnrolled: true, hasPasswordAccess: false })

    const decision = resolveTrailAccess(trail, user)

    expect(decision.accessible).toBe(false)
    expect(decision.needsPassword).toBe(true)
  })

  // 9) Student with StudentTrailAccess but no password → DENY
  it("student with trail assignment but no password is denied", () => {
    const trail = makeTrail({ isRestricted: true })
    const user = makeUser({ hasStudentAccess: true, hasPasswordAccess: false })

    const decision = resolveTrailAccess(trail, user)

    expect(decision.accessible).toBe(false)
    expect(decision.needsPassword).toBe(true)
  })

  // 10) Public trail (no password) → OK for all
  it("public trail without password protection allows access", () => {
    const trail = makeTrail({ isPasswordProtected: false })
    const user = makeUser()

    const decision = resolveTrailAccess(trail, user)

    expect(decision.accessible).toBe(true)
    expect(decision.needsPassword).toBe(false)
  })

  // 11) Password-protected trail visible in listing (isRestricted=false)
  it("password-protected public trail is visible but content locked", () => {
    const trail = makeTrail({ isRestricted: false })
    const user = makeUser({ hasPasswordAccess: false })

    const decision = resolveTrailAccess(trail, user)

    expect(decision.visible).toBe(true)
    expect(decision.accessible).toBe(false)
    expect(decision.needsPassword).toBe(true)
  })

  // 12) Unauthenticated user on password-protected trail
  it("unauthenticated user cannot see restricted password-protected trail", () => {
    const trail = makeTrail({ isRestricted: true })
    const user = makeUser({ isAuthenticated: false, userId: null })

    const decision = resolveTrailAccess(trail, user)

    expect(decision.accessible).toBe(false)
    expect(decision.reason).toBe("login_required")
  })

  // 13) Unpublished password-protected trail for privileged user without password
  it("privileged user sees unpublished trail but needs password for content", () => {
    const trail = makeTrail({ isPublished: false })
    const user = makeUser({ isPrivileged: true, hasPasswordAccess: false })

    const decision = resolveTrailAccess(trail, user)

    expect(decision.visible).toBe(true)
    expect(decision.accessible).toBe(false)
    expect(decision.needsPassword).toBe(true)
  })

  // 14) Unpublished password-protected trail for creator
  it("creator has full access to unpublished password-protected trail", () => {
    const trail = makeTrail({ isPublished: false })
    const user = makeUser({ userId: CREATOR_ID, isPrivileged: true })

    const decision = resolveTrailAccess(trail, user)

    expect(decision.accessible).toBe(true)
    expect(decision.needsPassword).toBe(false)
  })

  // 15) No data leak: password-protected trail shows needsPassword before content
  it("password-protected trail never leaks content (needsPassword blocks access)", () => {
    const trail = makeTrail()
    const user = makeUser({ hasPasswordAccess: false })

    const decision = resolveTrailAccess(trail, user)

    // accessible=false means no content should be returned
    expect(decision.accessible).toBe(false)
    // needsPassword=true means password form should be shown
    expect(decision.needsPassword).toBe(true)
    // visible=true means trail card can appear in listing
    expect(decision.visible).toBe(true)
  })
})

describe("Trail Password Access — edge cases", () => {
  it("non-password-protected restricted trail is hidden from regular students", () => {
    const trail = makeTrail({ isPasswordProtected: false, isRestricted: true })
    const user = makeUser({ hasStudentAccess: false })

    const decision = resolveTrailAccess(trail, user)

    expect(decision.visible).toBe(false)
    expect(decision.accessible).toBe(false)
    expect(decision.reason).toBe("hidden")
  })

  it("non-password-protected restricted trail is visible with student access", () => {
    const trail = makeTrail({ isPasswordProtected: false, isRestricted: true })
    const user = makeUser({ hasStudentAccess: true })

    const decision = resolveTrailAccess(trail, user)

    expect(decision.visible).toBe(true)
    expect(decision.accessible).toBe(true)
  })

  it("password + restricted: only visible if privileged or has student access", () => {
    const trail = makeTrail({ isRestricted: true })

    // Regular student without access → hidden
    const regularStudent = makeUser({ hasStudentAccess: false, hasPasswordAccess: false })
    const decision1 = resolveTrailAccess(trail, regularStudent)
    expect(decision1.visible).toBe(false)

    // Student with access → visible but needs password
    const assignedStudent = makeUser({ hasStudentAccess: true, hasPasswordAccess: false })
    const decision2 = resolveTrailAccess(trail, assignedStudent)
    expect(decision2.visible).toBe(true)
    expect(decision2.needsPassword).toBe(true)

    // Privileged user → visible but needs password
    const admin = makeUser({ isPrivileged: true, hasPasswordAccess: false })
    const decision3 = resolveTrailAccess(trail, admin)
    expect(decision3.visible).toBe(true)
    expect(decision3.needsPassword).toBe(true)
  })
})
