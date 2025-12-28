import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Get task progress for a trail
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const trailId = searchParams.get("trailId")

    if (!trailId) {
      return NextResponse.json({ error: "Missing trailId" }, { status: 400 })
    }

    let taskProgress = await prisma.taskProgress.findUnique({
      where: {
        userId_trailId: {
          userId: session.user.id,
          trailId: trailId,
        },
      },
    })

    // Create default progress if not exists (starts with MIDDLE available)
    if (!taskProgress) {
      taskProgress = await prisma.taskProgress.create({
        data: {
          userId: session.user.id,
          trailId: trailId,
          currentLevel: "MIDDLE",
          middleStatus: "PENDING",
          juniorStatus: "LOCKED",
          seniorStatus: "LOCKED",
        },
      })
    }

    return NextResponse.json(taskProgress)
  } catch (error) {
    console.error("Error getting task progress:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Update task progress (for teacher/admin review)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is teacher
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (user?.role !== "TEACHER") {
      return NextResponse.json({ error: "Only teachers can update task progress" }, { status: 403 })
    }

    const { taskProgressId, level, passed } = await request.json()

    if (!taskProgressId || !level || passed === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const taskProgress = await prisma.taskProgress.findUnique({
      where: { id: taskProgressId },
    })

    if (!taskProgress) {
      return NextResponse.json({ error: "Task progress not found" }, { status: 404 })
    }

    let updateData: Record<string, string> = {}

    if (level === "MIDDLE") {
      if (passed) {
        // Middle passed → unlock Senior
        updateData = {
          middleStatus: "PASSED",
          seniorStatus: "PENDING",
          currentLevel: "SENIOR",
        }
      } else {
        // Middle failed → unlock Junior
        updateData = {
          middleStatus: "FAILED",
          juniorStatus: "PENDING",
          currentLevel: "JUNIOR",
        }
      }
    } else if (level === "JUNIOR") {
      updateData = {
        juniorStatus: passed ? "PASSED" : "FAILED",
      }
    } else if (level === "SENIOR") {
      updateData = {
        seniorStatus: passed ? "PASSED" : "FAILED",
      }
    }

    const updated = await prisma.taskProgress.update({
      where: { id: taskProgressId },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating task progress:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
