import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const reviewSchema = z.object({
  submissionId: z.string().min(1),
  moduleId: z.string().min(1),
  userId: z.string().min(1),
  score: z.number().min(0).max(10),
  status: z.enum(["APPROVED", "REVISION"]),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  comment: z.string().optional(),
  modulePoints: z.number().default(0),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const body = await request.json()
    const data = reviewSchema.parse(body)

    // Create review
    const review = await prisma.review.create({
      data: {
        submissionId: data.submissionId,
        reviewerId: session.user.id,
        score: data.score,
        strengths: data.strengths || null,
        improvements: data.improvements || null,
        comment: data.comment || null,
        criteria: null,
      },
    })

    // Update submission status
    await prisma.submission.update({
      where: { id: data.submissionId },
      data: { status: data.status },
    })

    // If approved, update module progress and add XP
    if (data.status === "APPROVED") {
      // Update module progress
      await prisma.moduleProgress.upsert({
        where: {
          userId_moduleId: {
            userId: data.userId,
            moduleId: data.moduleId,
          },
        },
        update: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
        create: {
          userId: data.userId,
          moduleId: data.moduleId,
          status: "COMPLETED",
          startedAt: new Date(),
          completedAt: new Date(),
        },
      })

      // Add XP to user
      if (data.modulePoints > 0) {
        await prisma.user.update({
          where: { id: data.userId },
          data: {
            totalXP: { increment: data.modulePoints },
          },
        })
      }

      // Start next module if exists
      const currentModule = await prisma.module.findUnique({
        where: { id: data.moduleId },
      })

      if (currentModule) {
        const nextModule = await prisma.module.findFirst({
          where: {
            trailId: currentModule.trailId,
            order: { gt: currentModule.order },
          },
          orderBy: { order: "asc" },
        })

        if (nextModule) {
          await prisma.moduleProgress.upsert({
            where: {
              userId_moduleId: {
                userId: data.userId,
                moduleId: nextModule.id,
              },
            },
            update: {
              status: "IN_PROGRESS",
              startedAt: new Date(),
            },
            create: {
              userId: data.userId,
              moduleId: nextModule.id,
              status: "IN_PROGRESS",
              startedAt: new Date(),
            },
          })
        }
      }
    }

    return NextResponse.json(review)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Review error:", error)
    return NextResponse.json(
      { error: "Ошибка при сохранении оценки" },
      { status: 500 }
    )
  }
}
