import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const entityType = searchParams.get("entityType")

    const logs = await prisma.auditLog.findMany({
      where: entityType ? { entityType } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return NextResponse.json({ error: "Ошибка загрузки логов" }, { status: 500 })
  }
}

// Helper function to create audit log (exported for use in other routes)
export async function createAuditLog(data: {
  userId: string
  userName: string
  action: string
  entityType: string
  entityId: string
  entityName: string
  details?: string
}) {
  try {
    await prisma.auditLog.create({ data })
  } catch (error) {
    console.error("Error creating audit log:", error)
  }
}
