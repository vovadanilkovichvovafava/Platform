import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Teacher marks a module as skipped for a student
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { studentId, moduleId } = await request.json()

    if (!studentId || !moduleId) {
      return NextResponse.json({ error: "Missing studentId or moduleId" }, { status: 400 })
    }

    // Check student exists
    const student = await prisma.user.findUnique({
      where: { id: studentId, role: "STUDENT" },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Check module exists
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
    })

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    // Check if progress already exists
    const existingProgress = await prisma.moduleProgress.findUnique({
      where: {
        userId_moduleId: {
          userId: studentId,
          moduleId: moduleId,
        },
      },
    })

    if (existingProgress?.status === "COMPLETED" && !existingProgress.skippedByTeacher) {
      return NextResponse.json({ error: "Module already completed by student" }, { status: 400 })
    }

    // Create or update progress as COMPLETED with skipped flag
    const progress = await prisma.moduleProgress.upsert({
      where: {
        userId_moduleId: {
          userId: studentId,
          moduleId: moduleId,
        },
      },
      update: {
        status: "COMPLETED",
        completedAt: new Date(),
        hasEarnedXP: true,
        skippedByTeacher: true,
        skippedAt: new Date(),
        skippedBy: session.user.id,
      },
      create: {
        userId: studentId,
        moduleId: moduleId,
        status: "COMPLETED",
        completedAt: new Date(),
        hasEarnedXP: true,
        skippedByTeacher: true,
        skippedAt: new Date(),
        skippedBy: session.user.id,
      },
    })

    // Award XP to student (only if not already earned)
    if (!existingProgress?.hasEarnedXP) {
      await prisma.user.update({
        where: { id: studentId },
        data: {
          totalXP: { increment: module.points },
        },
      })
    }

    return NextResponse.json({ success: true, progress })
  } catch (error) {
    console.error("Skip module error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Teacher removes skip (reverts module to not completed)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const moduleId = searchParams.get("moduleId")

    if (!studentId || !moduleId) {
      return NextResponse.json({ error: "Missing studentId or moduleId" }, { status: 400 })
    }

    // Find the progress
    const progress = await prisma.moduleProgress.findUnique({
      where: {
        userId_moduleId: {
          userId: studentId,
          moduleId: moduleId,
        },
      },
    })

    if (!progress) {
      return NextResponse.json({ error: "Progress not found" }, { status: 404 })
    }

    // Only allow reverting if it was skipped by teacher
    if (!progress.skippedByTeacher) {
      return NextResponse.json({ error: "Cannot revert - module was completed by student" }, { status: 400 })
    }

    // Get module points
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
    })

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    // Delete progress
    await prisma.moduleProgress.delete({
      where: {
        userId_moduleId: {
          userId: studentId,
          moduleId: moduleId,
        },
      },
    })

    // Remove XP from student
    await prisma.user.update({
      where: { id: studentId },
      data: {
        totalXP: { decrement: module.points },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Revert skip error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
