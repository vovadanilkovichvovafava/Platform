import { NextResponse } from "next/server"

/**
 * Verifies external API authorization via Bearer token.
 * Compares the token from Authorization header against COMMUNICATION_API_KEY env variable.
 * Returns null if valid, or a 401 NextResponse if invalid.
 */
export function verifyExternalAuth(
  request: Request
): NextResponse | null {
  const authHeader = request.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const token = authHeader.slice("Bearer ".length)
  const expectedKey = process.env.COMMUNICATION_API_KEY

  if (!expectedKey || token !== expectedKey) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  return null
}
