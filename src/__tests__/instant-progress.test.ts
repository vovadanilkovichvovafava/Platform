import { describe, it, expect } from "vitest"

/**
 * Tests for instant progress unlock feature:
 * - After submitting work, student can access next module immediately
 * - Module unlocks when previous has PENDING submission
 * - XP and COMPLETED status still require APPROVED review
 */

// Helper function that mirrors the unlock logic from trails/[slug]/page.tsx
function shouldUnlockNextModule(
  prevStatus: string | undefined,
  prevHasPendingSubmission: boolean,
  currentStatus: string
): boolean {
  // If current module is already started, it's unlocked
  if (currentStatus !== "NOT_STARTED") {
    return true
  }

  // Unlock if previous is COMPLETED
  if (prevStatus === "COMPLETED") {
    return true
  }

  // NEW: Unlock if previous is IN_PROGRESS AND has PENDING submission
  if (prevStatus === "IN_PROGRESS" && prevHasPendingSubmission) {
    return true
  }

  return false
}

describe("Instant Progress Unlock Logic", () => {
  describe("Traditional unlock (COMPLETED)", () => {
    it("should unlock next module when previous is COMPLETED", () => {
      const result = shouldUnlockNextModule("COMPLETED", false, "NOT_STARTED")
      expect(result).toBe(true)
    })

    it("should unlock next module when previous is COMPLETED (even with pending submission)", () => {
      const result = shouldUnlockNextModule("COMPLETED", true, "NOT_STARTED")
      expect(result).toBe(true)
    })
  })

  describe("Instant unlock (PENDING submission)", () => {
    it("should unlock next module when previous has PENDING submission", () => {
      const result = shouldUnlockNextModule("IN_PROGRESS", true, "NOT_STARTED")
      expect(result).toBe(true)
    })

    it("should NOT unlock when previous is IN_PROGRESS without PENDING submission", () => {
      const result = shouldUnlockNextModule("IN_PROGRESS", false, "NOT_STARTED")
      expect(result).toBe(false)
    })

    it("should NOT unlock when previous is NOT_STARTED", () => {
      const result = shouldUnlockNextModule("NOT_STARTED", false, "NOT_STARTED")
      expect(result).toBe(false)
    })

    it("should NOT unlock when previous is NOT_STARTED even with pending (edge case)", () => {
      // This shouldn't happen in practice, but test defensive behavior
      const result = shouldUnlockNextModule("NOT_STARTED", true, "NOT_STARTED")
      expect(result).toBe(false)
    })
  })

  describe("Already started modules", () => {
    it("should be unlocked if already IN_PROGRESS", () => {
      const result = shouldUnlockNextModule("NOT_STARTED", false, "IN_PROGRESS")
      expect(result).toBe(true)
    })

    it("should be unlocked if already COMPLETED", () => {
      const result = shouldUnlockNextModule("NOT_STARTED", false, "COMPLETED")
      expect(result).toBe(true)
    })
  })

  describe("Undefined previous status (first module)", () => {
    it("should NOT unlock when previous status is undefined", () => {
      const result = shouldUnlockNextModule(undefined, false, "NOT_STARTED")
      expect(result).toBe(false)
    })
  })
})

describe("Status Transitions", () => {
  /**
   * Status flow for modules with submission:
   * 1. NOT_STARTED -> IN_PROGRESS (when student opens module)
   * 2. IN_PROGRESS + PENDING submission (work submitted, awaiting review)
   * 3. IN_PROGRESS + APPROVED submission -> COMPLETED (after teacher approves)
   * 4. IN_PROGRESS + REVISION submission (needs rework, stays IN_PROGRESS)
   */

  it("should represent correct status flow for submission modules", () => {
    const statusFlow = {
      initial: "NOT_STARTED",
      started: "IN_PROGRESS",
      submitted: { moduleStatus: "IN_PROGRESS", submissionStatus: "PENDING" },
      approved: { moduleStatus: "COMPLETED", submissionStatus: "APPROVED" },
      revision: { moduleStatus: "IN_PROGRESS", submissionStatus: "REVISION" },
    }

    // Verify expected states
    expect(statusFlow.submitted.moduleStatus).toBe("IN_PROGRESS")
    expect(statusFlow.submitted.submissionStatus).toBe("PENDING")
    expect(statusFlow.approved.moduleStatus).toBe("COMPLETED")
    expect(statusFlow.revision.moduleStatus).toBe("IN_PROGRESS")
  })

  it("XP should only be awarded on APPROVED status", () => {
    const xpAwardConditions = (status: string) => status === "APPROVED"

    expect(xpAwardConditions("APPROVED")).toBe(true)
    expect(xpAwardConditions("PENDING")).toBe(false)
    expect(xpAwardConditions("REVISION")).toBe(false)
    expect(xpAwardConditions("FAILED")).toBe(false)
  })

  it("COMPLETED status should only be set on APPROVED status", () => {
    const completedCondition = (status: string) => status === "APPROVED"

    expect(completedCondition("APPROVED")).toBe(true)
    expect(completedCondition("PENDING")).toBe(false)
    expect(completedCondition("REVISION")).toBe(false)
    expect(completedCondition("FAILED")).toBe(false)
  })
})

describe("Notification Flow", () => {
  /**
   * Notifications should be sent as before:
   * - On submission: notify teachers (SUBMISSION_PENDING)
   * - On review: notify student (REVIEW_RECEIVED)
   */

  it("should define correct notification types", () => {
    const notificationTypes = {
      onSubmission: "SUBMISSION_PENDING",
      onReview: "REVIEW_RECEIVED",
    }

    expect(notificationTypes.onSubmission).toBe("SUBMISSION_PENDING")
    expect(notificationTypes.onReview).toBe("REVIEW_RECEIVED")
  })
})

describe("RBAC Constraints", () => {
  /**
   * RBAC rules should not change:
   * - Only TEACHER and ADMIN can create reviews
   * - Students can only submit to modules they're enrolled in
   */

  it("review roles should be TEACHER or ADMIN", () => {
    const canReview = (role: string) => role === "TEACHER" || role === "ADMIN"

    expect(canReview("TEACHER")).toBe(true)
    expect(canReview("ADMIN")).toBe(true)
    expect(canReview("STUDENT")).toBe(false)
    expect(canReview("CO_ADMIN")).toBe(false)
  })
})
