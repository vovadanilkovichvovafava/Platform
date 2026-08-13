import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAnyAdmin } from "@/lib/admin-access"
import { adminNeedsPassword } from "@/lib/trail-policy"

interface Props {
  params: Promise<{ id: string }>
}

/**
 * GET - Check if admin needs password to access this trail.
 * Used by UI before opening the edit modal.
 * Returns: { needsPassword, isCreator, isExpired, isPasswordProtected }
 */
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isAnyAdmin(session.user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const result = await adminNeedsPassword(id, session.user.id)

    return NextResponse.json({
      needsPassword: result.needsPassword,
      isCreator: result.isCreator,
      isExpired: result.isExpired,
    })
  } catch (error) {
    console.error("Error checking password status:", error)
    return NextResponse.json({ error: "Ошибка проверки статуса" }, { status: 500 })
  }
}
