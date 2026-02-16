-- CreateTable
CREATE TABLE "StudentTrailStatus" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "trailId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LEARNING',
    "setBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentTrailStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentTrailStatus_studentId_idx" ON "StudentTrailStatus"("studentId");

-- CreateIndex
CREATE INDEX "StudentTrailStatus_trailId_idx" ON "StudentTrailStatus"("trailId");

-- CreateIndex
CREATE INDEX "StudentTrailStatus_status_idx" ON "StudentTrailStatus"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentTrailStatus_studentId_trailId_key" ON "StudentTrailStatus"("studentId", "trailId");

-- AddForeignKey
ALTER TABLE "StudentTrailStatus" ADD CONSTRAINT "StudentTrailStatus_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTrailStatus" ADD CONSTRAINT "StudentTrailStatus_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
